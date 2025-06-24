// Controller for authentication-related logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword, verifyOTP, cleanupOTP } from '../services/otpUtils.js';
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

    // Verify OTP using the reusable utility
    const verificationResult = await verifyOTP(email, otp);
    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
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
    });    // Send registration success email
    await sendRegistrationSuccessEmail(email, first_name, userName); 

    // Delete the used OTP
    await cleanupOTP(email);
    
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

export const addAppointment = async (req, res) => {
    const {
        customer_id,
        service_listing_id,
        provider_id,
        scheduled_date,
        scheduled_time,
        service_description,
        estimated_price
    } = req.body;

    try {
        // Validate required fields
        if (!customer_id || !provider_id || !scheduled_date || !scheduled_time) {
            return res.status(400).json({ 
                message: 'Missing required fields: customer_id, provider_id, scheduled_date, and scheduled_time are required' 
            });
        }

        // Validate that customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Validate that service provider exists
        const serviceProvider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!serviceProvider) {
            return res.status(404).json({ message: 'Service provider not found' });
        }

        // Validate service listing if provided
        let serviceListing = null;
        if (service_listing_id) {
            serviceListing = await prisma.serviceListing.findUnique({
                where: { service_id: parseInt(service_listing_id) },
                include: {
                    serviceProvider: true
                }
            });

            if (!serviceListing) {
                return res.status(404).json({ message: 'Service listing not found' });
            }

            // Ensure the listing belongs to the specified provider
            if (serviceListing.provider_id !== parseInt(provider_id)) {
                return res.status(400).json({ message: 'Service listing does not belong to the specified provider' });
            }
        }

        // Create scheduled datetime
        const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);
        
        if (isNaN(scheduledDateTime.getTime())) {
            return res.status(400).json({ message: 'Invalid scheduled date or time format' });
        }

        // Check if the scheduled date is in the future
        if (scheduledDateTime < new Date()) {
            return res.status(400).json({ message: 'Scheduled date and time must be in the future' });
        }

        // Check for conflicting appointments (prevent double booking)
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                scheduled_date: scheduledDateTime,
                appointment_status: {
                    in: ['pending', 'confirmed', 'in-progress']
                }
            }
        });

        if (conflictingAppointment) {
            return res.status(409).json({ 
                message: 'Service provider already has an appointment scheduled at this time' 
            });
        }

        // Check provider availability for the requested day and time
        const dayOfWeek = scheduledDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const availability = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek
            }
        });

        if (availability) {
            const requestedTime = scheduled_time;
            const startTime = availability.startTime;
            const endTime = availability.endTime;
            
            if (requestedTime < startTime || requestedTime >= endTime) {
                return res.status(400).json({ 
                    message: `Provider is not available at ${requestedTime}. Available time: ${startTime} - ${endTime}` 
                });
            }
        }

        // Create the appointment
        const newAppointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customer_id),
                provider_id: parseInt(provider_id),
                appointment_status: 'pending',
                scheduled_date: scheduledDateTime,
                actual_price: estimated_price ? parseFloat(estimated_price) : (serviceListing ? serviceListing.service_startingprice : null),
                repairDescription: service_description || (serviceListing ? serviceListing.service_description : null)
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                }
            }
        });

        return res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: newAppointment,
            service_listing: serviceListing ? {
                service_id: serviceListing.service_id,
                service_title: serviceListing.service_title,
                service_description: serviceListing.service_description,
                service_price: serviceListing.service_startingprice
            } : null
        });

    } catch (err) {
        console.error('Error creating customer appointment:', err);
        return res.status(500).json({ message: 'Internal server error while creating appointment' });
    }
};

// Get all service listings (for customer browsing)
export const getServiceListings = async (req, res) => {
    try {
        const { provider_id, service_type, location, min_price, max_price } = req.query;
        
        let whereClause = {};
        
        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }
        
        if (min_price || max_price) {
            whereClause.service_startingprice = {};
            if (min_price) whereClause.service_startingprice.gte = parseFloat(min_price);
            if (max_price) whereClause.service_startingprice.lte = parseFloat(max_price);
        }

        const serviceListings = await prisma.serviceListing.findMany({
            where: whereClause,
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_rating: true,
                        provider_isVerified: true
                    }
                },
                specific_services: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                service_startingprice: 'asc'
            }
        });

        // Filter by location if specified
        let filteredListings = serviceListings;
        if (location) {
            filteredListings = serviceListings.filter(listing => 
                listing.serviceProvider.provider_location && 
                listing.serviceProvider.provider_location.toLowerCase().includes(location.toLowerCase())
            );
        }

        // Filter by service type if specified
        if (service_type) {
            filteredListings = filteredListings.filter(listing =>
                listing.specific_services.some(service =>
                    service.category.category_name.toLowerCase().includes(service_type.toLowerCase()) ||
                    service.specific_service_title.toLowerCase().includes(service_type.toLowerCase())
                )
            );
        }

        return res.status(200).json({
            message: 'Service listings retrieved successfully',
            count: filteredListings.length,
            listings: filteredListings
        });

    } catch (err) {
        console.error('Error fetching service listings:', err);
        return res.status(500).json({ message: 'Internal server error while fetching service listings' });
    }
};

// Get specific service listing details
export const getServiceListingDetails = async (req, res) => {
    const { service_id } = req.params;

    try {
        if (!service_id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const serviceListing = await prisma.serviceListing.findUnique({
            where: { service_id: parseInt(service_id) },
            include: {
                serviceProvider: {
                    include: {
                        provider_availability: true,
                        provider_ratings: {
                            include: {
                                user: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            },
                            orderBy: {
                                id: 'desc'
                            },
                            take: 5
                        }
                    }
                },
                specific_services: {
                    include: {
                        category: true
                    }
                }
            }
        });

        if (!serviceListing) {
            return res.status(404).json({ message: 'Service listing not found' });
        }

        return res.status(200).json({
            message: 'Service listing details retrieved successfully',
            listing: serviceListing
        });

    } catch (err) {
        console.error('Error fetching service listing details:', err);
        return res.status(500).json({ message: 'Internal server error while fetching service listing details' });
    }
};

// Get customer's appointments
export const getCustomerAppointments = async (req, res) => {
    const { customer_id } = req.params;

    try {
        if (!customer_id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Validate that customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get all appointments for the customer
        const appointments = await prisma.appointment.findMany({
            where: {
                customer_id: parseInt(customer_id)
            },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'desc'
            }
        });

        return res.status(200).json({
            message: 'Customer appointments retrieved successfully',
            customer: {
                customer_id: customer.user_id,
                customer_name: `${customer.first_name} ${customer.last_name}`
            },
            appointments: appointments
        });

    } catch (err) {
        console.error('Error fetching customer appointments:', err);
        return res.status(500).json({ message: 'Internal server error while fetching customer appointments' });
    }
};

// Cancel appointment (customer)
export const cancelAppointment = async (req, res) => {
    const { appointment_id } = req.params;
    const { customer_id } = req.body;

    try {
        if (!appointment_id) {
            return res.status(400).json({ message: 'Appointment ID is required' });
        }

        if (!customer_id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Check if appointment exists and belongs to customer
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointment_id) },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (existingAppointment.customer_id !== parseInt(customer_id)) {
            return res.status(403).json({ message: 'You can only cancel your own appointments' });
        }

        // Check if appointment can be cancelled
        if (existingAppointment.appointment_status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
        }

        if (existingAppointment.appointment_status === 'cancelled') {
            return res.status(400).json({ message: 'Appointment is already cancelled' });
        }

        // Update appointment status to cancelled
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointment_id) },
            data: { appointment_status: 'cancelled' }
        });

        return res.status(200).json({
            message: 'Appointment cancelled successfully',
            cancelled_appointment: {
                appointment_id: updatedAppointment.appointment_id,
                customer: `${existingAppointment.customer.first_name} ${existingAppointment.customer.last_name}`,
                provider: `${existingAppointment.serviceProvider.provider_first_name} ${existingAppointment.serviceProvider.provider_last_name}`,
                scheduled_date: existingAppointment.scheduled_date,
                status: updatedAppointment.appointment_status
            }
        });

    } catch (err) {
        console.error('Error cancelling appointment:', err);
        return res.status(500).json({ message: 'Internal server error while cancelling appointment' });
    }
};

export const addRatetoProvider = async (req, res) => {
    const {
        provider_id,
        user_id,
        appointment_id,
        rating_value,
        rating_comment
    } = req.body;

    try {
        // Validate required fields
        if (!provider_id || !user_id || !appointment_id || !rating_value) {
            return res.status(400).json({ 
                message: 'Provider ID, User ID, Appointment ID, and rating value are required' 
            });
        }

        // Validate rating value is between 1 and 5
        if (rating_value < 1 || rating_value > 5) {
            return res.status(400).json({ 
                message: 'Rating value must be between 1 and 5' 
            });
        }

        // Validate that the user exists
        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(user_id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate that the service provider exists
        const serviceProvider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!serviceProvider) {
            return res.status(404).json({ message: 'Service provider not found' });
        }

        // Validate that the appointment exists and belongs to the user
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointment_id) },
            include: {
                customer: true,
                serviceProvider: true
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if the appointment belongs to the user
        if (appointment.customer_id !== parseInt(user_id)) {
            return res.status(403).json({ message: 'You can only rate appointments you were involved in' });
        }

        // Check if the appointment was with the specified provider
        if (appointment.provider_id !== parseInt(provider_id)) {
            return res.status(400).json({ message: 'Appointment was not with the specified service provider' });
        }

        // Check if the appointment is completed (only completed appointments can be rated)
        if (appointment.appointment_status !== 'completed') {
            return res.status(400).json({ message: 'Only completed appointments can be rated' });
        }

        // Check if this appointment has already been rated by this user
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                user_id: parseInt(user_id),
                provider_id: parseInt(provider_id)
            }
        });

        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this appointment' });
        }

        // Create the rating
        const newRating = await prisma.rating.create({
            data: {
                rating_value: parseInt(rating_value),
                rating_comment: rating_comment || null,
                appointment_id: parseInt(appointment_id),
                user_id: parseInt(user_id),
                provider_id: parseInt(provider_id)
            },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        userName: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_userName: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        repairDescription: true
                    }
                }
            }
        });

        // Update the service provider's average rating
        const allRatings = await prisma.rating.findMany({
            where: { provider_id: parseInt(provider_id) },
            select: { rating_value: true }
        });

        const averageRating = allRatings.reduce((sum, rating) => sum + rating.rating_value, 0) / allRatings.length;

        await prisma.serviceProviderDetails.update({
            where: { provider_id: parseInt(provider_id) },
            data: { provider_rating: parseFloat(averageRating.toFixed(2)) }
        });

        return res.status(201).json({
            message: 'Rating submitted successfully',
            rating: newRating,
            provider_new_average_rating: parseFloat(averageRating.toFixed(2))
        });

    } catch (err) {
        console.error('Error submitting rating:', err);
        return res.status(500).json({ message: 'Internal server error while submitting rating' });    }
};

// Standalone OTP verification endpoint (for registration flow)
export const verifyOTPOnly = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const verificationResult = await verifyOTP(email, otp);
        
        if (verificationResult.success) {
            res.status(200).json({ 
                message: 'OTP verified successfully',
                verified: true 
            });
        } else {
            res.status(400).json({ 
                message: verificationResult.message,
                verified: false 
            });
        }
    } catch (err) {
        console.error('OTP verification error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// CUSTOMER: Simple password reset (OTP already verified)
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

