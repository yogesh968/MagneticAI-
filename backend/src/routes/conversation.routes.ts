import { Router } from "express";
import { deleteConversation, getConversation, listConversations } from "../controllers/conversation.controller.js";
import { extractTenant, rbacCheck, verifyJWT } from "../middleware/index.js";
export const conversationRouter = Router();
conversationRouter.use(verifyJWT, extractTenant);
conversationRouter.get("/", listConversations);
conversationRouter.get("/:id", getConversation);
// Every other destructive route is admin-gated; this one let any agent delete.
conversationRouter.delete("/:id", rbacCheck("admin", "superadmin"), deleteConversation);
