from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import core
import uvicorn

app = FastAPI()

class MoviePayload(BaseModel):
    id: str

@app.get("/")
def health_check():
    return {"status": "Python Recommendation Engine is Runnnig"}

@app.post("/train")
def trigger_train(background_tasks: BackgroundTasks):
    """API để Node.js gọi khi muốn train lại (chạy ngầm)"""
    background_tasks.add_task(core.train_model)
    return {"message": "Training started in background"}

@app.get("/recommend/{movie_id}")
def recommend(movie_id: str):
    """API lấy danh sách phim gợi ý"""
    try:
        similar_ids = core.get_recommendations(movie_id)
        return {"movie_id": movie_id, "recommendations": similar_ids}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Nếu chạy lần đầu chưa có model, tự động train
    if not os.path.exists(core.MODEL_PATH):
        print("Model not found. Training first time...")
        core.train_model()
        
    uvicorn.run(app, host="0.0.0.0", port=8000)