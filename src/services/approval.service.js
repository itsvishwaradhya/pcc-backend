import mongoose from "mongoose";

import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import Notification from "../models/Notification.js";
import MailOutbox from "../models/MailOutbox.js";

export const approveTask = async (taskId, managerId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      manager: managerId,
    }).populate("engineer");

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "SUBMITTED") {
      throw new Error("Only submitted tasks can be approved");
    }

    const beforeState = task.status;
    const afterState = "APPROVED";

    task.status = afterState;

    await task.save({ session });

    // 1. Audit
    await AuditLog.create(
      [
        {
          task: task._id,
          actor: managerId,
          action: "TASK_APPROVED",
          beforeState,
          afterState,
        },
      ],
      { session }
    );

    // 2. Notification
    await Notification.create(
      [
        {
          recipient: task.engineer._id,
          task: task._id,
          type: "TASK_APPROVED",
          title: "Task approved",
          message: `Your task "${task.title}" has been approved.`,
        },
      ],
      { session }
    );

    // 3. Mail outbox
    await MailOutbox.create(
      [
        {
          task: task._id,
          recipient: task.engineer.email,
          subject: `Task approved: ${task.title}`,
          body: `Your task "${task.title}" has been approved by the manager.`,
          deliveryState: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const rejectTask = async (
  taskId,
  managerId,
  rejectionReason
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      manager: managerId,
    }).populate("engineer");

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "SUBMITTED") {
      throw new Error("Only submitted tasks can be rejected");
    }

    const beforeState = task.status;
    const afterState = "REJECTED";

    task.status = afterState;

    await task.save({ session });

    // 1. Audit
    await AuditLog.create(
      [
        {
          task: task._id,
          actor: managerId,
          action: "TASK_REJECTED",
          beforeState,
          afterState,
          metadata: {
            reason: rejectionReason || null,
          },
        },
      ],
      { session }
    );

    // 2. Notification
    await Notification.create(
      [
        {
          recipient: task.engineer._id,
          task: task._id,
          type: "TASK_REJECTED",
          title: "Task rejected",
          message: rejectionReason
            ? `Your task "${task.title}" was rejected: ${rejectionReason}`
            : `Your task "${task.title}" was rejected.`,
        },
      ],
      { session }
    );

    // 3. Mail outbox
    await MailOutbox.create(
      [
        {
          task: task._id,
          recipient: task.engineer.email,
          subject: `Task rejected: ${task.title}`,
          body: rejectionReason
            ? `Your task "${task.title}" was rejected. Reason: ${rejectionReason}`
            : `Your task "${task.title}" was rejected.`,
          deliveryState: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const acknowledgeTask = async (
  taskId,
  engineerId
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      engineer: engineerId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (
      task.status !== "APPROVED" &&
      task.status !== "REJECTED"
    ) {
      throw new Error(
        "Only approved or rejected tasks can be acknowledged"
      );
    }

    const beforeState = task.status;
    const afterState = "RESOLVED";

    task.status = afterState;

    await task.save({ session });

    await AuditLog.create(
      [
        {
          task: task._id,
          actor: engineerId,
          action: "TASK_ACKNOWLEDGED",
          beforeState,
          afterState,
          metadata: {
            acknowledgedDecision: beforeState,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const resubmitTask = async (
  taskId,
  engineerId
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      engineer: engineerId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "REJECTED") {
      throw new Error(
        "Only rejected tasks can be resubmitted"
      );
    }

    const beforeState = task.status;
    const afterState = "IN_PROGRESS";

    task.status = afterState;

    await task.save({ session });

    await AuditLog.create(
      [
        {
          task: task._id,
          actor: engineerId,
          action: "TASK_RESUBMITTED",
          beforeState,
          afterState,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};