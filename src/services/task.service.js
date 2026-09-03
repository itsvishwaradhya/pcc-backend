import User from "../models/User.js";
import Task from "../models/Task.js";

export const createTask = async ({
  title,
  description,
  dueDate,
  priority,
  engineerId,
  managerId,
}) => {
  const engineer = await User.findOne({
    _id: engineerId,
    role: "ENGINEER",
  });

  if (!engineer) {
    throw new Error("Assigned user is not a valid engineer");
  }

  const task = await Task.create({
    title,
    description,
    dueDate,
    priority,
    manager: managerId,
    engineer: engineerId,
  });

  return task;
};

export const getMyTasks = async (engineerId) => {
  return Task.find({
    engineer: engineerId,
  }).sort({ createdAt: -1 });
};

export const startTask = async (taskId, engineerId) => {
  const task = await Task.findOne({
    _id: taskId,
    engineer: engineerId,
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.status !== "NOT_STARTED") {
    throw new Error("Task cannot be started in its current state");
  }

  task.status = "IN_PROGRESS";

  await task.save();

  return task;
};

export const submitTask = async (taskId, engineerId) => {
  const task = await Task.findOne({
    _id: taskId,
    engineer: engineerId,
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.status !== "IN_PROGRESS") {
    throw new Error("Only in-progress tasks can be submitted");
  }

  task.status = "SUBMITTED";

  await task.save();

  return task;
};