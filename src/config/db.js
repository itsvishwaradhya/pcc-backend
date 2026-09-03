/**
 * MongoDB connection helper.
 *
 * Uses Mongoose to connect to the cluster specified in config.MONGO_URI.
 * On failure the error is re-thrown so the caller (server.js) can decide
 * how to handle it (typically: log and exit).
 */
import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;
