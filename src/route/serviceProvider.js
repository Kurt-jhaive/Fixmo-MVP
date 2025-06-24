import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  requestProviderOTP,
  verifyProviderOTPOnly,
  verifyProviderOTPAndRegister,
  providerLogin,
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
// Forgot password: request OTP
router.post('/provider-forgot-password-request-otp', requestProviderForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/provider-forgot-password-verify-otp', verifyProviderForgotPasswordOTPAndReset);
// Simple provider password reset (OTP already verified)
router.post('/provider-reset-password', providerResetPassword);
// Upload service provider certificate (with multer)
router.post('/upload-certificate', upload.single('certificate_file'), uploadCertificate);

// PROTECTED ROUTES - require JWT authentication
router.post('/addListing', authMiddleware, addServiceListing);

//Add Availability to the provider
router.post('/addAvailability', authMiddleware, addAvailability);
// Get availability for a provider
router.get('/provider/:provider_id/availability', getProviderAvailability);
// Get availability for a specific provider and day
router.get('/provider/:provider_id/availability/:dayOfWeek', getProviderDayAvailability);

// Update specific availability
router.put('/availability/:availability_id', authMiddleware, updateAvailability);
// Delete specific availability
router.delete('/availability/:availability_id', authMiddleware, deleteAvailability);

// Protected route to get provider's own profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const provider = await prisma.serviceProviderDetails.findUnique({
      where: { provider_id: req.userId },
      include: {
        certificates: true,
        service_listings: {
          include: {
            category: true
          }
        }
      }
    });
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    res.json(provider);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching provider profile' });
  }
});

// Protected route to get provider's services
router.get('/my-services', authMiddleware, async (req, res) => {
  try {
    const services = await prisma.serviceListing.findMany({
      where: { provider_id: req.userId },
      include: {
        category: true
      }
    });
    
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching provider services' });
  }
});

// Protected route to get provider's certificates
router.get('/my-certificates', authMiddleware, async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { provider_id: req.userId }
    });
    
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching provider certificates' });
  }
});

// Protected route to update a service
router.put('/service/:serviceId', authMiddleware, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { certificate_id, service_name, service_description, price_per_hour, estimated_duration } = req.body;
    
    // First check if the service belongs to the current provider
    const existingService = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(serviceId),
        provider_id: req.userId
      }
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service not found or access denied' });
    }
    
    const updatedService = await prisma.serviceListing.update({
      where: { listing_id: parseInt(serviceId) },
      data: {
        certificate_id: parseInt(certificate_id),
        service_name,
        service_description,
        price_per_hour: parseFloat(price_per_hour),
        estimated_duration: parseFloat(estimated_duration),
        updated_at: new Date()
      },
      include: {
        category: true
      }
    });
    
    res.json({ message: 'Service updated successfully', service: updatedService });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating service' });
  }
});

// Protected route to delete a service
router.delete('/service/:serviceId', authMiddleware, async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // First check if the service belongs to the current provider
    const existingService = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(serviceId),
        provider_id: req.userId
      }
    });
    
    if (!existingService) {
      return res.status(404).json({ message: 'Service not found or access denied' });
    }
    
    await prisma.serviceListing.delete({
      where: { listing_id: parseInt(serviceId) }
    });
    
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting service' });
  }
});

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
