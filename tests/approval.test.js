import { jest } from "@jest/globals";

jest.unstable_mockModule("../src/models/Task.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/AuditLog.js", () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/Notification.js", () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/MailOutbox.js", () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn(),
  },
}));

const { default: Task } = await import("../src/models/Task.js");
const { default: AuditLog } = await import(
  "../src/models/AuditLog.js"
);
const { default: Notification } = await import(
  "../src/models/Notification.js"
);
const { default: MailOutbox } = await import(
  "../src/models/MailOutbox.js"
);
const { default: mongoose } = await import("mongoose");

const {
  approveTask,
  rejectTask,
} = await import("../src/services/approval.service.js");

describe("Approval workflow", () => {
  let session;

  beforeEach(() => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    mongoose.startSession.mockResolvedValue(session);

    AuditLog.create.mockResolvedValue([]);
    Notification.create.mockResolvedValue([]);
    MailOutbox.create.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("manager can approve a submitted task", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "SUBMITTED",

      manager: "manager123",

      engineer: {
        _id: "engineer123",
        email: "engineer@example.com",
      },

      save: jest.fn(),
    };

    Task.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(task),
    });

    const result = await approveTask(
      "task123",
      "manager123"
    );

    expect(result.status).toBe("APPROVED");

    expect(task.save).toHaveBeenCalledWith({
      session,
    });

    expect(AuditLog.create).toHaveBeenCalled();

    expect(Notification.create).toHaveBeenCalled();

    expect(MailOutbox.create).toHaveBeenCalled();

    expect(session.commitTransaction).toHaveBeenCalled();

    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  test("manager can reject a submitted task", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "SUBMITTED",

      manager: "manager123",

      engineer: {
        _id: "engineer123",
        email: "engineer@example.com",
      },

      save: jest.fn(),
    };

    Task.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(task),
    });

    const result = await rejectTask(
      "task123",
      "manager123",
      "Please improve error handling"
    );

    expect(result.status).toBe("REJECTED");

    expect(task.save).toHaveBeenCalledWith({
      session,
    });

    expect(AuditLog.create).toHaveBeenCalled();

    expect(Notification.create).toHaveBeenCalled();

    expect(MailOutbox.create).toHaveBeenCalled();

    expect(session.commitTransaction).toHaveBeenCalled();

    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  test("approval fails when task is not submitted", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "IN_PROGRESS",

      engineer: {
        _id: "engineer123",
        email: "engineer@example.com",
      },
    };

    Task.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(task),
    });

    await expect(
      approveTask(
        "task123",
        "manager123"
      )
    ).rejects.toThrow(
      "Only submitted tasks can be approved"
    );

    expect(session.abortTransaction).toHaveBeenCalled();

    expect(AuditLog.create).not.toHaveBeenCalled();

    expect(Notification.create).not.toHaveBeenCalled();

    expect(MailOutbox.create).not.toHaveBeenCalled();
  });
});