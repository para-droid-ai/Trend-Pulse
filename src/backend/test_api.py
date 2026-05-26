import requests
import json

BASE_URL = "http://127.0.0.1:8000"


def print_response(response):
    print(f"Status Code: {response.status_code}")
    print("Headers:", response.headers)
    print("Response Text:", response.text)
    try:
        return response.json()
    except:
        return None


def create_user(token, email, password):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    response = requests.post(
        f"{BASE_URL}/users/",
        headers=headers,
        json={"email": email, "password": password},
    )
    return print_response(response)


def login(email, password):
    response = requests.post(
        f"{BASE_URL}/token", data={"username": email, "password": password}
    )
    return print_response(response)


def create_topic_stream(
    token,
    query,
    update_frequency="hourly",
    detail_level="detailed",
    model_type="sonar-pro",
    recency_filter="day",
):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = {
        "query": query,
        "update_frequency": update_frequency,
        "detail_level": detail_level,
        "model_type": model_type,
        "recency_filter": recency_filter,
    }
    print("Request data:", json.dumps(data, indent=2))
    response = requests.post(f"{BASE_URL}/topic-streams/", headers=headers, json=data)
    return print_response(response)


try:
    # Login as an existing admin/user first (assuming seeded by create_test_user.py)
    print("\nLogging in as seeded user to get token...")
    seed_token_data = login("user@test.com", "test1234")

    if seed_token_data and "access_token" in seed_token_data:
        token = seed_token_data["access_token"]

        # Create a test user
        print("\nCreating user...")
        user = create_user(token, "test_new@example.com", "test123")

        # Login as the new user
        print("\nLogging in as new user...")
        token_data = login("test_new@example.com", "test123")

    if token_data and "access_token" in token_data:
        # Create a topic stream
        print("\nCreating topic stream...")
        topic_stream = create_topic_stream(
            token_data["access_token"],
            "Latest AI model releases from Gemini, Claude, OpenAI, DeepSeek, etc.",
            update_frequency="hourly",
            detail_level="detailed",
            model_type="sonar-pro",
            recency_filter="week",
        )
    else:
        print("Failed to get access token")
except Exception as e:
    print(f"Error: {str(e)}")
