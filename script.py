import sys
import base64
import requests


def main():
    # Check command line arguments
    if len(sys.argv) != 2:
        print("Usage: python script.py <image_url>")
        sys.exit(1)

    image_url = sys.argv[1]

    # Download the image
    try:
        response = requests.get(image_url)
        response.raise_for_status()
        image_data = response.content
    except requests.exceptions.RequestException as e:
        print(f"Error downloading image: {e}")
        sys.exit(1)

    # Encode image to base64
    image_base64 = base64.b64encode(image_data).decode("utf-8")

    # Prepare the payload
    payload = {
        "image": image_base64,
        "latitude": 37.7749,  # Example coordinates (San Francisco)
        "longitude": -122.4194,
    }

    # Send POST request
    try:
        response = requests.post("http://localhost:7504/report", json=payload)
        response.raise_for_status()
        print(f"Success! Status code: {response.status_code}")
        print(f"Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error sending request: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
