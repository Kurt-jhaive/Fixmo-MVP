/*
  Warnings:

  - A unique constraint covering the columns `[certificate_number]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_userName]` on the table `ServiceProviderDetails` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userName]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `certificate_number` to the `Certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_password` to the `ServiceProviderDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_userName` to the `ServiceProviderDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `SpecificService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "certificate_number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "provider_password" TEXT NOT NULL,
ADD COLUMN     "provider_userName" TEXT NOT NULL,
ALTER COLUMN "provider_phone_number" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SpecificService" ADD COLUMN     "category_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL,
ALTER COLUMN "phone_number" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "category_id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "CoveredService" (
    "covered_service_id" SERIAL NOT NULL,
    "specific_service_id" INTEGER NOT NULL,
    "certificate_id" INTEGER NOT NULL,

    CONSTRAINT "CoveredService_pkey" PRIMARY KEY ("covered_service_id")
);

-- CreateTable
CREATE TABLE "OTPVerification" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificate_number_key" ON "Certificate"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderDetails_provider_userName_key" ON "ServiceProviderDetails"("provider_userName");

-- CreateIndex
CREATE UNIQUE INDEX "User_userName_key" ON "User"("userName");

-- AddForeignKey
ALTER TABLE "SpecificService" ADD CONSTRAINT "SpecificService_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ServiceCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoveredService" ADD CONSTRAINT "CoveredService_specific_service_id_fkey" FOREIGN KEY ("specific_service_id") REFERENCES "SpecificService"("specific_service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoveredService" ADD CONSTRAINT "CoveredService_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "Certificate"("certificate_id") ON DELETE RESTRICT ON UPDATE CASCADE;
