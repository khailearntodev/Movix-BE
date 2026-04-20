import os
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
engine = create_engine(DATABASE_URL)

def _resolve_existing_table(conn, candidates):
    """Trả về tên bảng đầu tiên tồn tại trong DB theo danh sách candidate."""
    for candidate in candidates:
        result = conn.execute(
            text("SELECT to_regclass(:name) IS NOT NULL"),
            {"name": candidate}
        ).scalar()
        if result:
            return candidate
    return None

def fetch_movie_data(movie_id=None):
    """Lấy movie metadata từ PostgreSQL (1 movie hoặc toàn bộ)."""
    with engine.connect() as conn:
        movie_table = _resolve_existing_table(conn, ["public.movies", 'public."Movie"'])
        movie_genre_table = _resolve_existing_table(conn, ["public.movie_genres", 'public."MovieGenre"'])
        genre_table = _resolve_existing_table(conn, ["public.genres", 'public."Genre"'])
        movie_person_table = _resolve_existing_table(conn, ["public.movie_people", 'public."MoviePerson"'])
        person_table = _resolve_existing_table(conn, ["public.people", 'public."Person"'])

        if movie_table is None:
            print("⚠️ Movie table not found. Returning empty dataframe.")
            return pd.DataFrame(columns=["id", "title", "overview", "genres", "cast_crew"])

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
            params["movie_id"] = movie_id

        base_query += " GROUP BY m.id, m.title, m.description"
        df = pd.read_sql(text(base_query), conn, params=params)

    df["id"] = df["id"].astype(str)
    return df

def fetch_rating_data(user_id=None):
    """Lấy ratings để học collaborative signal."""
    with engine.connect() as conn:
        rating_table = _resolve_existing_table(conn, ["public.ratings", "public.rating", 'public."Rating"'])
        if rating_table is None:
            return pd.DataFrame(columns=["user_id", "movie_id", "rating"])

        query = f"""
        SELECT
            r.user_id,
            r.movie_id,
            COALESCE(r.rating, 0) AS rating
        FROM {rating_table} r
        WHERE r.is_deleted = false AND r.rating IS NOT NULL
        """
        params = {}
        if user_id:
            query += " AND r.user_id = :user_id"
            params["user_id"] = user_id

        df = pd.read_sql(text(query), conn, params=params)

    if df.empty:
        return pd.DataFrame(columns=["user_id", "movie_id", "rating"])

    df["user_id"] = df["user_id"].astype(str)
    df["movie_id"] = df["movie_id"].astype(str)
    
    import numpy as np
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(0.0).astype(np.float32)
    return df
