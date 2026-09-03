import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "RESOLVED",
      ],
      default: "NOT_STARTED",
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    engineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;