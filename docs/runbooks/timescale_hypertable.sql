CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('patterns', by_range('as_of'), if_not_exists => TRUE);


