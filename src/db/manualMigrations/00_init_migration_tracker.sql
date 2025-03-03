-- Save this as: src/db/manualMigrations/00_init_migration_tracker.sql

-- Create a migrations table to track which migrations have been run
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);