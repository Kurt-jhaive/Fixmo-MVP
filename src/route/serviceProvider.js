import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireProviderSession, requireAuth } from '../middleware/sessionAuth.js';
import {
  requestProviderOTP,
  verifyProviderOTPOnly,
  verifyProviderOTPAndRegister,
  providerLogin,
  providerLogout,
  requestProviderForgotPasswordOTP,
  verifyProviderForgotPasswordOTPAndReset,
  providerResetPassword,
  uploadCertificate,
  addServiceListing,
  addAvailability,
  getProviderAvailability,
  updateAvailability,
  deleteAvailability,
  getProviderDayAvailability,
  getProviderProfile,
  updateProviderProfile,
  getProviderStats,
  getProviderServices,
  getProviderBookings,
  getProviderActivity

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
// Step 1.5: Service provider verifies OTP only (for registration flow)
router.post('/provider-verify-otp', verifyProviderOTPOnly);
// Step 2: Service provider verifies OTP and registers
router.post('/provider-verify-register', registrationUpload, verifyProviderOTPAndRegister);
// Service provider login
router.post('/provider-login', providerLogin);
router.post('/loginProvider', providerLogin);
// Service provider logout
router.post('/provider-logout', providerLogout);
router.post('/logout', providerLogout);
// Forgot password: request OTP
router.post('/provider-forgot-password-request-otp', requestProviderForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/provider-forgot-password-verify-otp', verifyProviderForgotPasswordOTPAndReset);
// Simple provider password reset (OTP already verified)
router.post('/provider-reset-password', providerResetPassword);
// Upload service provider certificate (with multer)
router.post('/upload-certificate', requireAuth('provider'), upload.single('certificate_file'), uploadCertificate);

// PROTECTED ROUTES - require session/JWT authentication
router.post('/addListing', requireAuth('provider'), addServiceListing);

//Add Availability to the provider
router.post('/addAvailability', requireAuth('provider'), addAvailability);
// Get availability for a provider
router.get('/provider/:provider_id/availability', getProviderAvailability);
// Get availability for a specific provider and day
router.get('/provider/:provider_id/availability/:dayOfWeek', getProviderDayAvailability);

// Update specific availability
router.put('/availability/:availability_id', requireAuth('provider'), updateAvailability);
// Delete specific availability
router.delete('/availability/:availability_id', requireAuth('provider'), deleteAvailability);

// Protected route to get provider's own profile
router.get('/profile', requireAuth('provider'), getProviderProfile);
// Protected route to update provider profile
router.put('/profile', requireAuth('provider'), updateProviderProfile);
// Protected route to get provider stats
router.get('/stats', requireAuth('provider'), getProviderStats);
// Protected route to get provider's services
router.get('/my-services', requireAuth('provider'), getProviderServices);
// Protected route to get provider's bookings
router.get('/my-bookings', requireAuth('provider'), getProviderBookings);
// Protected route to get provider activity
router.get('/activity', requireAuth('provider'), getProviderActivity);


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

// Provider dashboard endpoints
router.get('/profile/:provider_id', getProviderProfile);
router.put('/profile/:provider_id', updateProviderProfile);
router.get('/stats/:provider_id', getProviderStats);
router.get('/services/:provider_id', getProviderServices);
router.get('/bookings/:provider_id', getProviderBookings);
router.get('/activity/:provider_id', getProviderActivity);

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
