import dotenv from "dotenv";
import { app } from "./app";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const startServer = async () => {
  const postgresURL = process.env.DATABASE_URL;

  if (!postgresURL) {
    console.error(
      "Prisma Postgres URL is not defined in the environment variables."
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("Connected to Prisma Postgres");
  } catch (err) {
    console.error("Failed to connect to Prisma Postgres", err);
    process.exit(1);
  }
};

startServer();

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
