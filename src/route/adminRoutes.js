const express = require('express');
const adminController = require('../controller/adminControllerNew');

const router = express.Router();

// Admin Authentication Routes
router.post('/login', adminController.adminLogin);
router.post('/logout', adminController.adminLogout);

// Dashboard Routes
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/recent-activity', adminController.getRecentActivity);

// User Management Routes
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/verify', adminController.verifyUser);
router.put('/users/:userId/activate', adminController.activateUser);
router.put('/users/:userId/deactivate', adminController.deactivateUser);

// Provider Management Routes
router.get('/providers', adminController.getProviders);
router.get('/providers/:providerId', adminController.getProviderById);
router.put('/providers/:providerId/verify', adminController.verifyProvider);
router.put('/providers/:providerId/activate', adminController.activateProvider);
router.put('/providers/:providerId/deactivate', adminController.deactivateProvider);

// Certificate Management Routes
router.get('/certificates', adminController.getCertificates);
router.get('/certificates/:certificateId', adminController.getCertificateById);
router.put('/certificates/:certificateId/approve', adminController.approveCertificate);
router.put('/certificates/:certificateId/reject', adminController.rejectCertificate);

// Booking Management Routes
router.get('/bookings', adminController.getBookings);

// Legacy Routes - for backward compatibility
router.post('/verify-service-provider', adminController.verifyServiceProvider);
router.post('/verify-customer', adminController.verifyCustomer);
router.get('/unverified-service-providers', adminController.getUnverifiedServiceProviders);
router.get('/unverified-customers', adminController.getUnverifiedCustomers);

module.exports = router;
