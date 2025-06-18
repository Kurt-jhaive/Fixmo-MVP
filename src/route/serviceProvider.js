import express from 'express';
import multer from 'multer';
import {
  requestProviderOTP,
  verifyProviderOTPAndRegister,
  providerLogin,
  requestProviderForgotPasswordOTP,
  verifyProviderForgotPasswordOTPAndReset,
  uploadCertificate
} from '../controller/authserviceProviderController.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // configure as needed
const prisma = new PrismaClient();

// Step 1: Service provider requests OTP
router.post('/provider-request-otp', requestProviderOTP);
// Step 2: Service provider verifies OTP and registers
router.post('/provider-verify-register', verifyProviderOTPAndRegister);
// Service provider login
router.post('/provider-login', providerLogin);
// Forgot password: request OTP
router.post('/provider-forgot-password-request-otp', requestProviderForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/provider-forgot-password-verify-otp', verifyProviderForgotPasswordOTPAndReset);
// Upload service provider certificate (with multer)
router.post('/provider/:providerId/upload-certificate', upload.single('certificate_file'), uploadCertificate);
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

router.get('certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany();
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});
export default router;
