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

class PredictTrafficRequest(BaseModel):
    route: str
    current_speed: float
    distance_meters: float
    sustained_slow_seconds: int = 0

@app.post("/predict-traffic")
def predict_traffic(req: PredictTrafficRequest):
    now = datetime.now()
    
    # Calculate extra delay using the model
    result = ml_model.predict_traffic_delay(
        route=req.route,
        current_speed_ms=req.current_speed,
        distance_meters=req.distance_meters,
        current_hour=now.hour,
        current_day=now.weekday()
    )
    
    # Determine confidence (1.0 = fully confident if sustained >= 90s)
    confidence = min(req.sustained_slow_seconds / 90.0, 1.0) if req.sustained_slow_seconds > 0 else 0.0
    
    # It's in traffic if sustained for >= 90s and speed is <= 5km/h (1.39 m/s). 
    # But backend handles the boolean, we just return the raw stats. Actually let's return the boolean here too.
    is_in_traffic = req.sustained_slow_seconds >= 90 and req.current_speed <= 1.39
    
    return {
        "is_in_traffic": is_in_traffic,
        "extra_delay_minutes": result["extra_delay_minutes"],
        "confidence": round(confidence, 2)
    }
