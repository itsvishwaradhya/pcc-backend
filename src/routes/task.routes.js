import express from "express";

import {
  createTask,
  getMyTasksController,
  startTask,
  submitTask,
} from "../controllers/task.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireRole("MANAGER"),
  createTask
);

router.get(
  "/my",
  authenticate,
  requireRole("ENGINEER"),
  getMyTasksController
);

router.patch(
  "/:taskId/start",
  authenticate,
  requireRole("ENGINEER"),
  startTask
);

router.post(
  "/:taskId/submit",
  authenticate,
  requireRole("ENGINEER"),
  submitTask
);

export default router;