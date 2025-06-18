import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword } from '../services/otpUtils.js';

const prisma = new PrismaClient();

// Step 1: Request OTP for service provider registration
export const requestProviderOTP = async (req, res) => {
    const { provider_email } = req.body;
    try {
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists' });
        }

        // Delete any previous OTPs for this email to prevent re-use
        await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await prisma.oTPVerification.create({
            data: {
                email: provider_email,
                otp,
                expires_at: expiresAt
            }
        });

        await sendOTPEmail(provider_email, otp);
        res.status(200).json({ message: 'OTP sent to provider email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

// Step 2: Verify OTP and register service provider
export const verifyProviderOTPAndRegister = async (req, res) => {
    try {
        const {
            provider_first_name,
            provider_last_name,
            provider_password,
            provider_userName,
            provider_email,
            provider_phone_number,
            provider_location,
            provider_uli,
            otp
        } = req.body;

        // Check if provider already exists (prevent duplicate registration)
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists' });
        }

        // Verify OTP
        const record = await prisma.oTPVerification.findFirst({
            where: { email: provider_email },
            orderBy: { created_at: 'desc' }
        });

        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Handle file uploads
        const profilePhotoFile = req.files && req.files['provider_profile_photo'] ? req.files['provider_profile_photo'][0] : null;
        const validIdFile = req.files && req.files['provider_valid_id'] ? req.files['provider_valid_id'][0] : null;
        const provider_profile_photo = profilePhotoFile ? profilePhotoFile.path : null;
        const provider_valid_id = validIdFile ? validIdFile.path : null;

        // Hash password
        const hashedPassword = await bcrypt.hash(provider_password, 10);

        // Create new provider
        const newProvider = await prisma.serviceProviderDetails.create({
            data: {
                provider_first_name,
                provider_last_name,
                provider_password: hashedPassword,
                provider_userName,
                provider_email,
                provider_phone_number,
                provider_profile_photo: provider_profile_photo || null,
                provider_valid_id: provider_valid_id || null,
                provider_location: provider_location || null,
                provider_uli
            }
        });

        // Delete the used OTP
        await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });

        // Send registration success email
        await sendRegistrationSuccessEmail(provider_email, provider_first_name, provider_userName);
        
        res.status(201).json({ 
            message: 'Service provider registered successfully', 
            providerId: newProvider.provider_id,
            provider_profile_photo: provider_profile_photo,
            provider_valid_id: provider_valid_id
        });

    } catch (err) {
        console.error('Provider registration error:', err);
        res.status(500).json({ message: 'Server error during provider registration' });
    }
};

// Service provider login
export const providerLogin = async (req, res) => {
    const { provider_email, provider_password } = req.body;
    try {
        const provider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (!provider) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(provider_password, provider.provider_password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign({ providerId: provider.provider_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Login successful',
            token,
            providerId: provider.provider_id,
            providerUserName: provider.provider_userName
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// PROVIDER: Step 1 - Request OTP for forgot password
export const requestProviderForgotPasswordOTP = async (req, res) => {
    await forgotrequestOTP({
        email: req.body.provider_email,
        userType: 'provider',
        existsCheck: async (email) => await prisma.serviceProviderDetails.findUnique({ where: { provider_email: email } }),
        existsErrorMsg: 'Provider not found'
    }, res);
};

// PROVIDER: Step 2 - Verify OTP and reset password
export const verifyProviderForgotPasswordOTPAndReset = async (req, res) => {
    await verifyOTPAndResetPassword({
        email: req.body.provider_email,
        otp: req.body.otp,
        newPassword: req.body.newPassword,
        userType: 'provider',
        updatePassword: async (email, hashedPassword) => await prisma.serviceProviderDetails.update({ where: { provider_email: email }, data: { provider_password: hashedPassword } }),
        notFoundMsg: 'Provider not found'
    }, res);
};


export const uploadCertificate = async (req, res) => {
    const { providerId } = req.params;
    const { certificate_name, certificate_number, expiry_date } = req.body;
    const certificate_file = req.file; // multer puts the file here

    if (!certificate_file) {
        return res.status(400).json({ message: 'No certificate file uploaded' });
    }

    try {
        const uploadedFilePath = certificate_file.path; // multer stores the file path

        const newCertificate = await prisma.certificate.create({
            data: {
                certificate_name,
                certificate_number,
                certificate_file_path: uploadedFilePath,
                expiry_date: expiry_date ? new Date(expiry_date) : null,
                provider_id: parseInt(providerId)
            }
        });

        res.status(201).json({ message: 'Certificate uploaded successfully', certificate: newCertificate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error uploading certificate' });
    }
};