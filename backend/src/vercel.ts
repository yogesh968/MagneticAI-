import type { Request, Response } from "express";
import { app, initializeApp } from "./app.js";

export default async function handler(req: Request, res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Ensure DB is connected on every cold start
  await initializeApp();
  return app(req, res);
}
