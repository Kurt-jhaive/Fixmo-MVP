// Controller for authentication-related logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword } from '../services/otpUtils.js';
import { checkOTPRateLimit, recordOTPAttempt } from '../services/rateLimitUtils.js';

const prisma = new PrismaClient();

export const login = async (req, res) => {
    console.log('Login request received');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { email, password } = req.body;
    
    console.log('Extracted data:', { 
        email: email, 
        password: password ? '[PROVIDED]' : '[MISSING]',
        emailType: typeof email,
        passwordType: typeof password,
        emailLength: email ? email.length : 0,
        passwordLength: password ? password.length : 0
    });
    
    // Validate input
    if (!email || !password) {
        console.log('Validation failed: Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        console.log('Looking up user with email:', email);
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        console.log('User found:', { id: user.user_id, email: user.email, userName: user.userName });
        console.log('Comparing passwords...');
        
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('User logged in successfully:', user.userName);
        
        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user.user_id,
            userName: user.userName
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Step 1: Request OTP for registration
export const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {
        // Check rate limiting
        const rateLimitCheck = await checkOTPRateLimit(email);
        if (!rateLimitCheck.allowed) {
            return res.status(429).json({ message: rateLimitCheck.message });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Delete any previous OTPs for this email to prevent re-use
        await prisma.oTPVerification.deleteMany({ where: { email } });

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

        // Record the OTP attempt
        recordOTPAttempt(email);

        // Send OTP email
        await sendOTPEmail(email, otp);
        
        res.status(200).json({
            message: 'OTP sent to email',
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

export const verifyOTPAndRegister = async (req, res) => {
  try {
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
    const profilePhotoPath = profilePhotoFile ? profilePhotoFile.path : null;
    const validIdPath = validIdFile ? validIdFile.path : null;

    // Check if user already exists (prevent duplicate registration)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Verify OTP
    const record = await prisma.oTPVerification.findFirst({
      where: { email },
      orderBy: { created_at: 'desc' }
    });

    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        first_name,
        last_name,
        userName,
        email,
        password: hashedPassword,
        phone_number,
        profile_photo: profilePhotoPath || null,
        valid_id: validIdPath || null,
        user_location: user_location || null
      }
    });

    // Send registration success email
    await sendRegistrationSuccessEmail(email, first_name, userName); 

    // Delete the used OTP
    await prisma.oTPVerification.deleteMany({ where: { email } });
    
    console.log('User registered successfully');

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.user_id,
      profile_photo: profilePhotoPath,
      valid_id: validIdPath
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// CUSTOMER: Step 1 - Request OTP for forgot password
export const requestForgotPasswordOTP = async (req, res) => {
    await forgotrequestOTP({
        email: req.body.email,
        userType: 'customer',
        existsCheck: async (email, phone_number) => await prisma.user.findUnique({ where: { email, phone_number } }),
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

