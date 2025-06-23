import express from 'express';
import multer from 'multer';
import {
  requestProviderOTP,
  verifyProviderOTPAndRegister,
  providerLogin,
  requestProviderForgotPasswordOTP,
  verifyProviderForgotPasswordOTPAndReset,
  uploadCertificate,
  addServiceListing,
  addAvailability,
  getProviderAvailability,
  updateAvailability,
  deleteAvailability,
  getProviderDayAvailability,

} from '../controller/authserviceProviderController.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // configure as needed

// Create a specialized upload middleware for registration with multiple files
const registrationUpload = multer({ dest: 'uploads/' }).fields([
  { name: 'provider_profile_photo', maxCount: 1 },
  { name: 'provider_valid_id', maxCount: 1 },
  { name: 'certificateFile', maxCount: 10 } // Allow up to 10 certificates
]);

const prisma = new PrismaClient();

// Step 1: Service provider requests OTP
router.post('/provider-request-otp', requestProviderOTP);
// Step 2: Service provider verifies OTP and registers
router.post('/provider-verify-register', registrationUpload, verifyProviderOTPAndRegister);
// Service provider login
router.post('/provider-login', providerLogin);
router.post('/loginProvider', providerLogin);
// Forgot password: request OTP
router.post('/provider-forgot-password-request-otp', requestProviderForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/provider-forgot-password-verify-otp', verifyProviderForgotPasswordOTPAndReset);
// Upload service provider certificate (with multer)
router.post('/upload-certificate', upload.single('certificate_file'), uploadCertificate);

router.post('/addListing', addServiceListing);

//Add Availability to the provider
router.post('/addAvailability', addAvailability);
// Get availability for a provider
router.get('/provider/:provider_id/availability', getProviderAvailability);
// Get availability for a specific provider and day
router.get('/provider/:provider_id/availability/:dayOfWeek', getProviderDayAvailability);
// Get suggested time slots for a provider and day

// Update specific availability
router.put('/availability/:availability_id', updateAvailability);
// Delete specific availability
router.delete('/availability/:availability_id', deleteAvailability);


// Get all service providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await prisma.serviceProviderDetails.findMany();
    res.json(providers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching providers' });
  }
});

router.get('/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany();
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});
export default router;
