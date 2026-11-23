import mongoose from "mongoose";

// ============================================
// MongoDB Connection
// ============================================

/**
 * Establishes the application's MongoDB connection.
 *
 * Connection failures are passed to the server startup
 * handler instead of terminating the process here.
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  try {
    await mongoose.connect(mongoURI);

    return mongoose.connection;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`, {
      cause: error,
    });
  }
};

// ============================================
// MongoDB Disconnection
// ============================================

/**
 * Closes the MongoDB connection gracefully.
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
