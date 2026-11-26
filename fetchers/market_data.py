"""
Market Data Fetcher
Retrieves real-time and closing prices for global indices, tech stocks, crypto, and commodities
using Yahoo Finance's free chart API with zero external dependencies.
"""

import json
import urllib.request
import urllib.error

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def fetch_single_quote(name: str, ticker: str, timeout: int = 8) -> dict:
    """Fetch current price and daily change for a single ticker."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            result = data.get("chart", {}).get("result", [])
            if not result:
                return {"name": name, "ticker": ticker, "error": "No chart data returned"}

            meta = result[0].get("meta", {})
            current_price = meta.get("regularMarketPrice")
            prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")

            if current_price is None or prev_close is None:
                # Try getting last closing prices from indicators
                quote = result[0].get("indicators", {}).get("quote", [{}])[0]
                closes = [c for c in quote.get("close", []) if c is not None]
                if closes:
                    current_price = closes[-1]
                    prev_close = closes[-2] if len(closes) > 1 else current_price

            if current_price is not None and prev_close:
                change = current_price - prev_close
                change_pct = (change / prev_close) * 100
                currency = meta.get("currency", "USD")

                return {
                    "name": name,
                    "ticker": ticker,
                    "price": current_price,
                    "prev_close": prev_close,
                    "change": change,
                    "change_pct": change_pct,
                    "currency": currency,
                    "error": None
                }
            else:
                return {"name": name, "ticker": ticker, "error": "Incomplete price data"}

    except Exception as e:
        return {"name": name, "ticker": ticker, "error": str(e)}

def fetch_all_market_data(symbols_dict: dict) -> dict:
    """Fetches quotes for all tracked symbols and categorizes them."""
    results = {}
    for name, ticker in symbols_dict.items():
        results[name] = fetch_single_quote(name, ticker)
    return results

