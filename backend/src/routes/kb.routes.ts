import { Router } from "express";
import multerPkg from "multer";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const multer = (multerPkg as any).default ?? multerPkg;
import { deleteDocument, getDocument, listDocuments, reindex, upload } from "../controllers/kb.controller.js";
import { extractTenant, rbacCheck, verifyJWT } from "../middleware/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Absolute path — works locally and on Railway/Render regardless of cwd
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? resolve(__dirname, "../../uploads");

const allowed = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"]);
const uploader = multer({ dest: UPLOAD_DIR, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req: any, file: any, cb: any) => cb(null, allowed.has(file.mimetype) || /\.(txt|md)$/i.test(file.originalname)) });
export const kbRouter = Router();
kbRouter.use(verifyJWT, extractTenant);
kbRouter.post("/upload", rbacCheck("admin", "superadmin"), uploader.single("file"), upload);
kbRouter.get("/documents", listDocuments);
kbRouter.post("/reindex", rbacCheck("admin", "superadmin"), reindex);
kbRouter.get("/documents/:id", getDocument);
kbRouter.delete("/documents/:id", rbacCheck("admin", "superadmin"), deleteDocument);
