import { verifyServiceProvider, getUnverifiedServiceProviders,getUnverifiedCustomers } from "../controller/adminController.js"; 
import express from 'express';

const router = express.Router();
// Route to verify a service provider
router.put('/verify-service-provider', verifyServiceProvider);

router.get('/unverified-service-providers', getUnverifiedServiceProviders);

router.get('/unverified-customers', getUnverifiedCustomers);

export default router;