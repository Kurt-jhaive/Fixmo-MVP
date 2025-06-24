import express from 'express';
import { requireAuth } from '../middleware/sessionAuth.js';
import {
    getProviderServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    toggleServiceAvailability,
    getServiceCategories,
    getProviderCertificates,
    getCertificateServices
} from '../controller/serviceController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/categories', getServiceCategories);
router.get('/certificate-services', getCertificateServices);

// Protected routes requiring provider authentication
router.use(requireAuth('provider'));

// Service management routes
router.get('/services', getProviderServices);
router.get('/services/:serviceId', getServiceById);
router.post('/services', createService);
router.put('/services/:serviceId', updateService);
router.delete('/services/:serviceId', deleteService);
router.patch('/services/:serviceId/toggle', toggleServiceAvailability);

// Provider-specific routes
router.get('/certificates', getProviderCertificates);

export default router;
