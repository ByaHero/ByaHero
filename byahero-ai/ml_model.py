import os
import pandas as pd
import mysql.connector
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
from dotenv import load_dotenv

load_dotenv()

MODEL_FILE = "model.pkl"
ENCODER_FILE = "encoder.pkl"

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", 3306),
        database=os.getenv("DB_DATABASE"),
        user=os.getenv("DB_USERNAME"),
        password=os.getenv("DB_PASSWORD")
    )

def train_model():
    conn = get_db_connection()
    query = "SELECT route, speed, created_at FROM bus_telemetries WHERE speed > 0 AND route IS NOT NULL"
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        return {"success": False, "message": "Not enough data to train."}

    # Preprocessing
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['hour'] = df['created_at'].dt.hour
    df['day_of_week'] = df['created_at'].dt.dayofweek

    # Encode route
    le = LabelEncoder()
    df['route_encoded'] = le.fit_transform(df['route'])

    X = df[['route_encoded', 'hour', 'day_of_week']]
    y = df['speed']

    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)

    joblib.dump(model, MODEL_FILE)
    joblib.dump(le, ENCODER_FILE)

    return {"success": True, "message": "Model trained successfully."}

def predict_eta_speed(route: str, current_speed: float, distance_meters: float, current_hour: int, current_day: int):
    if not os.path.exists(MODEL_FILE) or not os.path.exists(ENCODER_FILE):
        # Fallback to defaults
        predicted_speed = 10.0
    else:
        model = joblib.load(MODEL_FILE)
        le = joblib.load(ENCODER_FILE)
        
        try:
            route_encoded = le.transform([route])[0]
            historical_speed = model.predict([[route_encoded, current_hour, current_day]])[0]
            predicted_speed = historical_speed
        except Exception:
            # Route not seen before
            predicted_speed = 10.0

    if current_speed > 0:
        predicted_speed = (current_speed * 0.6) + (predicted_speed * 0.4)
        
    predicted_speed = max(1.0, predicted_speed)
    
    eta_minutes = 0
    if distance_meters and distance_meters > 0:
        eta_minutes = int((distance_meters / predicted_speed) / 60)
        
    return {
        "predicted_speed_ms": round(predicted_speed, 2),
        "predicted_speed_kmh": round(predicted_speed * 3.6, 1),
        "eta_minutes": eta_minutes
    }
