import express from 'express';
import { 
    getProviderCertificates, 
    uploadCertificate, 
    deleteCertificate, 
    updateCertificateStatus, 
    getCertificateById,
    upload 
} from '../controller/certificateController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', getProviderCertificates);
router.get('/valid-types', (req, res) => {
    // Return predefined certificate types
    const certificateTypes = [
        'Electrical Technician Certificate',
        'Plumbing License',
        'HVAC Certification',
        'Carpentry Certificate',
        'Appliance Repair Certification',
        'Safety Training Certificate',
        'Trade School Diploma',
        'Professional License',
        'Welding Certification',
        'Electronics Repair Certification'
    ];
    res.json(certificateTypes);
});
router.get('/:certificateId', getCertificateById);
router.post('/upload', upload.single('certificateFile'), uploadCertificate);
router.delete('/:certificateId', deleteCertificate);
router.patch('/:certificateId/status', updateCertificateStatus); // Admin only

export default router;
