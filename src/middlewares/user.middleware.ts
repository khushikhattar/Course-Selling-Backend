import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
let prisma = new PrismaClient();
export interface UserPayload {
  id: number;
  username: string;
  email: string;
}
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      res.status(400).json({ message: "Unauthorized Request" });
      return;
    }
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as UserPayload;
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      omit: {
        password: true,
        refreshToken: true,
      },
    });
    if (!user) {
      res.status(400).json({ message: "Invalid Access Token" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ message: (error as Error)?.message || "Invalid access token" });
    return;
  }
};

export { verifyUser };
