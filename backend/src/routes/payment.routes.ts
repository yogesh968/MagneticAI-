import { Router } from "express";
import { razorpayWebhook } from "../controllers/payment.controller.js";

export const paymentRouter = Router();

paymentRouter.post("/webhook/razorpay", razorpayWebhook);
