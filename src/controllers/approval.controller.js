/**
 * Approval workflow controller.
 *
 * Exposes HTTP endpoints for the manager approval/rejection flow and
 * the engineer acknowledgement/resubmission flow:
 *
 *   - POST /api/tasks/:taskId/approve      → approveTask (Manager)
 *   - POST /api/tasks/:taskId/reject       → rejectTask  (Manager)
 *   - POST /api/tasks/:taskId/acknowledge  → acknowledgeTask (Engineer)
 *   - POST /api/tasks/:taskId/resubmit     → resubmitTask    (Engineer)
 *
 * All handlers use asyncHandler and ApiResponse for consistency.
 */
import {
  approveTask as approveTaskService,
  rejectTask as rejectTaskService,
  acknowledgeTask as acknowledgeTaskService,
  resubmitTask as resubmitTaskService,
} from "../services/approval.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * POST /api/tasks/:taskId/approve
 *
 * Approve a submitted task. Only the manager who assigned the task
 * can approve it. Produces audit + notification + mail outbox.
 * Requires MANAGER role.
 */
export const approveTask = asyncHandler(async (req, res) => {
  const task = await approveTaskService(
    req.params.taskId,
    req.user.userId
  );

  return ApiResponse.success(res, task, "Task approved successfully");
});

/**
 * POST /api/tasks/:taskId/reject
 *
 * Reject a submitted task with an optional reason. Only the assigning
 * manager can reject. Produces audit + notification + mail outbox.
 * Requires MANAGER role.
 *
 * @body {string} [rejectionReason] - Reason for rejection (optional).
 */
export const rejectTask = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;

  const task = await rejectTaskService(
    req.params.taskId,
    req.user.userId,
    rejectionReason
  );

  return ApiResponse.success(res, task, "Task rejected successfully");
});

/**
 * POST /api/tasks/:taskId/acknowledge
 *
 * Engineer explicitly acknowledges an approval or rejection decision.
 * Transitions the task to RESOLVED. Produces an audit entry only.
 * Requires ENGINEER role.
 */
export const acknowledgeTask = asyncHandler(async (req, res) => {
  const task = await acknowledgeTaskService(
    req.params.taskId,
    req.user.userId
  );

  return ApiResponse.success(
    res,
    task,
    "Task decision acknowledged successfully"
  );
});

/**
 * POST /api/tasks/:taskId/resubmit
 *
 * Engineer resubmits a rejected task for re-review.
 * Transitions REJECTED → IN_PROGRESS. Produces an audit entry only.
 * Requires ENGINEER role.
 */
export const resubmitTask = asyncHandler(async (req, res) => {
  const task = await resubmitTaskService(
    req.params.taskId,
    req.user.userId
  );

  return ApiResponse.success(res, task, "Task resubmitted successfully");
});
