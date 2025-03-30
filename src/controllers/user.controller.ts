import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { Request, Response } from "express";
import { genAccessToken, genRefreshToken } from "../helpers/helper1";
import jwt from "jsonwebtoken";

import bcrypt from "bcryptjs";

let prisma = new PrismaClient();

const generateAccessAndRefreshTokens = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User does not exist");
    }
    const accessToken = genAccessToken(user);
    const refreshToken = genRefreshToken(user);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(`Error generating tokens: ${(error as Error).message}`);
  }
};

const registerSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Invalid email address"),
    contact: z
      .string()
      .length(10, { message: "Contact Number must be 10 digits long" }),
    password: z.string().min(8, "Password is required"),
    confirmPassword: z.string().min(8, "Confirm Password is required"),
    address: z.string({ required_error: "Address is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type registerPayload = z.infer<typeof registerSchema>;

const registerUser = async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: "Validation errors",
        errors: parseResult.error.errors,
      });
      return;
    }

    const { username, email, address, password, contact }: registerPayload =
      parseResult.data;
    const existedUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });
    if (existedUser) {
      res.status(409).json({
        message: "User with email or username already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 16);
    const createdUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        contact,
        address,
        refreshToken: "",
      },
    });

    if (!createdUser) {
      res.status(500).json({ message: "Error creating the user" });
      return;
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, "Password is required"),
});

type loginPayload = z.infer<typeof loginSchema>;

const loginUser = async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: "Validation errors",
        errors: parseResult.error.errors,
      });
      return;
    }
    const { username, email, password }: loginPayload = parseResult.data;
    const existedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username || undefined },
          { email: email || undefined },
        ],
      },
    });

    if (!existedUser) {
      res.status(404).json({ message: "User does not exist" });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existedUser.password
    );
    if (!isPasswordCorrect) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      existedUser.id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "User Logged In Successfully",
        user: {
          id: existedUser.id,
          username: existedUser.username,
          email: existedUser.email,
        },
        token: accessToken,
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const logoutUser = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: "" },
    });

    const options = { httpOnly: true, secure: true };
    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out user" });
  }
};

const updateUserSchema = z.object({
  newusername: z.string().optional(),
  newemail: z.string().optional(),
  newcontact: z.string().optional(),
  newaddress: z.string().optional(),
});

type updateUserPayload = z.infer<typeof updateUserSchema>;

const updateUser = async (req: Request, res: Response) => {
  try {
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: "Validation errors",
        errors: parseResult.error.errors,
      });
      return;
    }
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { newusername, newemail, newcontact, newaddress }: updateUserPayload =
      parseResult.data;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username: newusername,
        email: newemail,
        contact: newcontact,
        address: newaddress,
      },
    });

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatePasswordSchema = z
  .object({
    oldpassword: z.string().min(8, "Old password is required"),
    newpassword: z.string().min(8, "New password is required"),
    confirmnewpassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newpassword === data.confirmnewpassword, {
    message: "Passwords do not match",
    path: ["confirmnewpassword"],
  });

type updatePasswordPayload = z.infer<typeof updatePasswordSchema>;

const updatePassword = async (req: Request, res: Response) => {
  try {
    const parseResult = updatePasswordSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        message: "Validation errors",
        errors: parseResult.error.errors,
      });
      return;
    }
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const { oldpassword, newpassword }: updatePasswordPayload =
      parseResult.data;
    const isPasswordCorrect = await bcrypt.compare(oldpassword, user.password);
    if (!isPasswordCorrect) {
      res.status(400).json({ message: "Invalid password" });
      return;
    }
    const hashednewPassword = await bcrypt.hash(newpassword, 16);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashednewPassword },
    });
    res.status(200).json({ message: "Password successfully updated" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const deletedUser = await prisma.user.delete({
      where: { id: req.user.id },
    });
    if (!deletedUser) {
      res.status(404).json({ message: "Error occurred in deleting the user" });
      return;
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchCourses = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        coursesPurchased: {
          where: {
            payments: {
              some: {
                paymentStatus: "success",
              },
            },
          },
        },
      },
    });

    if (!user || user.coursesPurchased.length === 0) {
      res.status(404).json({ message: "No purchased courses found" });
      return;
    }
    res.status(200).json({ courses: user.coursesPurchased });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching purchased courses",
      error: (error as Error).message,
    });
  }
};

const refreshAccessToken = async (req: Request, res: Response) => {
  const incomingreftoken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingreftoken) {
    res.status(400).json({ message: "Unauthorized request" });
    return;
  }

  try {
    const decodedToken = jwt.verify(
      incomingreftoken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: number };
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      select: { refreshToken: true },
    });

    if (!dbUser || incomingreftoken !== dbUser.refreshToken) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id
    );
    const options = { httpOnly: true, secure: true };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({ message: "Access token refreshed successfully" });
  } catch (error) {
    res.status(401).json({
      message: "Invalid refresh token",
      error: (error as Error).message,
    });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  updatePassword,
  updateUser,
  deleteUser,
  fetchCourses,
  refreshAccessToken,
};
