import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/tasks",
  taskRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(errorMiddleware);

export default app;