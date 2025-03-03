
-- 01_initial_setup.sql (Renamed from 20241227_initial_setup.sql)
-- Ensure the UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Table
CREATE TABLE IF NOT EXISTS users (
    userId SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    userName VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    googleId VARCHAR(255),
    userIdOnBlockchain VARCHAR(255),
    referenceLocation VARCHAR(255),
    dataSharable BOOLEAN,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- File Table 
-- Changed from UUID to SERIAL to match your model.js implementation
CREATE TABLE IF NOT EXISTS files (
    fileId SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    fileuuid VARCHAR(255) NOT NULL,
    expirationTime INTEGER NOT NULL DEFAULT 0,
    fileName VARCHAR(255),
    fileType VARCHAR(255),
    fileSize BIGINT DEFAULT 0,
    ipfsHash VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Symptom Table
CREATE TABLE IF NOT EXISTS symptoms (
    symptomId SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    description TEXT NOT NULL,
    result TEXT NOT NULL,
    confidenceRateOfResult INTEGER NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);