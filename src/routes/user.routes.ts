import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  updatePassword,
  updateUser,
  deleteUser,
  fetchCourses,
  refreshAccessToken,
} from "../controllers/user.controller";
import { verifyUser } from "../middlewares/user.middleware";
const router = Router();
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyUser, logoutUser);
router.route("/purchased").get(verifyUser, fetchCourses);
router.route("/update").patch(verifyUser, updateUser);
router.route("/password").patch(verifyUser, updatePassword);
router.route("/").delete(verifyUser, deleteUser);
router.route("/refresh-access-token").post(verifyUser, refreshAccessToken);
export default router;
