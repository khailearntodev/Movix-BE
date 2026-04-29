import os
import pandas as pd
import numpy as np
import faiss

from database import fetch_movie_data, fetch_rating_data
from hybrid_model import build_hybrid_vectors, create_soup, encode_and_normalize, normalize_rows, LATENT_DIM

MODEL_PATH = "movie_index.faiss"
META_PATH = "movie_metadata.pkl"
ARTIFACT_PATH = "hybrid_artifacts.pkl"

class RecommenderState:
    def __init__(self):
        self.index = None
        self.meta = None
        self.item_vectors = None
        self.user_vectors = {}
        self.content_projection = None

state = RecommenderState()

def load_resources_into_memory():
    """Load model files vào RAM."""
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH) and os.path.exists(ARTIFACT_PATH):
        state.index = faiss.read_index(MODEL_PATH)
        state.meta = pd.read_pickle(META_PATH)

        artifact = pd.read_pickle(ARTIFACT_PATH)
        state.item_vectors = artifact.get("item_vectors")
        state.user_vectors = artifact.get("user_vectors", {})
        state.content_projection = artifact.get("content_projection")

        print(f"Loaded {state.index.ntotal} movies into memory.")
    else:
        print("Model files not found. Need to rebuild.")

def save_all_resources():
    """Lưu trữ state hiện tại thành files."""
    faiss.write_index(state.index, MODEL_PATH)
    state.meta.to_pickle(META_PATH)
    artifact = {
        "item_vectors": state.item_vectors,
        "user_vectors": state.user_vectors,
        "content_projection": state.content_projection,
    }
    pd.to_pickle(artifact, ARTIFACT_PATH)

def build_empty_state():
    """Tạo state mặc định rỗng nếu DB trống."""
    state.index = faiss.IndexFlatIP(LATENT_DIM)
    state.meta = pd.DataFrame(columns=["id", "title"])
    state.item_vectors = np.zeros((0, LATENT_DIM), dtype=np.float32)
    state.user_vectors = {}
    state.content_projection = None

def rebuild_all_data():
    """Batch job rebuild toàn bộ pipeline cho dữ liệu mới."""
    print("Rebuilding entirely new index...")
    try:
        movie_df = fetch_movie_data()
        if movie_df.empty:
            print("No active movies found. Creating empty index...")
            build_empty_state()
            save_all_resources()
            return

        ratings_df = fetch_rating_data()
        item_vectors, user_vectors, content_projection = build_hybrid_vectors(movie_df, ratings_df)
        
        dimension = item_vectors.shape[1]
        new_index = faiss.IndexFlatIP(dimension)
        new_index.add(item_vectors.astype(np.float32))

        state.index = new_index
        state.meta = movie_df[["id", "title"]].reset_index(drop=True)
        state.item_vectors = item_vectors.astype(np.float32)
        state.user_vectors = user_vectors
        state.content_projection = content_projection

        save_all_resources()
        print(f"Rebuild finished. Indexed {state.index.ntotal} movies.")
    except Exception as e:
        print(f"Error during rebuild: {e}")
        raise

def add_single_movie(movie_id):
    """Tính toán và chèn nhanh 1 movie thẳng vào index đang hoạt động."""
    if state.index is None or state.meta is None:
        raise Exception("System is not initialized. Please rebuild first.")

    movie_id = str(movie_id)
    if movie_id in state.meta["id"].values:
        print(f"Movie {movie_id} is already in the index. Skipping.")
        return False

    df_new = fetch_movie_data(movie_id)
    if df_new.empty:
        print(f"Movie {movie_id} not found in database.")
        return False

    df_new["soup"] = df_new.apply(create_soup, axis=1)
    content_vec = encode_and_normalize([df_new.iloc[0]["soup"]]).astype(np.float32)

    if state.content_projection is not None:
        projected = content_vec @ state.content_projection
        vec = normalize_rows(projected)
    else:
        vec = content_vec

    if state.index.d != vec.shape[1]:
        print("Vector dimension changed. Rebuilding full index instead.")
        rebuild_all_data()
        return True

    state.index.add(vec.astype(np.float32))
    state.meta = pd.concat([state.meta, df_new[["id", "title"]]], ignore_index=True)

    if state.item_vectors is None or state.item_vectors.size == 0:
        state.item_vectors = vec.astype(np.float32)
    else:
        state.item_vectors = np.vstack([state.item_vectors, vec.astype(np.float32)])

    save_all_resources()
    print(f"Successfully added movie {movie_id}. Total movies: {state.index.ntotal}")
    return True

def get_recommendations(movie_id, k=10):
    """Lấy danh sách similar movies."""
    if state.index is None or state.meta is None or state.index.ntotal == 0:
        return {"error": "Model not loaded or empty"}

    movie_id = str(movie_id)
    matches = state.meta[state.meta["id"] == movie_id]
    if matches.empty:
        return {"error": f"Movie ID {movie_id} not found in index."}

    idx = int(matches.index[0])
    query_vector = state.item_vectors[idx].reshape(1, -1).astype(np.float32)
    distances, indices = state.index.search(query_vector, k + 1)

    result_ids = []
    # indices[0] will be empty/invalid if k=0 or not found
    for i in indices[0]:
        if i == -1: 
            continue
        i = int(i)
        if i != idx:
            result_ids.append(state.meta.iloc[i]["id"])

    return {"movie_id": movie_id, "recommendations": result_ids}

def get_user_recommendations(user_id, k=20):
    """Gợi ý danh sách movies cá nhân hóa cho từng user."""
    if state.meta is None or state.item_vectors is None or state.item_vectors.size == 0:
        return {"error": "Model not loaded"}

    user_id = str(user_id)
    user_vec = state.user_vectors.get(user_id)
    seen_movie_ids = set()

    if user_vec is None:
        user_ratings = fetch_rating_data(user_id)
        if not user_ratings.empty:
            movie_to_idx = {mid: idx for idx, mid in enumerate(state.meta["id"].tolist())}
            valid = user_ratings[user_ratings["movie_id"].isin(movie_to_idx)]
            if not valid.empty:
                indices = [movie_to_idx[mid] for mid in valid["movie_id"].tolist()]
                weights = ((valid["rating"].to_numpy(dtype=np.float32) + 1.0) / 11.0)
                user_vec = np.average(state.item_vectors[indices], axis=0, weights=weights).astype(np.float32)
                norm = np.linalg.norm(user_vec)
                if norm > 0:
                    user_vec = user_vec / norm
                seen_movie_ids = set(valid["movie_id"].tolist())

    if user_vec is None:
        ids = state.meta["id"].head(k).tolist()
        return {"user_id": user_id, "recommendations": ids}

    scores = state.item_vectors @ user_vec.astype(np.float32)
    ranked_indices = np.argsort(-scores)

    rec_ids = []
    for idx in ranked_indices:
        mid = state.meta.iloc[int(idx)]["id"]
        if mid in seen_movie_ids:
            continue
        rec_ids.append(mid)
        if len(rec_ids) >= k:
            break

    return {"user_id": user_id, "recommendations": rec_ids}
