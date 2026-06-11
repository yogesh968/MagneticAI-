import jwt from "jsonwebtoken";

export type TokenPayload = { id: string; tenantId: string; role: "superadmin" | "admin" | "agent" };

export const signAccessToken = (payload: TokenPayload) => jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "15m" });
export const signRefreshToken = (payload: TokenPayload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
export const verifyAccessToken = (token: string) => jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
