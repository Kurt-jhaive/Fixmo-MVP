import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  login,
  requestOTP,
  verifyOTPOnly,
  verifyOTPAndRegister,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTPAndReset,
  resetPassword,
  addAppointment,
  getServiceListings,
  getServiceListingDetails,
  getCustomerAppointments,
  cancelAppointment,
  addRatetoProvider,
  resetPasswordOnly,
  getUserProfile,
  updateVerificationDocuments,
  getServiceListingsForCustomer,
  getServiceCategories,
  getCustomerStats
} from '../controller/authCustomerController.js';

const router = express.Router();

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create necessary directories
ensureDirectoryExists('uploads/customer-profiles');
ensureDirectoryExists('uploads/customer-ids');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    switch (file.fieldname) {
      case 'profile_photo':
        uploadPath += 'customer-profiles/';
        break;
      case 'valid_id':
        uploadPath += 'customer-ids/';
        break;
      default:
        uploadPath += 'general/';
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('Customer file filter check:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  // Only accept image files for customer uploads
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`${file.fieldname} must be an image file (JPG, PNG, GIF, etc.)`), false);
  }
};
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 2 // Maximum 2 files (1 profile + 1 ID)
  }
});

router.post('/login', login);
router.post('/request-otp', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), requestOTP);               // Step 1: Send OTP with file upload
router.post('/verify-otp', verifyOTPOnly);  // Step 1.5: Verify OTP only (for registration flow)
router.post('/verify-register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), verifyOTPAndRegister); // Step 2: Validate OTP + register with file upload
// Forgot password: request OTP
router.post('/forgot-password-request-otp', requestForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/forgot-password-verify-otp', verifyForgotPasswordOTPAndReset);
// Simple password reset (OTP already verified)
router.post('/reset-password', resetPassword);
// Simple password reset (OTP already verified)
router.post('/reset-password-only', resetPasswordOnly);
// Get user profile and verification status
router.get('/user-profile/:userId', getUserProfile);
// Update verification documents
router.post('/update-verification-documents', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'validId', maxCount: 1 }
]), updateVerificationDocuments);
// Get service listings for customer dashboard
router.get('/service-listings', getServiceListingsForCustomer);
// Get service categories
router.get('/service-categories', getServiceCategories);
// Get customer statistics
router.get('/customer-stats/:userId', getCustomerStats);

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

