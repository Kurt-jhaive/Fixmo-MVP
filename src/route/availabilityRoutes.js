import express from 'express';
import AvailabilityController from '../controller/availabilityController.js';
import { requireAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth('provider'));

// GET /api/availability - Get provider's availability
router.get('/', AvailabilityController.getProviderAvailability);

// POST /api/availability - Set/Update provider's availability
router.post('/', AvailabilityController.setProviderAvailability);

// DELETE /api/availability/:availabilityId - Delete specific availability
router.delete('/:availabilityId', AvailabilityController.deleteAvailability);

// GET /api/availability/summary - Get availability summary
router.get('/summary', AvailabilityController.getAvailabilitySummary);

export default router;
