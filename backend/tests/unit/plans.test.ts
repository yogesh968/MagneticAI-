import "../setup.js";

// Razorpay plan ids are read from env at import time, so set them BEFORE importing
// the module under test — this proves the reverse mapping the webhook relies on.
process.env.RAZORPAY_PLAN_STARTER = "plan_starter_test";
process.env.RAZORPAY_PLAN_PRO = "plan_pro_test";

const { PLAN_LIMITS, isValidPlan, isOverMessageLimit, tierForRazorpayPlan } = await import("../../src/config/plans.js");

describe("plan limits", () => {
  it("defines all four tiers with ascending message allowances", () => {
    expect(PLAN_LIMITS.free.messagesPerMonth).toBe(100);
    expect(PLAN_LIMITS.starter.messagesPerMonth).toBe(2000);
    expect(PLAN_LIMITS.pro.messagesPerMonth).toBe(10000);
    expect(PLAN_LIMITS.enterprise.messagesPerMonth).toBe(Infinity);
  });

  it("only free is branded", () => {
    expect(PLAN_LIMITS.free.unbranded).toBe(false);
    expect(PLAN_LIMITS.starter.unbranded).toBe(true);
    expect(PLAN_LIMITS.pro.unbranded).toBe(true);
  });

  it("validates plan ids", () => {
    expect(isValidPlan("pro")).toBe(true);
    expect(isValidPlan("gold")).toBe(false);
  });
});

describe("isOverMessageLimit", () => {
  it("blocks at or over a finite limit", () => {
    expect(isOverMessageLimit("free", 100)).toBe(true);
    expect(isOverMessageLimit("free", 101)).toBe(true);
    expect(isOverMessageLimit("pro", 10000)).toBe(true);
  });

  it("allows under the limit", () => {
    expect(isOverMessageLimit("free", 99)).toBe(false);
    expect(isOverMessageLimit("starter", 0)).toBe(false);
  });

  it("never blocks enterprise (unlimited)", () => {
    expect(isOverMessageLimit("enterprise", 1_000_000)).toBe(false);
  });
});

describe("tierForRazorpayPlan", () => {
  it("maps a configured Razorpay plan id back to its tier", () => {
    expect(tierForRazorpayPlan("plan_starter_test")).toBe("starter");
    expect(tierForRazorpayPlan("plan_pro_test")).toBe("pro");
  });

  it("returns undefined for an unknown or missing id", () => {
    expect(tierForRazorpayPlan("plan_unknown")).toBeUndefined();
    expect(tierForRazorpayPlan(undefined)).toBeUndefined();
  });
});
