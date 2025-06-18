-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" INTEGER NOT NULL,
    "profile_photo" TEXT,
    "valid_id" TEXT,
    "user_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ServiceProviderDetails" (
    "provider_id" SERIAL NOT NULL,
    "provider_first_name" TEXT NOT NULL,
    "provider_last_name" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "provider_phone_number" INTEGER NOT NULL,
    "provider_profile_photo" TEXT,
    "provider_valid_id" TEXT,
    "provider_isVerified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "provider_location" TEXT,
    "provider_uli" TEXT NOT NULL,

    CONSTRAINT "ServiceProviderDetails_pkey" PRIMARY KEY ("provider_id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "certificate_id" SERIAL NOT NULL,
    "certificate_name" TEXT NOT NULL,
    "certificate_file_path" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "provider_id" INTEGER NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("certificate_id")
);

-- CreateTable
CREATE TABLE "ServiceListing" (
    "service_id" SERIAL NOT NULL,
    "service_title" TEXT NOT NULL,
    "service_description" TEXT NOT NULL,
    "service_startingprice" DOUBLE PRECISION NOT NULL,
    "provider_id" INTEGER NOT NULL,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "SpecificService" (
    "specific_service_id" SERIAL NOT NULL,
    "specific_service_title" TEXT NOT NULL,
    "specific_service_description" TEXT NOT NULL,
    "service_id" INTEGER NOT NULL,

    CONSTRAINT "SpecificService_pkey" PRIMARY KEY ("specific_service_id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "availability_id" SERIAL NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "provider_id" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "appointment_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "appointment_status" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "actual_price" DOUBLE PRECISION,
    "repairDescription" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "rating_value" INTEGER NOT NULL,
    "rating_comment" TEXT,
    "appointment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_number_key" ON "User"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderDetails_provider_email_key" ON "ServiceProviderDetails"("provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderDetails_provider_phone_number_key" ON "ServiceProviderDetails"("provider_phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderDetails_provider_uli_key" ON "ServiceProviderDetails"("provider_uli");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificService" ADD CONSTRAINT "SpecificService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "ServiceListing"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;
