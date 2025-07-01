import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage configuration for service images
const serviceImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/service-images/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'service_' + req.body.provider_id + '_' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for service images (only images allowed)
const serviceImageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer upload configuration for service images
const uploadServiceImage = multer({
    storage: serviceImageStorage,
    fileFilter: serviceImageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to validate landscape orientation
const validateLandscapeImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const metadata = await sharp(req.file.path).metadata();
        
        if (metadata.width <= metadata.height) {
            // Delete the uploaded file since it doesn't meet requirements
            const fs = require('fs');
            fs.unlinkSync(req.file.path);
            
            return res.status(400).json({
                success: false,
                message: 'Only landscape orientation images are allowed (width must be greater than height)'
            });
        }
        
        // Optimize the image
        const optimizedPath = req.file.path.replace(path.extname(req.file.path), '_optimized' + path.extname(req.file.path));
        
        await sharp(req.file.path)
            .resize(800, 600, { 
                fit: 'cover', 
                position: 'center' 
            })
            .jpeg({ quality: 85 })
            .toFile(optimizedPath);
        
        // Replace original with optimized
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
        fs.renameSync(optimizedPath, req.file.path);
        
        next();
    } catch (error) {
        console.error('Image validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing image'
        });
    }
};

const upload = multer({ dest: 'uploads/' }); // existing upload configuration

export { upload, uploadServiceImage, validateLandscapeImage };
