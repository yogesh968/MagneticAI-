import type { Types } from "mongoose";
import type { SessionPayload, TokenPayload } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: Types.ObjectId;
      /** Set by verifySession on public widget routes. */
      session?: SessionPayload;
      /** Raw request body, captured for webhook signature verification. */
      rawBody?: Buffer;
    }
  }
}

export {};
