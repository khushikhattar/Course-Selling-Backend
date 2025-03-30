/*
  Warnings:

  - You are about to drop the column `age` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `age` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profilePicture` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[adminname]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adminname` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profilePicture` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentStatus` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed');

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "age",
DROP COLUMN "name",
DROP COLUMN "phone_number",
ADD COLUMN     "adminname" TEXT NOT NULL,
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "profilePicture" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "published",
ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "age",
DROP COLUMN "phone_number",
DROP COLUMN "profilePicture",
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_adminname_key" ON "Admin"("adminname");
