import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  login,
  requestOTP,
  verifyOTPAndRegister,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTPAndReset,
  addAppointment,
  getServiceListings,
  getServiceListingDetails,
  getCustomerAppointments,
  cancelAppointment,
  addRatetoProvider
} from '../controller/authCustomerController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg and .jpeg files are allowed!'));
  }
};
const upload = multer({ storage, fileFilter });

router.post('/login', login);
router.post('/request-otp', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), requestOTP);               // Step 1: Send OTP with file upload
router.post('/verify-register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), verifyOTPAndRegister); // Step 2: Validate OTP + register with file upload
// Forgot password: request OTP
router.post('/forgot-password-request-otp', requestForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/forgot-password-verify-otp', verifyForgotPasswordOTPAndReset);

// Customer appointment routes
// Book a new appointment
router.post('/book-appointment', addAppointment);
// Get all service listings (marketplace)
router.get('/service-listings', getServiceListings);
// Get specific service listing details
router.get('/service-listing/:service_id', getServiceListingDetails);
// Get customer's appointments
router.get('/customer/:customer_id/appointments', getCustomerAppointments);
// Cancel appointment
router.put('/cancel-appointment/:appointment_id', cancelAppointment);
// Submit rating for service provider
router.post('/rate-provider', addRatetoProvider);

export default router;

