/*
  Warnings:

  - You are about to drop the column `availability_isBooked` on the `Availability` table. All the data in the column will be lost.
  - Added the required column `availability_id` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "availability_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "availability_isBooked";

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "Availability"("availability_id") ON DELETE RESTRICT ON UPDATE CASCADE;
