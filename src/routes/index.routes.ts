import { Router } from "express";
import userRouter from "./user.routes";
import adminRouter from "./admin.routes";
import courseRouter from "./course.routes";
import paymentRouter from "./payment.routes";
import moduleRouter from "./module.routes";
const router = Router();
router.use("/users", userRouter);
router.use("/admin", adminRouter);
router.use("/courses", courseRouter);
router.use("/payment", paymentRouter);
router.use("/module", moduleRouter);
export default router;
