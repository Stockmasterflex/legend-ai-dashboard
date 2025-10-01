-- Create patterns table for storing technical pattern detections
CREATE TABLE IF NOT EXISTS patterns (
    ticker TEXT NOT NULL,
    pattern TEXT NOT NULL,
    as_of TIMESTAMPTZ NOT NULL,
    confidence FLOAT,
    rs FLOAT,
    price NUMERIC,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, pattern, as_of)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patterns_asof ON patterns (as_of DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_ticker_asof ON patterns (ticker, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_pattern ON patterns (pattern);

