import "../setup.js";
import { detectEscalation } from "../../src/services/escalation.service.js";

describe("detectEscalation", () => {
  it("returns null for benign messages", () => {
    expect(detectEscalation("How do I track my order?")).toBeNull();
    expect(detectEscalation("What are your store hours?")).toBeNull();
    expect(detectEscalation("Hello, I need some help.")).toBeNull();
  });

  it("detects 'refund' as high priority", () => {
    const r = detectEscalation("I want a refund for my order.");
    expect(r).not.toBeNull();
    expect(r!.trigger).toBe("refund");
    expect(r!.priority).toBe("high");
  });

  it("detects 'legal' as urgent priority", () => {
    const r = detectEscalation("I'm going to take legal action.");
    expect(r).not.toBeNull();
    expect(r!.priority).toBe("urgent");
  });

  it("detects 'lawsuit' as urgent priority", () => {
    const r = detectEscalation("I will file a lawsuit if this isn't resolved.");
    expect(r).not.toBeNull();
    expect(r!.priority).toBe("urgent");
  });

  it("detects 'angry' as medium priority", () => {
    const r = detectEscalation("I am extremely angry about this situation.");
    expect(r).not.toBeNull();
    expect(r!.priority).toBe("medium");
  });

  it("detects 'payment failed' as high priority", () => {
    const r = detectEscalation("My payment failed and money was taken.");
    expect(r).not.toBeNull();
    expect(r!.trigger).toBe("payment failed");
    expect(r!.priority).toBe("high");
  });

  it("uses custom rule priority over default", () => {
    const custom = [{ trigger: "refund", priority: "urgent" }];
    const r = detectEscalation("I want a refund", custom);
    expect(r).not.toBeNull();
    expect(r!.priority).toBe("urgent");
  });

  it("custom rules take precedence over defaults", () => {
    const custom = [{ trigger: "shipping", priority: "medium" }];
    const r = detectEscalation("shipping problem", custom);
    expect(r).not.toBeNull();
    expect(r!.trigger).toBe("shipping");
    expect(r!.priority).toBe("medium");
  });

  it("is case-insensitive", () => {
    expect(detectEscalation("REFUND MY ORDER NOW")).not.toBeNull();
    expect(detectEscalation("I Need A REFUND")).not.toBeNull();
  });

  it("detects 'speak to human'", () => {
    const r = detectEscalation("I need to speak to human immediately.");
    expect(r).not.toBeNull();
  });

  it("detects 'manager'", () => {
    const r = detectEscalation("Let me talk to your manager.");
    expect(r).not.toBeNull();
  });
});
