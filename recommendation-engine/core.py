import os
import pandas as pd
import numpy as np
import faiss
import pickle
from sqlalchemy import create_engine
from sentence_transformers import SentenceTransformer

DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_PATH = "movie_index.faiss"
META_PATH = "movie_metadata.pkl"

model = SentenceTransformer('all-MiniLM-L6-v2')

def fetch_data():
    """Lấy dữ liệu phim từ PostgreSQL"""
    engine = create_engine(DATABASE_URL)
    query = """
    SELECT 
        m.id, 
        m.title, 
        COALESCE(m.description, '') as overview,
        string_agg(DISTINCT g.name, ' ') as genres,
        string_agg(DISTINCT p.name, ' ') as cast_crew
    FROM movies m
    LEFT JOIN "MovieGenre" mg ON m.id = mg.movie_id
    LEFT JOIN "Genre" g ON mg.genre_id = g.id
    LEFT JOIN "MoviePerson" mp ON m.id = mp.movie_id
    LEFT JOIN "Person" p ON mp.person_id = p.id
    WHERE m.is_deleted = false AND m.is_active = true
    GROUP BY m.id
    """
    print("Connecting to DB and fetching data...")
    df = pd.read_sql(query, engine)
    df['id'] = df['id'].astype(str)
    
    return df

def create_soup(row):
    """Tạo chuỗi văn bản tổng hợp để vector hóa"""
    return f"{row['genres']} {row['genres']} {row['cast_crew']} {row['overview']}"

def train_model():
    """Huấn luyện lại toàn bộ hệ thống"""
    df = fetch_data()
    print(f"Fetched {len(df)} movies.")
    
    # 1. Tạo Soup
    df['soup'] = df.apply(create_soup, axis=1)
    
    # 2. Vector hóa (Embeddings)
    print("Encoding vectors (this may take a while)...")
    embeddings = model.encode(df['soup'].tolist(), show_progress_bar=True)
    
    # 3. Chuẩn hóa vector
    faiss.normalize_L2(embeddings)
    
    # 4. Tạo Index FAISS
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)
    
    # 5. Lưu
    faiss.write_index(index, MODEL_PATH)
    df[['id', 'title']].to_pickle(META_PATH) 
    print("Training finished & Saved!")

def get_recommendations(movie_id, k=10):
    """Tìm phim tương tự"""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(META_PATH):
        print("Error: Model files not found")
        return []
        
    index = faiss.read_index(MODEL_PATH)
    df_meta = pd.read_pickle(META_PATH)
    
    print(f"Searching for Movie ID: {movie_id}")
    
    try:
        movie_id = str(movie_id)
        matches = df_meta[df_meta['id'] == movie_id]
        
        if matches.empty:
            print(f"Movie ID {movie_id} not found in dataset.")
            return []
            
        # Lấy index và ép kiểu sang int ngay lập tức
        idx = int(matches.index[0])
        print(f"Found movie at index: {idx}")
        
        # Reconstruct vector từ index
        query_vector = index.reconstruct(idx).reshape(1, -1)
        
        # Tìm kiếm
        distances, indices = index.search(query_vector, k+1)
        
        result_ids = []
        for i in indices[0]:
            i = int(i)
            if i != idx and i != -1:
                result_ids.append(df_meta.iloc[i]['id'])
        
        print(f"Found {len(result_ids)} recommendations")        
        return result_ids

    except Exception as e:
        print(f"Error during recommendation: {e}")
        return []