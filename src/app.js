/**
 * Express application setup.
 *
 * Configures middleware, mounts route groups, and attaches the global
 * error handler. This module is imported by server.js which starts
 * listening on the configured port.
 */
import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

// --- Global middleware ---
app.use(express.json());
app.use(cookieParser());

// --- Route groups ---
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tasks", approvalRoutes);     // Approval actions share the /api/tasks prefix
app.use("/api/notifications", notificationRoutes);

// --- Global error handler (must be last) ---
app.use(errorMiddleware);

export default app;
