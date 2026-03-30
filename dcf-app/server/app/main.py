import sys
import os

# Ensure the server directory is on the Python path so "app" is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.mine_company_financial import get_company_financial, save_company_financials_to_json

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "companies-financials.json")

def main():
    print("Starting to mine company financials...")

    print(f"Output will be saved to: {OUTPUT_PATH}")

    # You can modify this list of tickers as needed
    TICKERS = ["DE", "CAT", "MIELY", "HESAY", "PM", "HLT", "JPM", "BRK-B", "GE",
               "MS", "GS", "GOOGL", "META", "MSFT", "AXP", "SPGI", "MCO","RACE",
               "GEV", "CVX", "COKE", "ISRG", "VST", "IVSXF", "ASML", "NYT"]
    
    save_company_financials_to_json(TICKERS, output_path=OUTPUT_PATH)

if __name__ == "__main__":
    main()