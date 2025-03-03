-- Create medical_info table for storing additional medical data
CREATE TABLE IF NOT EXISTS medical_info (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    medical_condition TEXT,
    medical_background TEXT,
    share_data BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_medical_info_user_id ON medical_info(userId);

-- The function and trigger need to be separate statements with proper termination
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$ 
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medical_info_updatedat
BEFORE UPDATE ON medical_info
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();