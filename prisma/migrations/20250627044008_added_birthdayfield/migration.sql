/*
  Warnings:

  - You are about to drop the column `actual_price` on the `Appointment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "actual_price",
ADD COLUMN     "final_price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "provider_birthday" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TIMESTAMP(3);
