import { stateOf, summarize, type SendRecord } from "@/lib/newsletter-stats";

const d = new Date("2026-10-03T10:00:00Z");
const rec = (over: Partial<SendRecord> = {}): SendRecord => ({
  status: "sent",
  deliveredAt: null,
  openedAt: null,
  bouncedAt: null,
  complainedAt: null,
  ...over,
});

describe("stateOf", () => {
  it("names where each email got to", () => {
    expect(stateOf(rec({ status: "failed" }))).toBe("failed");
    expect(stateOf(rec({ bouncedAt: d }))).toBe("bounced");
    expect(stateOf(rec({ deliveredAt: d, openedAt: d }))).toBe("opened");
    expect(stateOf(rec({ deliveredAt: d }))).toBe("delivered");
    expect(stateOf(rec())).toBe("waiting");
  });

  it("treats a bounce as final even if a delivered event also arrived", () => {
    expect(stateOf(rec({ deliveredAt: d, bouncedAt: d }))).toBe("bounced");
  });
});

describe("summarize", () => {
  it("counts delivered, opened, not opened, bounced, failed and waiting", () => {
    const stats = summarize([
      rec({ deliveredAt: d, openedAt: d }),
      rec({ deliveredAt: d }),
      rec({ deliveredAt: d }),
      rec({ bouncedAt: d }),
      rec({ status: "failed" }),
      rec(),
    ]);
    expect(stats).toEqual({
      total: 6,
      accepted: 5,
      failed: 1,
      delivered: 3,
      opened: 1,
      notOpened: 2,
      bounced: 1,
      complained: 0,
      waiting: 1,
    });
  });

  it("counts spam reports separately", () => {
    expect(
      summarize([rec({ deliveredAt: d, complainedAt: d })]).complained,
    ).toBe(1);
  });

  it("handles an empty list", () => {
    expect(summarize([]).total).toBe(0);
  });
});
