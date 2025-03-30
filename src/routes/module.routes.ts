import { Router } from "express";
import {
  addModules,
  deleteModule,
  updateModule,
  seeAllModules,
  updateModuleStatus,
  userProgress,
  seeModules,
} from "../controllers/modules.controller";
import { verifyAdmin } from "../middlewares/admin.middleware";
import { verifyUser } from "../middlewares/user.middleware";
const router = Router();
router.route("/course/:id").post(verifyAdmin, addModules);
router.route("/course/:id").patch(verifyAdmin, updateModule);
router.route("/module/:id").delete(verifyAdmin, deleteModule);
router.route("/course/:id").get(verifyAdmin, seeAllModules);
router.route("/module/:id").patch(verifyUser, updateModuleStatus);
router.route("/progress/course/:id").get(verifyUser, userProgress);
router.route("/course/:id").get(verifyUser, seeModules);

export default router;
