/**
 * Task controller.
 *
 * Exposes HTTP endpoints for the task lifecycle:
 *   - POST   /           → createTask (Manager)
 *   - GET    /my         → getMyTasks (Engineer)
 *   - GET    /managed    → getManagedTasks (Manager)
 *   - GET    /:taskId    → getTaskById (Any authenticated user with access)
 *   - PATCH  /:taskId/start  → startTask (Engineer)
 *   - POST   /:taskId/submit → submitTask (Engineer)
 *
 * All handlers use asyncHandler to eliminate manual try/catch and
 * ApiResponse for consistent response formatting.
 */
import {
  createTask as createTaskService,
  getMyTasks,
  getManagedTasks,
  getTaskById,
  getTaskAuditLogs,
  startTask as startTaskService,
  submitTask as submitTaskService,
} from "../services/task.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * POST /api/tasks
 *
 * Create a new task and assign it to an engineer.
 * Requires MANAGER role.
 */
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate, priority, engineerId } = req.body;

  const task = await createTaskService({
    title,
    description,
    dueDate,
    priority,
    engineerId,
    managerId: req.user.userId,
  });

  return ApiResponse.success(res, task, "Task created successfully", 201);
});

/**
 * GET /api/tasks/my
 *
 * List all tasks assigned to the authenticated engineer.
 * Requires ENGINEER role.
 */
export const getMyTasksController = asyncHandler(async (req, res) => {
  const tasks = await getMyTasks(req.user.userId);

  return ApiResponse.success(res, tasks, "Tasks fetched successfully");
});

/**
 * GET /api/tasks/managed
 *
 * List all tasks created by the authenticated manager.
 * Requires MANAGER role.
 */
export const getManagedTasksController = asyncHandler(async (req, res) => {
  const tasks = await getManagedTasks(req.user.userId);

  return ApiResponse.success(res, tasks, "Managed tasks fetched successfully");
});

/**
 * GET /api/tasks/:taskId
 *
 * Get a single task by ID. Access is restricted to the manager who
 * created it or the engineer it is assigned to.
 */
export const getTaskByIdController = asyncHandler(async (req, res) => {
  const task = await getTaskById(
    req.params.taskId,
    req.user.userId,
    req.user.role
  );

  return ApiResponse.success(res, task, "Task fetched successfully");
});

/**
 * PATCH /api/tasks/:taskId/start
 *
 * Transition a task from NOT_STARTED to IN_PROGRESS.
 * Requires ENGINEER role and task must belong to the engineer.
 */
export const startTask = asyncHandler(async (req, res) => {
  const task = await startTaskService(req.params.taskId, req.user.userId);

  return ApiResponse.success(res, task, "Task started successfully");
});

/**
 * POST /api/tasks/:taskId/submit
 *
 * Submit a task for manager review (IN_PROGRESS → SUBMITTED).
 * Requires ENGINEER role and task must belong to the engineer.
 */
export const submitTask = asyncHandler(async (req, res) => {
  const task = await submitTaskService(req.params.taskId, req.user.userId);

  return ApiResponse.success(res, task, "Task submitted successfully");
});

/**
 * GET /api/tasks/:taskId/audit
 *
 * List audit log entries for a task. Any authenticated user with access
 * to the task (manager or engineer) can view the audit trail.
 */
export const getTaskAuditLogsController = asyncHandler(async (req, res) => {
  const auditLogs = await getTaskAuditLogs(
    req.params.taskId,
    req.user.userId
  );

  return ApiResponse.success(
    res,
    auditLogs,
    "Audit logs fetched successfully"
  );
});
