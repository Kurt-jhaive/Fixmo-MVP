-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "availability_isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availability_isBooked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "certificate_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "servicelisting_isActive" BOOLEAN NOT NULL DEFAULT true;
