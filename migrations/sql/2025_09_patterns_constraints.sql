-- Ensure unique business key to support idempotent upserts
ALTER TABLE IF EXISTS patterns
ADD CONSTRAINT IF NOT EXISTS patterns_uniq UNIQUE (ticker, pattern, as_of);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_patterns_asof ON patterns (as_of DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_ticker_asof ON patterns (ticker, as_of DESC);

-- Retention and continuous aggregate (safe if Timescale)
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('patterns', by_range('as_of'), if_not_exists => TRUE);

-- Retain 730 days of raw rows
SELECT add_retention_policy('patterns', INTERVAL '730 days');

-- Daily counts for UI
CREATE MATERIALIZED VIEW IF NOT EXISTS patterns_daily
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', as_of) AS day, pattern, count(*) AS n
FROM patterns
GROUP BY 1,2;

SELECT add_continuous_aggregate_policy('patterns_daily',
start_offset => INTERVAL '90 days',
end_offset   => INTERVAL '1 hour',
schedule_interval => INTERVAL '15 minutes');


