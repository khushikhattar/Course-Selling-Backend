import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getAdminPayments,
  getPaymentStatus,
  getUserPayments,
} from "../controllers/payment.controller";
import { verifyUser } from "../middlewares/user.middleware";
import { verifyAdmin } from "../middlewares/admin.middleware";
const router = Router();

router.post("/payments/order/:userid/:courseid", createOrder);
router.post("/payments/verify", verifyPayment);
router.get("/payments/status/:id", getPaymentStatus);
router.get("/payments/user", verifyUser, getUserPayments);
router.get("/payments/admin", verifyAdmin, getAdminPayments);

export default router;
