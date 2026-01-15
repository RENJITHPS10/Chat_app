import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store uploaded files in backend/uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const upload = multer({ storage });

router.post("/", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🔴 IMPORTANT: build FULL URL so frontend can load from correct host:port
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    const mime = req.file.mimetype || "";
    const fileType = mime.startsWith("image/") ? "image" : "file";

    return res.json({ url: fileUrl, fileType });
  } catch (error) {
    console.error("upload error:", error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
