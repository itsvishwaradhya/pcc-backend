import mongoose from "mongoose";

const mailOutboxSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    deliveryState: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

const MailOutbox = mongoose.model(
  "MailOutbox",
  mailOutboxSchema
);

export default MailOutbox;