import type { Request, Response } from "express";
import crypto from "node:crypto";
import { Tenant } from "../models/index.js";

export async function razorpayWebhook(req: Request, res: Response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[payment] RAZORPAY_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    return res.status(400).send("Missing signature");
  }

  // Razorpay webhooks might be sent as JSON strings or parsed objects depending on express.json()
  // We configured express.json() to save rawBody buffer.
  const payloadString = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("[payment] Invalid Razorpay signature");
    return res.status(400).send("Invalid signature");
  }

  const { event, payload } = req.body;
  
  if (!event || !payload) {
    return res.status(400).send("Invalid payload");
  }

  try {
    switch (event) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.authenticated": {
        const subId = payload.subscription?.entity?.id;
        const tenantId = payload.subscription?.entity?.notes?.tenantId; // Assume tenantId passed via notes
        
        if (tenantId) {
          await Tenant.findByIdAndUpdate(tenantId, {
            isActive: true,
            razorpaySubscriptionId: subId
          });
          console.log(`[payment] Tenant ${tenantId} subscription activated/charged`);
        }
        break;
      }
      
      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.paused": {
        const subId = payload.subscription?.entity?.id;
        if (subId) {
          await Tenant.updateMany(
            { razorpaySubscriptionId: subId },
            { isActive: false }
          );
          console.log(`[payment] Subscription ${subId} halted/cancelled, tenant deactivated`);
        }
        break;
      }
      
      default:
        console.log(`[payment] Unhandled webhook event: ${event}`);
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("[payment] Webhook processing error:", error);
    res.status(500).send("Internal Server Error");
  }
}
