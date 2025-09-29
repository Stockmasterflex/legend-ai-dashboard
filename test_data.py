import yfinance as yf

ticker = 'AAPL'
print(f"Fetching {ticker}...")
df = yf.download(ticker, period='1mo', progress=False)
print(df.head())
print(f"Got {len(df)} days of data")
