-- Create file_shares table for time-limited sharing
CREATE TABLE IF NOT EXISTS file_shares (
    shareId VARCHAR(255) PRIMARY KEY,
    fileId INTEGER NOT NULL REFERENCES files(fileId) ON DELETE CASCADE,
    userId INTEGER NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    expirationTime BIGINT NOT NULL, -- Unix timestamp in seconds
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(fileId);
CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares(userId);
