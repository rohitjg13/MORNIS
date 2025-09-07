import googlemaps
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
gmaps = googlemaps.Client(key=API_KEY)

def latlon_to_place(lat: float, lon: float) -> str:
    result = gmaps.reverse_geocode((lat, lon))
    if result:
        return result[0]["formatted_address"]
    return "Unknown Location"


# Example usage
if __name__ == "__main__":
    lat, lon = 12.9716, 77.5946
    print(latlon_to_place(lat, lon))