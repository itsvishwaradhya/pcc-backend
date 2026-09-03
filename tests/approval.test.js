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

// validators.js calls mongoose.Types.ObjectId.isValid(), so the mock
// must provide it (returns true so IDs pass validation in tests).
jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true),
      },
    },
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

const {
  approveTask,
  rejectTask,
  acknowledgeTask,
  resubmitTask,
} = await import("../src/services/approval.service.js");

describe("Approval workflow", () => {
  beforeEach(() => {
    AuditLog.create.mockResolvedValue({});
    Notification.create.mockResolvedValue({});
    MailOutbox.create.mockResolvedValue({});
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

    expect(task.save).toHaveBeenCalledWith();

    expect(AuditLog.create).toHaveBeenCalled();

    expect(Notification.create).toHaveBeenCalled();

    expect(MailOutbox.create).toHaveBeenCalled();
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

    expect(task.save).toHaveBeenCalledWith();

    expect(AuditLog.create).toHaveBeenCalled();

    expect(Notification.create).toHaveBeenCalled();

    expect(MailOutbox.create).toHaveBeenCalled();
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

    expect(AuditLog.create).not.toHaveBeenCalled();

    expect(Notification.create).not.toHaveBeenCalled();

    expect(MailOutbox.create).not.toHaveBeenCalled();
  });

  test("rejection fails when task is not submitted", async () => {
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
      rejectTask(
        "task123",
        "manager123",
        "Not good enough"
      )
    ).rejects.toThrow(
      "Only submitted tasks can be rejected"
    );

    expect(AuditLog.create).not.toHaveBeenCalled();

    expect(Notification.create).not.toHaveBeenCalled();

    expect(MailOutbox.create).not.toHaveBeenCalled();
  });

  test("engineer can acknowledge an approved task", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "APPROVED",

      engineer: "engineer123",

      save: jest.fn(),
    };

    // acknowledgeTask does NOT use .populate(), so return task directly
    Task.findOne.mockResolvedValue(task);

    const result = await acknowledgeTask(
      "task123",
      "engineer123"
    );

    expect(result.status).toBe("RESOLVED");

    expect(task.save).toHaveBeenCalledWith();

    expect(AuditLog.create).toHaveBeenCalled();
  });

  test("engineer can acknowledge a rejected task", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "REJECTED",

      engineer: "engineer123",

      save: jest.fn(),
    };

    Task.findOne.mockResolvedValue(task);

    const result = await acknowledgeTask(
      "task123",
      "engineer123"
    );

    expect(result.status).toBe("RESOLVED");

    expect(task.save).toHaveBeenCalledWith();

    expect(AuditLog.create).toHaveBeenCalled();
  });

  test("engineer can resubmit a rejected task", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "REJECTED",

      engineer: "engineer123",

      save: jest.fn(),
    };

    Task.findOne.mockResolvedValue(task);

    const result = await resubmitTask(
      "task123",
      "engineer123"
    );

    expect(result.status).toBe("IN_PROGRESS");

    expect(task.save).toHaveBeenCalledWith();

    expect(AuditLog.create).toHaveBeenCalled();
  });

  test("acknowledgement fails when task is not approved or rejected", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "NOT_STARTED",

      engineer: "engineer123",
    };

    Task.findOne.mockResolvedValue(task);

    await expect(
      acknowledgeTask(
        "task123",
        "engineer123"
      )
    ).rejects.toThrow(
      "Only approved or rejected tasks can be acknowledged"
    );

    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  test("resubmission fails when task is not rejected", async () => {
    const task = {
      _id: "task123",
      title: "Build API",
      status: "APPROVED",

      engineer: "engineer123",
    };

    Task.findOne.mockResolvedValue(task);

    await expect(
      resubmitTask(
        "task123",
        "engineer123"
      )
    ).rejects.toThrow(
      "Only rejected tasks can be resubmitted"
    );

    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  test("approval fails when task is not found", async () => {
    Task.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(
      approveTask(
        "task123",
        "manager123"
      )
    ).rejects.toThrow(
      "Task not found"
    );

    expect(AuditLog.create).not.toHaveBeenCalled();
  });
});
