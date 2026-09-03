/**
 * Approval workflow routes.
 *
 * Mounted at /api/tasks so the full paths are:
 *   POST /api/tasks/:taskId/approve      (Manager)
 *   POST /api/tasks/:taskId/reject       (Manager)
 *   POST /api/tasks/:taskId/acknowledge  (Engineer)
 *   POST /api/tasks/:taskId/resubmit     (Engineer)
 */
import express from "express";

import {
  approveTask,
  rejectTask,
  acknowledgeTask,
  resubmitTask,
} from "../controllers/approval.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

// --- Manager actions ---

router.post(
  "/:taskId/approve",
  authenticate,
  requireRole("MANAGER"),
  validateObjectIdParam("taskId"),
  approveTask
);

router.post(
  "/:taskId/reject",
  authenticate,
  requireRole("MANAGER"),
  validateObjectIdParam("taskId"),
  rejectTask
);

// --- Engineer actions ---

router.post(
  "/:taskId/acknowledge",
  authenticate,
  requireRole("ENGINEER"),
  validateObjectIdParam("taskId"),
  acknowledgeTask
);

router.post(
  "/:taskId/resubmit",
  authenticate,
  requireRole("ENGINEER"),
  validateObjectIdParam("taskId"),
  resubmitTask
);

export default router;
