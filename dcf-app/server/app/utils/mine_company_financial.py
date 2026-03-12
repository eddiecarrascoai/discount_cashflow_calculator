import yfinance as yf
import json
import os
import math

FINANCIAL_SECTORS = {"Financial Services"}

# Cache exchange rates so we only fetch each currency pair once per run
_exchange_rate_cache = {}


def get_usd_exchange_rate(currency):
    """Fetch the live exchange rate from `currency` to USD via yfinance.
    Returns 1.0 for USD. Caches results for the duration of the script run."""
    if currency == "USD":
        return 1.0
    if currency in _exchange_rate_cache:
        return _exchange_rate_cache[currency]

    pair = yf.Ticker(f"{currency}USD=X")
    rate = pair.info.get("regularMarketPrice") or pair.info.get("previousClose")
    if rate is None or rate <= 0:
        print(f"  Warning: could not fetch {currency}->USD rate, defaulting to 1.0")
        rate = 1.0
    _exchange_rate_cache[currency] = rate
    return rate

def _extract_cash_flow_series(company, sector):
    """Return (ttm, 4yr_list, label) using FCF for most companies, Net Income for financials."""
    # Banks/financials have meaningless FCF; use Net Income instead
    if sector in FINANCIAL_SECTORS:
        inc = company.income_stmt
        if inc is not None and not inc.empty and "Net Income" in inc.index:
            row = inc.loc["Net Income"].dropna()
            if len(row) > 0:
                n = min(len(row), 4)
                ttm = int(row.iloc[0] / 1e6)
                hist = [int(row.iloc[i] / 1e6) for i in range(n - 1, -1, -1)]
                return ttm, hist, "Net Income"
        return None, [], "Net Income"

    cashflow = company.cashflow
    if cashflow is not None and not cashflow.empty and "Free Cash Flow" in cashflow.index:
        row = cashflow.loc["Free Cash Flow"].dropna()
        if len(row) > 0:
            n = min(len(row), 4)
            ttm = int(row.iloc[0] / 1e6)
            hist = [int(row.iloc[i] / 1e6) for i in range(n - 1, -1, -1)]
            return ttm, hist, "FCF"
    return None, [], "FCF"


def get_company_financial(ticker):
    """Fetch key financial data for a single ticker from Yahoo Finance."""
    company = yf.Ticker(ticker)
    info = company.info
    sector = info.get("sector", "")
    financial_currency = info.get("financialCurrency", "USD")

    # Get the exchange rate to convert financial data to USD
    fx_rate = get_usd_exchange_rate(financial_currency)

    fcf_ttm, fcf_4yr, cf_label = _extract_cash_flow_series(company, sector)

    # Convert from reporting currency to USD
    if fcf_ttm is not None:
        fcf_ttm = int(fcf_ttm * fx_rate)
    fcf_4yr = [int(v * fx_rate) for v in fcf_4yr]

    fcf_growth_4yr = 0.0
    if len(fcf_4yr) >= 2 and fcf_4yr[0] > 0 and fcf_4yr[-1] > 0:
        n = len(fcf_4yr) - 1
        fcf_growth_4yr = round(((fcf_4yr[-1] / fcf_4yr[0]) ** (1 / n) - 1) * 100, 2)

    return {
        "ticker": ticker,
        "name": info.get("longName", ""),
        "price": round(info.get("currentPrice", 0), 2),
        "sharesOut": round(info.get("sharesOutstanding", 0) / 1e6),
        "fcfTTM": fcf_ttm,
        "fcf4yr": fcf_4yr,
        "fcfGrowth4yr": fcf_growth_4yr,
        "sector": sector,
        "cashFlowMetric": cf_label,
    }


def save_company_financials_to_json(tickers, output_path):
    """Fetch financial for all tickers and save to JSON."""
    results = []
    for ticker in tickers:
        print(f"Fetching {ticker}...")
        try:
            data = get_company_financial(ticker)
            results.append(data)
        except Exception as e:
            print(f"  Error fetching {ticker}: {e}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    output = {"tickers": results}
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Saved {len(results)} companies to {output_path}")