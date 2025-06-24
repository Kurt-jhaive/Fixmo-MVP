// otpUtils.js - Abstract reusable OTP logic for both customers and providers
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail } from './mailer.js';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

// General OTP verification function for any purpose (registration, forgot password, etc.)
export async function verifyOTP(email, otp) {
    try {
        const record = await prisma.oTPVerification.findFirst({
            where: { email },
            orderBy: { created_at: 'desc' }
        });

        if (!record) {
            return { 
                success: false, 
                message: 'No OTP found for this email. Please request a new OTP.' 
            };
        }

        if (record.otp !== otp) {
            return { 
                success: false, 
                message: 'Invalid OTP. Please check the code and try again.' 
            };
        }

        if (new Date(record.expires_at) < new Date()) {
            return { 
                success: false, 
                message: 'OTP has expired. Please request a new OTP.' 
            };
        }

        return { 
            success: true, 
            message: 'OTP verified successfully',
            record: record 
        };
    } catch (error) {
        console.error('OTP verification error:', error);
        return { 
            success: false, 
            message: 'Error verifying OTP. Please try again.' 
        };
    }
}

// Clean up used OTP after successful verification
export async function cleanupOTP(email) {
    try {
        await prisma.oTPVerification.deleteMany({ where: { email } });
    } catch (error) {
        console.error('Error cleaning up OTP:', error);
    }
}

export async function forgotrequestOTP({ email, userType, existsCheck, existsErrorMsg }, res) {
    try {
        const exists = await existsCheck(email);
        if (!exists) {
            return res.status(404).json({ message: existsErrorMsg });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await prisma.oTPVerification.create({ data: { email, otp, expires_at: expiresAt } });
        await sendOTPEmail(email, otp);
        res.status(200).json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
}

export async function verifyOTPAndResetPassword({ email, otp, newPassword, userType, updatePassword, notFoundMsg }, res) {
    try {
        const verificationResult = await verifyOTP(email, otp);
        
        if (!verificationResult.success) {
            return res.status(400).json({ message: verificationResult.message });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updatePassword(email, hashedPassword);
        await cleanupOTP(email);
        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error resetting password' });
    }
}
