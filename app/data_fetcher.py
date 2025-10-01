"""
Data fetcher for stock historical prices.
Falls back from finnhub -> yfinance -> mock data.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd


def fetch_stock_data(ticker: str, days: int = 365) -> Optional[pd.DataFrame]:
    """
    Fetch historical stock data for a ticker.
    
    Args:
        ticker: Stock symbol
        days: Number of days of history
    
    Returns:
        DataFrame with Date, Open, High, Low, Close, Volume columns (uppercase)
    """
    
    # Try Finnhub first
    df = _fetch_from_finnhub(ticker, days)
    if df is not None and len(df) >= 60:
        return df
    
    # Fall back to yfinance
    df = _fetch_from_yfinance(ticker, days)
    if df is not None and len(df) >= 60:
        return df
    
    # Last resort: mock data for testing
    logging.warning(f"Using mock data for {ticker}")
    return _generate_mock_data(ticker, days)


def _fetch_from_finnhub(ticker: str, days: int) -> Optional[pd.DataFrame]:
    """Fetch from Finnhub API."""
    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        return None
    
    try:
        import requests
        from datetime import datetime
        
        end_date = int(datetime.now().timestamp())
        start_date = int((datetime.now() - timedelta(days=days)).timestamp())
        
        url = f"https://finnhub.io/api/v1/stock/candle"
        params = {
            "symbol": ticker,
            "resolution": "D",
            "from": start_date,
            "to": end_date,
            "token": api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("s") != "ok" or not data.get("c"):
            return None
        
        df = pd.DataFrame({
            "Date": pd.to_datetime(data["t"], unit="s"),
            "Open": data["o"],
            "High": data["h"],
            "Low": data["l"],
            "Close": data["c"],
            "Volume": data["v"]
        })
        
        logging.info(f"Fetched {len(df)} rows from Finnhub for {ticker}")
        return df
        
    except Exception as e:
        logging.error(f"Finnhub fetch failed for {ticker}: {e}")
        return None


def _fetch_from_yfinance(ticker: str, days: int) -> Optional[pd.DataFrame]:
    """Fetch from yfinance."""
    try:
        import yfinance as yf
        
        period = "1y" if days <= 365 else "2y"
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)
        
        if df.empty:
            return None
        
        df = df.reset_index()
        # Ensure columns are uppercase
        df.columns = [col.capitalize() if col.lower() in ['date', 'open', 'high', 'low', 'close', 'volume'] else col for col in df.columns]
        
        logging.info(f"Fetched {len(df)} rows from yfinance for {ticker}")
        return df
        
    except Exception as e:
        logging.error(f"yfinance fetch failed for {ticker}: {e}")
        return None


def _generate_mock_data(ticker: str, days: int) -> pd.DataFrame:
    """Generate mock data for testing."""
    import numpy as np
    
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    
    # Simple random walk
    np.random.seed(hash(ticker) % (2**32))
    base_price = 100 + (hash(ticker) % 200)
    returns = np.random.normal(0.001, 0.02, days)
    prices = base_price * (1 + returns).cumprod()
    
    df = pd.DataFrame({
        'Date': dates,
        'Open': prices * (1 + np.random.uniform(-0.01, 0.01, days)),
        'High': prices * (1 + np.random.uniform(0, 0.02, days)),
        'Low': prices * (1 - np.random.uniform(0, 0.02, days)),
        'Close': prices,
        'Volume': np.random.randint(1000000, 10000000, days)
    })
    
    return df

