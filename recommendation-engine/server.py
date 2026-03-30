from fastapi import FastAPI, BackgroundTasks, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
import core
import uvicorn
import os

# Load model lên RAM khi startup server
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Server: Loading models into memory...")
    if not os.path.exists(core.MODEL_PATH):
        print("Model not found. Building initial index...")
        core.rebuild_all_data()
    else:
        core.load_resources_into_memory()
    yield
    print("Shutting down server...")

app = FastAPI(lifespan=lifespan)

class MoviePayload(BaseModel):
    id: str

@app.get("/")
def health_check():
    return {"status": "Python Recommendation Engine is Running ⚡"}

@app.post("/rebuild-all")
def trigger_rebuild(background_tasks: BackgroundTasks):
    """Dùng khi muốn sync lại toàn bộ DB (VD: chạy cronjob mỗi đêm)"""
    background_tasks.add_task(core.rebuild_all_data)
    return {"message": "Full rebuild started in background"}

@app.post("/add-movie/{movie_id}")
def add_new_movie(movie_id: str, background_tasks: BackgroundTasks):
    """Node.js gọi API này NGAY SAU KHI tạo xong phim mới trong DB"""
    background_tasks.add_task(core.add_single_movie, movie_id)
    return {"message": f"Adding movie {movie_id} to AI index in background"}

@app.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """Node.js gọi API này để train lại toàn bộ model"""
    background_tasks.add_task(core.rebuild_all_data)
    return {"message": "Training started in background"}

@app.get("/recommend/{movie_id}")
def recommend(movie_id: str):
    """API lấy gợi ý - Bây giờ siêu nhanh vì chạy trên RAM"""
    try:
        result = core.get_recommendations(movie_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)