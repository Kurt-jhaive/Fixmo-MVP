-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "service_picture" TEXT;
