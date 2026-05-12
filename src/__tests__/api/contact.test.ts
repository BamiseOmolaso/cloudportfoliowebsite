import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

type AsyncMock<
  Args extends any[] = any[],
  Return = unknown,
> = jest.MockedFunction<(...args: Args) => Promise<Return>>;
type SyncMock<
  Args extends any[] = any[],
  Return = unknown,
> = jest.MockedFunction<(...args: Args) => Return>;

const mockCreate: AsyncMock = jest.fn();
const mockSend: AsyncMock = jest.fn();
const mockLimiterCheck: AsyncMock<
  [string],
  { success: boolean; remaining: number; resetTime: number }
> = jest.fn();
const mockWithRateLimit: SyncMock<
  [unknown, string, (req: NextRequest) => Promise<Response>],
  (req: NextRequest) => Promise<Response>
> = jest.fn((_, __, handler) => handler);

// Mock dependencies BEFORE importing the route
jest.mock("@/lib/db", () => ({
  db: {
    contactMessage: {
      create: mockCreate,
    },
  },
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

jest.mock("@/lib/rate-limit", () => ({
  withRateLimit: mockWithRateLimit,
  contactFormLimiter: {
    check: mockLimiterCheck,
    config: { maxRequests: 5, windowMs: 3600000 },
  },
}));

type ContactRouteModule = typeof import("@/app/api/contact/route");
let POST: ContactRouteModule["POST"];

beforeAll(async () => {
  ({ POST } = await import("@/app/api/contact/route"));
});

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();

  // Set environment variables
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.CONTACT_EMAIL = "admin@example.com";
  process.env.RESEND_FROM_EMAIL = "noreply@example.com";

  // Reset mocks
  mockCreate.mockClear();
  mockSend.mockClear();
  mockLimiterCheck.mockResolvedValue({
    success: true,
    remaining: 5,
    resetTime: Date.now() + 3600000,
  });
  mockWithRateLimit.mockImplementation((_, __, handler) => handler);
});

describe("POST /api/contact", () => {
  it("should return 400 if name is missing", async () => {
    const request = createRequest({
      email: "test@example.com",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name, email, and message are required");
  });

  it("should return 400 if email is missing", async () => {
    const request = createRequest({
      name: "Test User",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name, email, and message are required");
  });

  it("should return 400 if message is missing", async () => {
    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name, email, and message are required");
  });

  it("should return 400 if email format is invalid", async () => {
    const request = createRequest({
      name: "Test User",
      email: "invalid-email",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email format");
  });

  it("should successfully create contact message with valid data", async () => {
    mockCreate.mockResolvedValue({
      id: "123",
      name: "Test User",
      email: "test@example.com",
      subject: "Test Subject",
      message: "Test message",
    });

    mockSend.mockResolvedValue({ id: "email-id" });

    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
      subject: "Test Subject",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Message sent successfully");
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
        read: false,
        replied: false,
      },
    });
  });

  it("should sanitize inputs before saving", async () => {
    mockCreate.mockResolvedValue({ id: "123" });
    mockSend.mockResolvedValue({ id: "email-id" });

    const request = createRequest({
      name: "  Test User  ",
      email: "  TEST@EXAMPLE.COM  ",
      message: "  Test message  ",
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test User",
        email: "test@example.com",
        message: "Test message",
      }),
    });
  });

  it("should handle database errors gracefully", async () => {
    mockCreate.mockRejectedValue(new Error("Database error"));

    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save message");
  });

  it("should still return 200 if the auto-reply fails (admin notification is the critical one)", async () => {
    mockCreate.mockResolvedValue({ id: "123" });
    // Admin notification succeeds, auto-reply to user fails — best-effort
    mockSend
      .mockResolvedValueOnce({ id: "email-1" })
      .mockRejectedValueOnce(new Error("Auto-reply send failed"));

    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Message sent successfully");
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("should return 500 when the admin notification email fails (operator must know)", async () => {
    mockCreate.mockResolvedValue({ id: "123" });
    // Admin notification fails — the operator wouldn't see the message
    mockSend.mockRejectedValueOnce(new Error("Resend rejected sender domain"));

    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/notifying the recipient/i);
    // The auto-reply send should not be attempted — we fail fast on admin failure
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should return 500 when CONTACT_EMAIL env var is missing (misconfiguration)", async () => {
    delete process.env.CONTACT_EMAIL;
    mockCreate.mockResolvedValue({ id: "123" });

    const request = createRequest({
      name: "Test User",
      email: "test@example.com",
      message: "Test message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/misconfigured/i);
    // No email send should be attempted when CONTACT_EMAIL is missing
    expect(mockSend).not.toHaveBeenCalled();

    // Restore env var for other tests
    process.env.CONTACT_EMAIL = "admin@example.com";
  });
});
