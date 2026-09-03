import {
  createTask as createTaskService,
  getMyTasks,
  startTask as startTaskService,
  submitTask as submitTaskService,
} from "../services/task.service.js";

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      engineerId,
    } = req.body;

    const task = await createTaskService({
      title,
      description,
      dueDate,
      priority,
      engineerId,
      managerId: req.user.userId,
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const getMyTasksController = async (req, res) => {
  try {
    const tasks = await getMyTasks(req.user.userId);

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const startTask = async (req, res) => {
  try {
    const task = await startTaskService(
      req.params.taskId,
      req.user.userId
    );

    res.status(200).json({
      message: "Task started successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const submitTask = async (req, res) => {
  try {
    const task = await submitTaskService(
      req.params.taskId,
      req.user.userId
    );

    res.status(200).json({
      message: "Task submitted successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};