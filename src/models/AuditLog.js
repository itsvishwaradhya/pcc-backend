import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "TASK_CREATED",
        "TASK_STARTED",
        "TASK_SUBMITTED",
        "TASK_APPROVED",
        "TASK_REJECTED",
        "TASK_RESUBMITTED",
        "TASK_ACKNOWLEDGED",
      ],
      required: true,
    },

    beforeState: {
      type: String,
      default: null,
    },

    afterState: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;