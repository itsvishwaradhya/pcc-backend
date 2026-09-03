import { jest } from "@jest/globals";

jest.unstable_mockModule("../src/models/Notification.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

// validators.js calls mongoose.Types.ObjectId.isValid(), so the mock
// must provide it. Default true; overridden per-test where needed.
jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true),
      },
    },
  },
}));

const { default: Notification } = await import(
  "../src/models/Notification.js"
);
const { default: mongoose } = await import("mongoose");

const {
  getMyNotifications,
  markAsRead,
} = await import("../src/services/notification.service.js");

describe("Notification flow", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  test("user can list their own notifications newest first", async () => {
    const notifications = [
      { _id: "notif2", title: "Task rejected" },
      { _id: "notif1", title: "Task approved" },
    ];

    const sortMock = jest.fn().mockResolvedValue(notifications);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });

    Notification.find.mockReturnValue({ populate: populateMock });

    const result = await getMyNotifications("engineer123");

    expect(result).toEqual(notifications);

    // Only the requesting user's notifications are queried
    expect(Notification.find).toHaveBeenCalledWith({
      recipient: "engineer123",
    });

    // Task summary is populated and results are newest first
    expect(populateMock).toHaveBeenCalledWith("task", "title status");
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test("returns empty array when user has no notifications", async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });

    Notification.find.mockReturnValue({ populate: populateMock });

    const result = await getMyNotifications("engineer123");

    expect(result).toEqual([]);
  });

  test("user can mark their own notification as read", async () => {
    const notification = {
      _id: "notif123",
      recipient: "engineer123",
      isRead: false,
      save: jest.fn(),
    };

    Notification.findOne.mockResolvedValue(notification);

    const result = await markAsRead("notif123", "engineer123");

    expect(result.isRead).toBe(true);

    // Ownership is enforced via the recipient filter
    expect(Notification.findOne).toHaveBeenCalledWith({
      _id: "notif123",
      recipient: "engineer123",
    });

    expect(notification.save).toHaveBeenCalledWith();
  });

  test("mark-as-read fails for another user's notification", async () => {
    // findOne returns null when the notification doesn't belong to the user
    Notification.findOne.mockResolvedValue(null);

    await expect(
      markAsRead("notif123", "someone-else")
    ).rejects.toThrow("Notification not found");
  });

  test("mark-as-read fails on invalid notification ID", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    await expect(
      markAsRead("not-a-valid-id", "engineer123")
    ).rejects.toThrow("Invalid notification ID format");

    expect(Notification.findOne).not.toHaveBeenCalled();
  });
});
