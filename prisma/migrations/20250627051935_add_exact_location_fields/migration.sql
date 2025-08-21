-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "provider_exact_location" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "exact_location" TEXT;
