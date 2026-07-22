import { Router } from "express";
import multerPkg from "multer";
const multer = (multerPkg as any).default ?? multerPkg;
import { deleteDocument, getDocument, listDocuments, reindex, upload } from "../controllers/kb.controller.js";
import { extractTenant, rbacCheck, verifyJWT } from "../middleware/index.js";
import { uploadDir } from "../utils/upload-path.js";
import { env } from "../config/env.js";

const allowed = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"]);
// With the S3 driver, buffer the file in memory and hand the buffer to the
// storage adapter; with the local driver, keep the original on-disk behaviour.
const uploader = multer({
  ...(env.STORAGE_DRIVER === "s3" ? { storage: multer.memoryStorage() } : { dest: uploadDir }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => cb(null, allowed.has(file.mimetype) || /\.(txt|md)$/i.test(file.originalname)),
});
export const kbRouter = Router();
kbRouter.use(verifyJWT, extractTenant);
kbRouter.post("/upload", rbacCheck("admin", "superadmin"), uploader.single("file"), upload);
kbRouter.get("/documents", listDocuments);
kbRouter.post("/reindex", rbacCheck("admin", "superadmin"), reindex);
kbRouter.get("/documents/:id", getDocument);
kbRouter.delete("/documents/:id", rbacCheck("admin", "superadmin"), deleteDocument);
