import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import { Response, Request } from "express";
import crypto from "crypto";

const prisma = new PrismaClient();
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userid);
  const courseId = parseInt(req.params.courseid);

  if (!courseId || !userId) {
    res.status(400).json({
      success: false,
      message: "Course ID and User ID are required",
    });
    return;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { price: true, ownerId: true },
  });

  if (!course || !course.price) {
    res.status(404).json({
      success: false,
      message: "Course not found or price unavailable",
    });
    return;
  }

  const options = {
    amount: course.price * 100,
    currency: "INR",
    receipt: `receipt_${courseId}_${Date.now()}`,
  };

  try {
    razorpayInstance.orders.create(options, async (err, order) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: "Error creating Razorpay order",
        });
        return;
      }
      await prisma.payment.create({
        data: {
          amount: course.price,
          date: new Date(),
          courseId,
          userId,
          adminId: course.ownerId,
          paymentStatus: "pending",
          razorpayOrderId: order.id,
        },
      });

      res.status(200).json({ success: true, order });
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: (error as Error).message,
    });
    return;
  }
};
const verifyPayment = async (req: Request, res: Response) => {
  const { order_id, payment_id, signature, courseId, userId } = req.body;

  if (!order_id || !payment_id || !signature || !courseId || !userId) {
    res.status(400).json({
      success: false,
      message: "Invalid payment details: Missing required fields",
    });
    return;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    res.status(500).json({
      success: false,
      message: "Razorpay secret key is not configured",
    });
    return;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(order_id + "|" + payment_id);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature !== signature) {
    res.status(400).json({
      success: false,
      message: "Payment verification failed: Invalid signature",
    });
    return;
  }

  try {
    const payment = await razorpayInstance.payments.fetch(payment_id);

    if (payment.status !== "captured") {
      res.status(400).json({
        success: false,
        message: "Payment not captured",
      });
      return;
    }

    await prisma.payment.updateMany({
      where: { razorpayOrderId: order_id, paymentStatus: "pending" },
      data: { paymentStatus: "success", razorpayPaymentId: payment_id },
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
    return;
  }
};

const getPaymentStatus = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);

  if (!paymentId) {
    res.status(400).json({
      success: false,
      message: "Payment ID is required",
    });
    return;
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        course: true,
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment not found",
      });
      return;
    }

    if (req.user && req.user.id) {
      const userId = req.user.id;
      if (payment.userId !== userId) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to payment details",
        });
        return;
      }
      res.status(200).json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          paymentStatus: payment.paymentStatus,
          date: payment.date,
          course: payment.course,
        },
      });
    }

    if (req.admin && req.admin.id) {
      const adminId = req.admin.id;
      const course = await prisma.course.findUnique({
        where: { id: payment.courseId },
        select: { ownerId: true },
      });

      if (!course || course.ownerId !== adminId) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to payment details",
        });
        return;
      }
      res.status(200).json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          paymentStatus: payment.paymentStatus,
          date: payment.date,
          user: payment.user,
          course: payment.course,
        },
      });
      return;
    }

    res.status(401).json({ success: false, message: "Unauthorized" });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
    return;
  }
};

const getUserPayments = async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(400).json({ message: "User not authenticated" });
    return;
  }
  const userId = req.user.id;

  const payments = await prisma.payment.findMany({
    where: { userId },
    select: {
      id: true,
      amount: true,
      paymentStatus: true,
      course: true,
      date: true,
    },
  });

  res.status(200).json({ success: true, payments });
};

const getAdminPayments = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  const adminId = req.admin.id;

  const payments = await prisma.payment.findMany({
    where: { adminId },
    select: {
      id: true,
      amount: true,
      paymentStatus: true,
      course: true,
      date: true,
    },
  });

  res.status(200).json({ success: true, payments });
};

export {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getUserPayments,
  getAdminPayments,
};
