import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  updatePassword,
  updateAdmin,
  deleteAdmin,
  fetchCourses,
  refreshAccessToken,
} from "../controllers/admin.controller";
import { verifyAdmin } from "../middlewares/admin.middleware";
const router = Router();
router.route("/register").post(registerAdmin);
router.route("/login").post(loginAdmin);
router.route("/logout").post(verifyAdmin, logoutAdmin);
router.route("/update").patch(verifyAdmin, updateAdmin);
router.route("/password").patch(verifyAdmin, updatePassword);
router.route("/courses").get(verifyAdmin, fetchCourses);
router.route("/").delete(verifyAdmin, deleteAdmin);
router.route("/refresh-access-token").post(verifyAdmin, refreshAccessToken);
export default router;
