// Controller for authentication-related logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword } from '../services/otpUtils.js';

const prisma = new PrismaClient();

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user.user_id,
            userName: user.userName
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Step 1: Request OTP for registration
export const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Save OTP in oTPVerification table
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await prisma.oTPVerification.create({
            data: {
                email,
                otp,
                expires_at: expiresAt
            }
        });
        // Return file paths in response for next step (or store in temp if needed)
        res.status(200).json({
            message: 'OTP sent to email',
        });
        await sendOTPEmail(email, otp);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

export const verifyOTPAndRegister = async (req, res) => {
  const {
    first_name,
    last_name,
    userName,
    email,
    password,
    phone_number,
    user_location,
    otp
  } = req.body;
const profilePhotoFile = req.files && req.files['profile_photo'] ? req.files['profile_photo'][0] : null;
const validIdFile = req.files && req.files['valid_id'] ? req.files['valid_id'][0] : null;

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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
          // Save file paths if files are uploaded
        let profilePhotoPath = profilePhotoFile ? profilePhotoFile.path : null;
        let validIdPath = validIdFile ? validIdFile.path : null;
  const newUser = await prisma.user.create({
    data: {
      first_name,
      last_name,
      userName,
      email,
      password: hashedPassword,
      phone_number,
      profile_photo: profile_photo || null,
      valid_id: valid_id || null,
      user_location: user_location || null
    }
  });

    sendRegistrationSuccessEmail(email, first_name, userName); 

  // delete the used OTP
  await prisma.oTPVerification.deleteMany({ where: { email } });

  res.status(201).json({
    message: 'User registered successfully',
    userId: newUser.user_id,
    profile_photo: profilePhotoPath,
    valid_id: validIdPath
  });
};

// CUSTOMER: Step 1 - Request OTP for forgot password
export const requestForgotPasswordOTP = async (req, res) => {
    await forgotrequestOTP({
        email: req.body.email,
        userType: 'customer',
        existsCheck: async (email, phone_number) => await prisma.user.findUnique({ where: { email, phon } }),
        existsErrorMsg: 'User not found'
    }, res);
};

// CUSTOMER: Step 2 - Verify OTP and reset password
export const verifyForgotPasswordOTPAndReset = async (req, res) => {
    await verifyOTPAndResetPassword({
        email: req.body.email,
        otp: req.body.otp,
        newPassword: req.body.newPassword,
        userType: 'customer',
        updatePassword: async (email, hashedPassword) => await prisma.user.update({ where: { email }, data: { password: hashedPassword } }),
        notFoundMsg: 'User not found'
    }, res);
};
