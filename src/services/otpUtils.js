// otpUtils.js - Abstract reusable OTP logic for both customers and providers
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail } from './mailer.js';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

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
        const record = await prisma.oTPVerification.findFirst({
            where: { email },
            orderBy: { created_at: 'desc' }
        });
        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updatePassword(email, hashedPassword);
        await prisma.oTPVerification.deleteMany({ where: { email } });
        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error resetting password' });
    }
}
