import { Router } from "express";
import { deleteConversation, getConversation, listConversations } from "../controllers/conversation.controller.js";
import { extractTenant, verifyJWT } from "../middleware/index.js";
export const conversationRouter = Router();
conversationRouter.use(verifyJWT, extractTenant);
conversationRouter.get("/", listConversations);
conversationRouter.get("/:id", getConversation);
conversationRouter.delete("/:id", deleteConversation);
