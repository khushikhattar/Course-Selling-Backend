import { Router } from "express";
import {
  addCourse,
  deleteCourse,
  updateCourse,
} from "../controllers/course.controller";
import { verifyAdmin } from "../middlewares/admin.middleware";
import { upload } from "../middlewares/multer.middleware";
const router = Router();
router.route("/").post(verifyAdmin, upload.single("image"), addCourse);
router
  .route("/update")
  .patch(verifyAdmin, upload.single("image"), updateCourse);
router.route("/courses/:id").delete(verifyAdmin, deleteCourse);
export default router;
