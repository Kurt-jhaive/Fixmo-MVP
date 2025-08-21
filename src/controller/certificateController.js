import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'certificates');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const providerId = req.userId;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `cert_${providerId}_${timestamp}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow images and documents for certificates
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPG, PNG, GIF) and documents (PDF, DOC, DOCX) are allowed for certificates.'), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Get all certificates for the authenticated provider
export const getProviderCertificates = async (req, res) => {
    try {
        const providerId = req.userId;

        const certificates = await prisma.certificate.findMany({
            where: { provider_id: providerId },
            select: {
                certificate_id: true,
                certificate_name: true,
                certificate_number: true,
                certificate_file_path: true,
                certificate_status: true,
                expiry_date: true,
                created_at: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            data: certificates,
            count: certificates.length
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificates'
        });
    }
};

// Upload a new certificate
export const uploadCertificate = async (req, res) => {
    try {
        const providerId = req.userId;
        const {
            certificateSelect: certificateName,
            certificateNumber,
            expiryDate
        } = req.body;

        // Validate required fields
        if (!certificateName || !certificateNumber) {
            return res.status(400).json({
                success: false,
                message: 'Certificate name and number are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Certificate file is required'
            });
        }

        // Check for duplicates
        // 1. Check if certificate number already exists
        const existingCertNumber = await prisma.certificate.findUnique({
            where: { certificate_number: certificateNumber }
        });

        if (existingCertNumber) {
            // Delete uploaded file if certificate number already exists
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
            
            return res.status(400).json({
                success: false,
                message: 'Certificate number already exists. Each certificate must have a unique number.'
            });
        }

        // 2. Check if provider already has this certificate type
        const existingCertType = await prisma.certificate.findFirst({
            where: { 
                certificate_name: certificateName,
                provider_id: providerId
            }
        });

        if (existingCertType) {
            // Delete uploaded file if certificate type already exists for this provider
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
            
            return res.status(400).json({
                success: false,
                message: `You already have a "${certificateName}" certificate. You cannot upload duplicate certificate types.`
            });
        }

        // Create the certificate record
        const certificate = await prisma.certificate.create({
            data: {
                certificate_name: certificateName,
                certificate_number: certificateNumber,
                certificate_file_path: `/uploads/certificates/${req.file.filename}`,
                expiry_date: expiryDate ? new Date(expiryDate) : null,
                provider_id: providerId,
                certificate_status: 'Pending' // Default status
            }
        });

        res.status(201).json({
            success: true,
            message: 'Certificate uploaded successfully. It will be reviewed shortly.',
            data: certificate
        });

    } catch (error) {
        console.error('Error uploading certificate:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file on error:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Error uploading certificate',
            error: error.message
        });
    }
};

// Delete a certificate
export const deleteCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const providerId = req.userId;

        // Check if certificate exists and belongs to provider
        const certificate = await prisma.certificate.findFirst({
            where: {
                certificate_id: parseInt(certificateId),
                provider_id: providerId
            }
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found or access denied'
            });
        }

        // Check if certificate is being used in any services
        const servicesUsingCert = await prisma.coveredService.findMany({
            where: { certificate_id: parseInt(certificateId) },
            include: {
                specific_service: {
                    include: {
                        serviceListing: true
                    }
                }
            }
        });

        if (servicesUsingCert.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete certificate. It is being used by existing services.',
                servicesCount: servicesUsingCert.length
            });
        }

        // Delete the certificate file
        if (certificate.certificate_file_path) {
            const filePath = path.join(process.cwd(), 'public', certificate.certificate_file_path);
            try {
                await fs.unlink(filePath);
            } catch (fileError) {
                console.error('Error deleting certificate file:', fileError);
                // Continue with database deletion even if file deletion fails
            }
        }

        // Delete the certificate record
        await prisma.certificate.delete({
            where: { certificate_id: parseInt(certificateId) }
        });

        res.status(200).json({
            success: true,
            message: 'Certificate deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting certificate'
        });
    }
};

// Update certificate status (Admin only - for future use)
export const updateCertificateStatus = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Pending', 'Approved', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Pending, Approved, or Rejected'
            });
        }

        const certificate = await prisma.certificate.update({
            where: { certificate_id: parseInt(certificateId) },
            data: { certificate_status: status },
            include: {
                provider: {
                    select: {
                        provider_email: true,
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: `Certificate status updated to ${status}`,
            data: certificate
        });

    } catch (error) {
        console.error('Error updating certificate status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating certificate status'
        });
    }
};

// Get certificate by ID
export const getCertificateById = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const providerId = req.userId;

        const certificate = await prisma.certificate.findFirst({
            where: {
                certificate_id: parseInt(certificateId),
                provider_id: providerId
            }
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found or access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: certificate
        });

    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificate'
        });
    }
};
