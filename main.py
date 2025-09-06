import googlemaps
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def get_route(data: dict):
    if "depot" not in data:
        return {"status": "error", "message": "Depot missing"}

    gmaps = googlemaps.Client(key=API_KEY)

    depot = f"{data['depot']['lat']},{data['depot']['lon']}"

    stops_with_scores = []
    for k, v in data.items():
        if k == "depot":
            continue
        coord = f"{v['lat']},{v['lon']}"
        score = v.get("trash_score", 0)
        stops_with_scores.append((coord, score))

    if not stops_with_scores:
        return {"status": "error", "message": "No stops provided"}

    stops_with_scores.sort(key=lambda x: x[1], reverse=True)
    stops = [coord for coord, _ in stops_with_scores]

    directions = gmaps.directions(
        origin=depot,
        destination=depot,
        waypoints=stops,
        optimize_waypoints=True,
        mode="driving"
    )

    if not directions:
        return {"status": "error", "message": "No route found"}

    route = []
    legs = directions[0]["legs"]
    for i, leg in enumerate(legs):
        step_info = {
            "step": i + 1,
            "start": leg["start_address"],
            "end": leg["end_address"],
            "distance": leg["distance"]["text"],
            "duration": leg["duration"]["text"]
        }
        route.append(step_info)

    optimized_order = directions[0]["waypoint_order"]
    ordered_stops = [stops[i] for i in optimized_order]
    maps_url = "https://www.google.com/maps/dir/" + "/".join([depot] + ordered_stops + [depot])

    return {
        "status": "ok",
        "route_text": route,
        "maps_url": maps_url
    }


if __name__ == "__main__":
    data = {
        "depot": {"lat": 12.9716, "lon": 77.5946},
        "1": {"lat": 12.9352, "lon": 77.6245, "trash_score": 5},
        "2": {"lat": 12.9860, "lon": 77.5550, "trash_score": 10}
    }
    result = get_route(data)
    print(result)