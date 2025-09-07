import os

import googlemaps
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ✅ Only one FastAPI instance
app = FastAPI(
    title="Geocoding API",
    description="Convert latitude and longitude to place names using Google Maps API"
)

# ✅ Attach CORS to the same instance
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load API key
load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not API_KEY:
    raise ValueError("GOOGLE_MAPS_API_KEY not found")

gmaps = googlemaps.Client(key=API_KEY)

class Coordinates(BaseModel):
    lat: float
    lon: float

@app.post("/geocode")
async def latlon_to_place(coords: Coordinates):
    result = gmaps.reverse_geocode((coords.lat, coords.lon))
    if result:
        return {"address": result[0]["formatted_address"]}
    return {"address": "Unknown Location"}

@app.get("/")
async def root():
    return {"message": "Geocoding API is running"}
