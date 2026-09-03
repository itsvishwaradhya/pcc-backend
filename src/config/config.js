/**
 * Centralised configuration module.
 *
 * Loads environment variables once at startup via dotenv, validates that
 * all required variables are present, and exports a frozen config object.
 * Every other module should import this instead of reading process.env
 * directly.
 */
import dotenv from "dotenv";

dotenv.config();

if (!process.env.NODE_ENV) {
  throw new Error("NODE_ENV is not defined");
}

if (!process.env.PORT) {
  throw new Error("PORT is not defined");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined");
}

const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
};

export default config;
