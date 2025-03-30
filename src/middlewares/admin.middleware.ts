import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
let prisma = new PrismaClient();
interface AdminPayload {
  id: number;
  adminname: string;
  email: string;
}
declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}
export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ message: "Unauthorized Request" });
      return;
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ADMIN_ACCESS_TOKEN_SECRET!
    ) as AdminPayload;

    const admin = await prisma.admin.findUnique({
      where: { id: decodedToken.id },
      omit: {
        password: true,
        refreshToken: true,
      },
    });

    if (!admin) {
      res.status(401).json({ message: "Invalid Access Token" });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Error in verifyAdmin middleware:", error); // Log the error
    res
      .status(401)
      .json({ message: (error as Error)?.message || "Invalid access token" });
    return;
  }
};
