import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; tenantId: string; role: "superadmin" | "admin" | "agent" };
      tenantId?: Types.ObjectId;
    }
  }
}

export {};
