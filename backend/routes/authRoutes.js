import express from "express";
import {
  registerUser,
  authUser,
  getAllUsers,
  updateUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", authUser);
router.get("/users", protect, getAllUsers);

// 🔥 PROFILE UPDATE ROUTE
router.put("/profile", protect, updateUserProfile);

export default router;
