import json
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "companies-financials.json")


def load_financials():
    """Load company financials from the JSON data file."""
    with open(DATA_PATH, "r") as f:
        return json.load(f)
