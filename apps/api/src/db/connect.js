import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/support_engine';

export async function connectDB() {
  try {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
  } catch (error) {
    console.warn(`[MongoDB] Local connection warning (falling back to in-memory/stub if unavailable): ${error.message}`);
  }
}
