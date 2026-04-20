import os
import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

LATENT_DIM = int(os.getenv("HYBRID_LATENT_DIM", "64"))
HYBRID_ALPHA = float(os.getenv("HYBRID_ALPHA", "0.7"))
RIDGE_LAMBDA = float(os.getenv("HYBRID_RIDGE_LAMBDA", "1.0"))
MIN_RATINGS_FOR_CF = int(os.getenv("HYBRID_MIN_RATINGS", "50"))

model = SentenceTransformer("all-MiniLM-L6-v2")

def create_soup(row):
    """Tạo biểu diễn văn bản từ features của movie."""
    genres = str(row.get("genres", ""))
    cast_crew = str(row.get("cast_crew", ""))
    overview = str(row.get("overview", ""))
    return f"{genres} {genres} {cast_crew} {overview}"

def encode_and_normalize(texts):
    """Mã hóa văn bản thành embeddings và chuẩn hóa theo L2."""
    embeddings = model.encode(texts, show_progress_bar=False)
    if len(embeddings.shape) == 1:
        embeddings = embeddings.reshape(1, -1)
    faiss.normalize_L2(embeddings)
    return embeddings.astype(np.float32)

def normalize_rows(vectors):
    """Chuẩn hóa L2 cho các dòng của matrix."""
    vectors = vectors.astype(np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms

def build_cf_vectors(movie_ids, ratings_df, latent_dim=LATENT_DIM):
    """Xây dựng user/item embeddings bằng SVD từ rating matrix."""
    if ratings_df.empty or len(ratings_df) < MIN_RATINGS_FOR_CF:
        return None

    movie_to_idx = {mid: i for i, mid in enumerate(movie_ids)}
    ratings_df = ratings_df[ratings_df["movie_id"].isin(movie_to_idx)]
    if ratings_df.empty:
        return None

    user_ids = ratings_df["user_id"].unique().tolist()
    user_to_idx = {uid: i for i, uid in enumerate(user_ids)}

    num_users = len(user_ids)
    num_items = len(movie_ids)
    mat = np.zeros((num_users, num_items), dtype=np.float32)

    for row in ratings_df.itertuples(index=False):
        uidx = user_to_idx[row.user_id]
        iidx = movie_to_idx[row.movie_id]
        mat[uidx, iidx] = float(row.rating)

    # Đưa rating (0-10) về range [-1, 1] 
    mat = (mat - 5.0) / 5.0

    try:
        u_mat, singular_values, vt_mat = np.linalg.svd(mat, full_matrices=False)
    except np.linalg.LinAlgError:
        return None

    if singular_values.size == 0:
        return None

    rank = int(min(latent_dim, singular_values.shape[0], vt_mat.shape[0]))
    if rank <= 0:
        return None

    s_root = np.sqrt(singular_values[:rank]).astype(np.float32)
    user_cf = (u_mat[:, :rank] * s_root).astype(np.float32)
    item_cf = (vt_mat[:rank, :].T * s_root).astype(np.float32)

    user_vectors = {uid: user_cf[user_to_idx[uid]] for uid in user_ids}
    return item_cf, user_vectors

def fit_content_projection(content_vectors, item_cf_vectors):
    """Tìm ma trận xoay (projection) ánh xạ content -> collaborative space."""
    if content_vectors.size == 0 or item_cf_vectors.size == 0:
        return None

    xtx = content_vectors.T @ content_vectors
    reg = RIDGE_LAMBDA * np.eye(xtx.shape[0], dtype=np.float32)
    xty = content_vectors.T @ item_cf_vectors
    try:
        projection = np.linalg.solve(xtx + reg, xty).astype(np.float32)
    except np.linalg.LinAlgError:
        projection = (np.linalg.pinv(xtx + reg).astype(np.float32) @ xty).astype(np.float32)
    return projection

def build_hybrid_vectors(movie_df, ratings_df):
    """Kết hợp content & collaborative filtering (Two-Tower phase 1)."""
    movie_df = movie_df.copy()
    movie_df["soup"] = movie_df.apply(create_soup, axis=1)
    content_vectors = encode_and_normalize(movie_df["soup"].tolist())

    cf_result = build_cf_vectors(movie_df["id"].tolist(), ratings_df, LATENT_DIM)

    # Fallback to pure content based if not enough ratings
    if cf_result is None:
        return normalize_rows(content_vectors), {}, None

    item_cf_vectors, user_cf_vectors = cf_result
    projection = fit_content_projection(content_vectors, item_cf_vectors)
    
    if projection is None:
        return normalize_rows(content_vectors), {}, None

    projected_content = (content_vectors @ projection).astype(np.float32)
    has_cf = np.linalg.norm(item_cf_vectors, axis=1) > 1e-8

    # Blend vectors
    item_vectors = projected_content.copy()
    item_vectors[has_cf] = HYBRID_ALPHA * item_cf_vectors[has_cf] + (1.0 - HYBRID_ALPHA) * projected_content[has_cf]
    item_vectors = normalize_rows(item_vectors)

    user_vectors = {}
    movie_index = {mid: idx for idx, mid in enumerate(movie_df["id"].tolist())}

    for user_id, user_cf in user_cf_vectors.items():
        user_hist = ratings_df[ratings_df["user_id"] == user_id]
        if user_hist.empty:
            user_vectors[user_id] = user_cf.astype(np.float32)
            continue

        valid_movie_ids = [mid for mid in user_hist["movie_id"].tolist() if mid in movie_index]
        if not valid_movie_ids:
            user_vectors[user_id] = user_cf.astype(np.float32)
            continue

        item_indices = [movie_index[mid] for mid in valid_movie_ids]
        valid_hist = user_hist[user_hist["movie_id"].isin(valid_movie_ids)]
        weights = ((valid_hist["rating"].to_numpy(dtype=np.float32) + 1.0) / 11.0)

        profile = np.average(projected_content[item_indices], axis=0, weights=weights).astype(np.float32)
        hybrid_user = HYBRID_ALPHA * user_cf + (1.0 - HYBRID_ALPHA) * profile

        norm = np.linalg.norm(hybrid_user)
        if norm > 0:
            hybrid_user = hybrid_user / norm
        user_vectors[user_id] = hybrid_user.astype(np.float32)

    return item_vectors, user_vectors, projection
