import { PrismaClient, Module } from "@prisma/client";
import { z } from "zod";
import { Request, Response } from "express";
const prisma = new PrismaClient();
const addModuleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  adminId: z.number(),
  completions: z.array(
    z.object({
      userId: z.number(),
      moduleId: z.number(),
      isCompleted: z.boolean(),
      completedAt: z.date().optional(),
    })
  ),
});
type addModule = z.infer<typeof addModuleSchema>;
const addModules = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  const parsedData = addModuleSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.send(400).json({
      message: "Validation errors",
      errors: parsedData.error.errors,
    });
    return;
  }
  const { title, description, completions }: addModule = parsedData.data;
  const courseId = parseInt(req.params.courseId);

  if (!courseId) {
    res.status(400).json({ message: "Course ID is required" });
    return;
  }
  const newModule = await prisma.module.create({
    data: {
      title,
      description,
      courseId: courseId,
      adminId: req.admin.id,
      completions: {
        create: completions,
      },
    },
  });
};

const updateModuleSchema = z.object({
  newtitle: z.string(),
  newdescription: z.string().optional(),
});

type updateSchema = z.infer<typeof updateModuleSchema>;
const updateModule = async (req: Request, res: Response) => {
  const parsedData = updateModuleSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.send(400).json({
      message: "Validation errors",
      errors: parsedData.error.errors,
    });
    return;
  }
  const { newtitle, newdescription }: updateSchema = parsedData.data;
  const moduleId = parseInt(req.params.id);

  if (!moduleId) {
    res.status(400).json({ message: "Course ID is required" });
    return;
  }
  const updatedModule = await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: newtitle,
      description: newdescription,
    },
  });
  if (!updatedModule) {
    res.status(404).json({ message: "Module not updated successfully" });
    return;
  }
  res.status(200).json({
    message: "Module updated successfully",
    updatedModule,
  });
};

const deleteModule = async (req: Request, res: Response) => {
  const moduleId = parseInt(req.params.id);
  const deletedModule = await prisma.admin.delete({
    where: { id: moduleId },
  });
  if (!deletedModule) {
    res.status(404).json({ message: "Course not found" });
    return;
  }

  res
    .status(200)
    .json({ message: "Course deleted successfully", deletedModule });
};

const seeAllModules = async (req: Request, res: Response) => {
  if (!req.admin || !req.admin.id) {
    res.status(400).json({ message: "Admin not authenticated" });
    return;
  }
  const courseId = parseInt(req.params.id);
  const allModules: Module[] = await prisma.module.findMany({
    where: {
      AND: [{ courseId: courseId }, { adminId: req.admin.id }],
    },
  });

  if (allModules.length === 0) {
    res.status(404).json({ message: "No modules found" });
    return;
  }

  res.status(200).json({ allModules });
};

const seeModules = async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    res.status(400).json({ message: "User not authenticated" });
    return;
  }
  const courseId = parseInt(req.params.id);
  const allModules: Module[] = await prisma.module.findMany({
    where: {
      AND: [{ courseId: courseId }, { adminId: req.user.id }],
    },
  });

  if (allModules.length === 0) {
    res.status(404).json({ message: "No modules found" });
    return;
  }

  res.status(200).json({ allModules });
};

const updateModuleStatus = async (req: Request, res: Response) => {
  const { isCompleted, completedAt } = req.body;
  const moduleId = parseInt(req.params.id);
  const module = await prisma.userModuleProgress.update({
    where: { id: moduleId },
    data: {
      isCompleted: !isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });
  if (!module) {
    res.status(404).json({ message: "Module not found" });
    return;
  }

  res.status(200).json({
    message: `Module ${
      isCompleted ? "marked as completed" : "marked as incomplete"
    }`,
    module,
  });
};

const userProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      res.status(400).json({ message: "User not authenticated" });
      return;
    }
    const userId = req.user.id;
    const courseId = parseInt(req.params.id);
    const modules = await prisma.module.findMany({
      where: { courseId: courseId },
      include: {
        completions: {
          where: { userId: userId },
        },
      },
    });

    if (!modules || modules.length === 0) {
      res.status(404).json({ message: "No modules found for this course" });
      return;
    }

    const totalModules = modules.length;
    const completedModules = modules.filter((module) =>
      module.completions.some((completion) => completion.isCompleted)
    ).length;
    const progressPercentage = (completedModules / totalModules) * 100;

    const progress = modules.map((module) => ({
      moduleTitle: module.title,
      isCompleted: module.completions.some(
        (completion) => completion.isCompleted
      ),
      completedAt:
        module.completions.find((completion) => completion.isCompleted)
          ?.completedAt || null,
    }));

    res.status(200).json({
      progress,
      completionPercentage: progressPercentage.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user progress",
      error: (error as Error).message,
    });
    return;
  }
};

export {
  addModules,
  deleteModule,
  updateModule,
  seeAllModules,
  updateModuleStatus,
  userProgress,
  seeModules,
};
