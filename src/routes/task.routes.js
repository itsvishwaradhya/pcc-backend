/**
 * Task routes.
 *
 * Handles the task lifecycle endpoints:
 *   - POST   /              → create task (Manager)
 *   - GET    /my            → list engineer's own tasks (Engineer)
 *   - GET    /managed       → list manager's created tasks (Manager)
 *   - GET    /:taskId       → get task detail + audit log (Any with access)
 *   - PATCH  /:taskId/start → start task (Engineer)
 *   - POST   /:taskId/submit→ submit task (Engineer)
 */
import express from "express";

import {
  createTask,
  getMyTasksController,
  getManagedTasksController,
  getTaskByIdController,
  getTaskAuditLogsController,
  startTask,
  submitTask,
} from "../controllers/task.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

// --- Manager: create a task ---
router.post(
  "/",
  authenticate,
  requireRole("MANAGER"),
  createTask
);

// --- Engineer: list own assigned tasks ---
router.get(
  "/my",
  authenticate,
  requireRole("ENGINEER"),
  getMyTasksController
);

// --- Manager: list tasks they created ---
router.get(
  "/managed",
  authenticate,
  requireRole("MANAGER"),
  getManagedTasksController
);

// --- Any authenticated user with access: get task detail ---
router.get(
  "/:taskId",
  authenticate,
  validateObjectIdParam("taskId"),
  getTaskByIdController
);

// --- Any authenticated user with access: get task audit log ---
router.get(
  "/:taskId/audit",
  authenticate,
  validateObjectIdParam("taskId"),
  getTaskAuditLogsController
);

// --- Engineer: start a task ---
router.patch(
  "/:taskId/start",
  authenticate,
  requireRole("ENGINEER"),
  validateObjectIdParam("taskId"),
  startTask
);

// --- Engineer: submit a task for review ---
router.post(
  "/:taskId/submit",
  authenticate,
  requireRole("ENGINEER"),
  validateObjectIdParam("taskId"),
  submitTask
);

export default router;
