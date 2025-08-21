-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "provider_isActivated" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_activated" BOOLEAN NOT NULL DEFAULT true;
