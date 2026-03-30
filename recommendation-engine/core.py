import os
import pandas as pd
import numpy as np
import faiss
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
MODEL_PATH = "movie_index.faiss"
META_PATH = "movie_metadata.pkl"

model = SentenceTransformer('all-MiniLM-L6-v2')
engine = create_engine(DATABASE_URL)

global_index = None
global_meta = None

def load_resources_into_memory():
    """Load FAISS index và Metadata lên RAM 1 lần duy nhất lúc khởi động."""
    global global_index, global_meta
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        global_index = faiss.read_index(MODEL_PATH)
        global_meta = pd.read_pickle(META_PATH)
        print(f"✅ Loaded {global_index.ntotal} movies into memory.")
    else:
        print("Model files not found. Need to rebuild.")

def create_soup(row):
    """Tạo chuỗi văn bản tổng hợp để vector hóa"""
    genres = str(row.get('genres', ''))
    cast_crew = str(row.get('cast_crew', ''))
    overview = str(row.get('overview', ''))
    return f"{genres} {genres} {cast_crew} {overview}"

def _resolve_existing_table(candidates):
    """Trả về tên bảng đầu tiên tồn tại trong DB theo danh sách candidate."""
    for candidate in candidates:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT to_regclass(:name) IS NOT NULL"),
                {"name": candidate}
            ).scalar()
        if result:
            return candidate
    return None

def fetch_data(movie_id=None):
    """Lấy dữ liệu từ PostgreSQL (có thể lấy 1 phim hoặc tất cả)"""
    movie_table = _resolve_existing_table(["public.movies", 'public."Movie"'])
    movie_genre_table = _resolve_existing_table(["public.movie_genres", 'public."MovieGenre"'])
    genre_table = _resolve_existing_table(["public.genres", 'public."Genre"'])
    movie_person_table = _resolve_existing_table(["public.movie_people", 'public."MoviePerson"'])
    person_table = _resolve_existing_table(["public.people", 'public."Person"'])

    if movie_table is None:
        print("⚠️ Movie table not found. Skip rebuild until migrations are applied.")
        return pd.DataFrame(columns=['id', 'title', 'overview', 'genres', 'cast_crew'])

    select_genres = "'' AS genres"
    join_genres = ""
    if movie_genre_table and genre_table:
        select_genres = "COALESCE(string_agg(DISTINCT g.name, ' '), '') AS genres"
        join_genres = (
            f" LEFT JOIN {movie_genre_table} mg ON m.id = mg.movie_id"
            f" LEFT JOIN {genre_table} g ON mg.genre_id = g.id"
        )

    select_cast = "'' AS cast_crew"
    join_cast = ""
    if movie_person_table and person_table:
        select_cast = "COALESCE(string_agg(DISTINCT p.name, ' '), '') AS cast_crew"
        join_cast = (
            f" LEFT JOIN {movie_person_table} mp ON m.id = mp.movie_id"
            f" LEFT JOIN {person_table} p ON mp.person_id = p.id"
        )

    base_query = f"""
    SELECT
        m.id,
        m.title,
        COALESCE(m.description, '') AS overview,
        {select_genres},
        {select_cast}
    FROM {movie_table} m
    {join_genres}
    {join_cast}
    WHERE m.is_deleted = false AND m.is_active = true
    """
    
    params = {}
    if movie_id:
        base_query += " AND m.id = :movie_id"
        params['movie_id'] = movie_id

    base_query += " GROUP BY m.id, m.title, m.description"
    
    df = pd.read_sql(text(base_query), engine, params=params)
    df['id'] = df['id'].astype(str)
    return df

def encode_and_normalize(texts):
    """Hàm tiện ích để mã hóa và chuẩn hóa vector"""
    embeddings = model.encode(texts, show_progress_bar=False)
    if len(embeddings.shape) == 1:
        embeddings = embeddings.reshape(1, -1)
    faiss.normalize_L2(embeddings)
    return embeddings

def rebuild_all_data():
    """Chạy lại TỪ ĐẦU (Dùng cho Offline/Batch)"""
    global global_index, global_meta
    print("Rebuilding entirely new index...")
    
    try:
        df = fetch_data()
        
        if df.empty:
            print("⚠️ No active movies found. Creating empty index...")
            dimension = 384  # Kích thước mặc định của all-MiniLM-L6-v2
            global_index = faiss.IndexFlatIP(dimension)
            global_meta = pd.DataFrame(columns=['id', 'title'])
        else:
            df['soup'] = df.apply(create_soup, axis=1)
            embeddings = encode_and_normalize(df['soup'].tolist())
            
            # Tạo Index mới
            dimension = embeddings.shape[1]
            global_index = faiss.IndexFlatIP(dimension)
            global_index.add(embeddings)
            global_meta = df[['id', 'title']].reset_index(drop=True)
        
        # Lưu xuống disk
        faiss.write_index(global_index, MODEL_PATH)
        global_meta.to_pickle(META_PATH)
        print(f"✅ Rebuild finished! Indexed {global_index.ntotal} movies.")
        
    except Exception as e:
        print(f"❌ Error during rebuild: {e}")
        raise

def add_single_movie(movie_id):
    """Cơ chế ONLINE: Chỉ fetch, encode và thêm đúng 1 phim vào hệ thống hiện tại"""
    global global_index, global_meta
    
    if global_index is None or global_meta is None:
        raise Exception("System is not initialized. Please rebuild first.")
    if movie_id in global_meta['id'].values:
        print(f"Movie {movie_id} is already in the index. Skipping.")
        return False
        
    df_new = fetch_data(movie_id)
    if df_new.empty:
        print(f"Movie {movie_id} not found in database.")
        return False
        
    df_new['soup'] = df_new.apply(create_soup, axis=1)
    new_embedding = encode_and_normalize([df_new.iloc[0]['soup']])
    
    global_index.add(new_embedding)
    
    new_meta = df_new[['id', 'title']]
    global_meta = pd.concat([global_meta, new_meta], ignore_index=True)
    
    # Lưu xuống ổ cứng để backup
    faiss.write_index(global_index, MODEL_PATH)
    global_meta.to_pickle(META_PATH)
    
    print(f" Successfully added movie {movie_id}. Total movies: {global_index.ntotal}")
    return True

def get_recommendations(movie_id, k=10):
    global global_index, global_meta
    
    if global_index is None or global_meta is None:
        return {"error": "Model not loaded"}
    
    movie_id = str(movie_id)
    matches = global_meta[global_meta['id'] == movie_id]
    
    if matches.empty:
        return {"error": f"Movie ID {movie_id} not found in index."}
        
    idx = int(matches.index[0])
    
    query_vector = global_index.reconstruct(idx).reshape(1, -1)
    
    distances, indices = global_index.search(query_vector, k+1)
    
    result_ids = []
    for i in indices[0]:
        i = int(i)
        if i != idx and i != -1:
            result_ids.append(global_meta.iloc[i]['id'])
            
    return {"movie_id": movie_id, "recommendations": result_ids}