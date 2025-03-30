import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { uploadToCloudinary } from "../utils/cloudinary";
let prisma = new PrismaClient();
const addCourseSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string().optional(),
  imageLink: z.string(),
});
type addSchema = z.infer<typeof addCourseSchema>;
const addCourse = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }

  const parseData = addCourseSchema.safeParse(req.body);
  if (!parseData.success) {
    res
      .status(400)
      .json({ message: "Validation errors", errors: parseData.error.errors });
    return;
  }

  const { title, description, price, category, imageLink }: addSchema =
    parseData.data;
  let finalImageLink: string;

  if (req.file) {
    try {
      finalImageLink = await uploadToCloudinary(req.file.buffer);
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      res.status(500).json({ message: "Failed to upload image" });
      return;
    }
  } else if (imageLink) {
    try {
      new URL(imageLink);
      finalImageLink = imageLink;
    } catch (error) {
      console.error("Invalid image link:", error);
      res.status(400).json({ message: "Invalid image link" });
      return;
    }
  } else {
    res.status(400).json({ message: "Image file or link is required" });
    return;
  }

  try {
    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        price,
        category,
        ownerId: req.admin.id,
        imageLink: finalImageLink,
      },
    });

    const updatedAdmin = await prisma.admin.update({
      where: { id: req.admin.id },
      data: {
        coursesCreated: {
          connect: { id: newCourse.id },
        },
      },
    });

    if (!updatedAdmin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    res.status(201).json({ message: "Course added successfully", newCourse });
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};
const updateCourseSchema = z.object({
  newtitle: z.string(),
  newdescription: z.string(),
  newprice: z.number(),
  newcategory: z.string().optional(),
  newimage: z.string(),
});

type updateSchema = z.infer<typeof updateCourseSchema>;

const updateCourse = async (req: Request, res: Response) => {
  const parseData = updateCourseSchema.safeParse(req.body);

  if (!parseData.success) {
    res
      .status(400)
      .json({ message: "Validation errors", errors: parseData.error.errors });
    return;
  }

  const {
    newtitle,
    newdescription,
    newprice,
    newcategory,
    newimage,
  }: updateSchema = parseData.data;
  let imageLink: string = "";

  if (req.file) {
    try {
      imageLink = await uploadToCloudinary(req.file.buffer);
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      res.status(500).json({ message: "Failed to upload image" });
      return;
    }
  } else if (newimage) {
    try {
      new URL(newimage);
      imageLink = newimage;
    } catch (error) {
      console.error("Invalid image link:", error);
      res.status(400).json({ message: "Invalid image link" });
      return;
    }
  }

  const courseId = parseInt(req.params.id);

  try {
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: newtitle,
        description: newdescription,
        price: newprice,
        category: newcategory,
        imageLink,
      },
    });

    if (!req.admin || !req.admin.id) {
      res.status(400).json({ message: "Admin not authenticated" });
      return;
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: req.admin.id },
      data: {
        coursesCreated: {
          connect: { id: updatedCourse.id },
        },
      },
    });

    if (!updatedAdmin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    res.status(200).json({
      message: "Course updated successfully",
      updatedCourse,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

const deleteCourse = async (req: Request, res: Response) => {
  const courseId = parseInt(req.params.id);
  const deletedCourse = await prisma.course.delete({
    where: { id: courseId },
  });
  if (!deletedCourse) {
    res.status(404).json({ message: "Course not found" });
    return;
  }

  res
    .status(200)
    .json({ message: "Course deleted successfully", deletedCourse });
};

export { addCourse, deleteCourse, updateCourse };
