from fastapi import FastAPI
from pydantic import BaseModel
import ml_model
from datetime import datetime

app = FastAPI()

class PredictRequest(BaseModel):
    route: str
    current_speed: float
    distance_meters: float

@app.post("/train")
def train():
    return ml_model.train_model()

@app.post("/predict")
def predict(req: PredictRequest):
    now = datetime.now()
    return ml_model.predict_eta_speed(
        route=req.route,
        current_speed=req.current_speed,
        distance_meters=req.distance_meters,
        current_hour=now.hour,
        current_day=now.weekday()
    )
