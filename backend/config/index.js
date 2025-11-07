// backend/config/index.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  dbPath: './backend/database/repox.db',
  environment: process.env.NODE_ENV || 'development'
};
