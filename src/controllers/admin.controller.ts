import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { Request, Response } from "express";
import { genAccessToken, genRefreshToken } from "../helpers/helper2";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
let prisma = new PrismaClient();

const generateAccessAndRefreshTokens = async (adminId: number) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) {
      throw new Error("Admin does not exist");
    }
    const accessToken = genAccessToken(admin);
    const refreshToken = genRefreshToken(admin);
    await prisma.admin.update({
      where: { id: adminId },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(`Error generating tokens: ${(error as Error).message}`);
  }
};

const registerSchema = z
  .object({
    adminname: z.string().min(1, "Admin name is required"),
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

const registerAdmin = async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ message: "Validation errors", errors: parseResult.error.errors });
    return;
  }

  const { adminname, email, address, password, contact }: registerPayload =
    parseResult.data;
  const existedAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ adminname }, { email }],
    },
  });
  if (existedAdmin) {
    res
      .status(409)
      .json({ message: "Admin with email or admin name already exists" });
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 16);
  const createdAdmin = await prisma.admin.create({
    data: {
      adminname,
      email,
      password: hashedPassword,
      contact,
      address,
      refreshToken: "",
    },
  });
  if (!createdAdmin) {
    res.status(500).json({ message: "Error creating the admin" });
    return;
  }
  res.status(201).json({ message: "Admin registered successfully" });
};

const loginSchema = z.object({
  adminname: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, "Password is required"),
});

type loginPayload = z.infer<typeof loginSchema>;

const loginAdmin = async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ message: "Validation errors", errors: parseResult.error.errors });
    return;
  }
  const { adminname, email, password }: loginPayload = parseResult.data;
  const existedAdmin = await prisma.admin.findFirst({
    where: {
      OR: [
        { adminname: adminname || undefined },
        { email: email || undefined },
      ],
    },
  });

  if (!existedAdmin) {
    res.status(404).json({ message: "Admin does not exist" });
    return;
  }
  const isPasswordCorrect = await bcrypt.compare(
    password,
    existedAdmin.password
  );
  if (!isPasswordCorrect) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existedAdmin.id
  );
  await prisma.admin.update({
    where: { id: existedAdmin.id },
    data: { refreshToken },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "Admin logged in successfully",
      admin: {
        id: existedAdmin.id,
        adminname: existedAdmin.adminname,
        email: existedAdmin.email,
      },
      token: accessToken,
    });
};

const logoutAdmin = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  try {
    await prisma.admin.update({
      where: { id: req.admin.id },
      data: { refreshToken: "" },
    });
    const options = { httpOnly: true, secure: true };
    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({ message: "Admin logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out admin" });
  }
};

const updateAdminSchema = z.object({
  newadminname: z.string().optional(),
  newemail: z.string().optional(),
  newcontact: z.string().optional(),
  newaddress: z.string().optional(),
});

type updateAdminPayload = z.infer<typeof updateAdminSchema>;

const updateAdmin = async (req: Request, res: Response) => {
  const parseResult = updateAdminSchema.safeParse(req.body);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ message: "Validation errors", errors: parseResult.error.errors });
    return;
  }
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
  });
  if (!admin) {
    res.status(404).json({ message: "Admin not found" });
    return;
  }
  const { newadminname, newemail, newcontact, newaddress }: updateAdminPayload =
    parseResult.data;
  await prisma.admin.update({
    where: { id: req.admin.id },
    data: {
      adminname: newadminname,
      email: newemail,
      contact: newcontact,
      address: newaddress,
    },
  });

  res.status(200).json({ message: "Admin updated successfully" });
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
  const parseResult = updatePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      message: "Validation errors",
      errors: parseResult.error.errors,
    });
    return;
  }
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
  });
  if (!admin) {
    res.status(404).json({ message: "Admin not found" });
    return;
  }
  const { oldpassword, newpassword }: updatePasswordPayload = parseResult.data;
  const isPasswordCorrect = await bcrypt.compare(oldpassword, admin.password);
  if (!isPasswordCorrect) {
    res.status(400).json({ message: "Invalid password" });
    return;
  }
  const hashedNewPassword = await bcrypt.hash(newpassword, 16);
  await prisma.admin.update({
    where: { id: req.admin.id },
    data: { password: hashedNewPassword },
  });
  res.status(200).json({ message: "Password successfully updated" });
};

const deleteAdmin = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  const deletedadmin = await prisma.admin.delete({
    where: { id: req.admin.id },
  });
  if (!deletedadmin) {
    res.status(404).json({ message: "Error occured in deleting the admin" });
    return;
  }
  res.status(200).json({ message: "Admin deleted successfully" });
};

const fetchCourses = async (req: Request, res: Response) => {
  try {
    if (!req.admin || !req.admin.id) {
      res.status(400).json({ message: "Admin not authenticated" });
      return;
    }
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      include: { coursesCreated: true },
    });
    if (!admin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    res.status(200).json({ coursesPurchased: admin.coursesCreated || [] });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching courses",
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
    const admin = req.admin;
    if (!admin) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    const dbAdmin = await prisma.admin.findUnique({
      where: { id: decodedToken.id },
      select: { refreshToken: true },
    });

    if (!dbAdmin || incomingreftoken !== dbAdmin.refreshToken) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      admin.id
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
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  updatePassword,
  updateAdmin,
  deleteAdmin,
  fetchCourses,
  refreshAccessToken,
};
