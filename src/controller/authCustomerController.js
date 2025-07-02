// Controller for authentication-related logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword, verifyOTP, cleanupOTP } from '../services/otpUtils.js';
import { checkOTPRateLimit, recordOTPAttempt } from '../services/rateLimitUtils.js';

const prisma = new PrismaClient();

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
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
      birthday,
      password,
      phone_number,
      user_location,
      exact_location,
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

    // Check for duplicate phone number
    const existingPhoneUser = await prisma.user.findFirst({ 
      where: { phone_number: phone_number } 
    });
    if (existingPhoneUser) {
      return res.status(400).json({ message: 'Phone number is already registered with another account' });
    }

    // Also check if phone number exists in service provider table
    const existingPhoneProvider = await prisma.serviceProviderDetails.findFirst({ 
      where: { provider_phone_number: phone_number } 
    });
    if (existingPhoneProvider) {
      return res.status(400).json({ message: 'Phone number is already registered with a service provider account' });
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
        birthday: birthday ? new Date(birthday) : null,
        password: hashedPassword,
        phone_number,
        profile_photo: profilePhotoPath || null,
        valid_id: validIdPath || null,
        user_location: user_location || null,
        exact_location: exact_location || null
      }
    });    // Send registration success email
    await sendRegistrationSuccessEmail(email, first_name, userName); 

    // Delete the used OTP
    await cleanupOTP(email);

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

        // Check provider availability for the exact slot
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[scheduledDateTime.getDay()];
        
        console.log('🔍 Booking Debug - Looking for exact availability slot:');
        console.log('  Provider ID:', provider_id);
        console.log('  Day of Week:', dayOfWeek);
        console.log('  Scheduled Time:', scheduled_time);
        
        // Find the exact availability slot that matches the requested time
        const exactSlot = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: scheduled_time, // Must match exact start time
                availability_isActive: true // Only active slots can be booked
            }
        });

        console.log('🎯 Exact slot found:', exactSlot);

        if (!exactSlot) {
            return res.status(400).json({ 
                message: `This time slot is not available. Please select from the provider's available time slots.` 
            });
        }

        // Additional check: ensure the slot is not already booked
        if (exactSlot.availability_isBooked) {
            return res.status(400).json({ 
                message: 'This time slot is already booked' 
            });
        }

        // Check for conflicting appointments (prevent double booking)
        // We need to check if there's an existing appointment that overlaps with this slot
        const slotEndTime = exactSlot.endTime;
        const requestedEndDateTime = new Date(`${scheduled_date}T${slotEndTime}:00`);
        
        console.log('🔍 Conflict Detection Debug:');
        console.log('  Requested Start:', scheduledDateTime);
        console.log('  Requested End:', requestedEndDateTime);
        
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                scheduled_date: scheduledDateTime, // Exact same start time
                appointment_status: {
                    in: ['accepted', 'on the way', 'finished'] // Active appointment statuses
                }
            }
        });

        console.log('🚫 Conflicting appointment found:', conflictingAppointment);

        if (conflictingAppointment) {
            return res.status(400).json({ 
                message: 'This time slot is already booked' 
            });
        }

        // Create the appointment
        console.log('✅ Creating appointment with data:');
        console.log('  Customer ID:', customer_id);
        console.log('  Provider ID:', provider_id);
        console.log('  Scheduled Date/Time:', scheduledDateTime);
        console.log('  Final Price:', estimated_price);
        
        const newAppointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customer_id),
                provider_id: parseInt(provider_id),
                appointment_status: 'accepted', // Auto-accept since slot is available
                scheduled_date: scheduledDateTime,
                final_price: estimated_price ? parseFloat(estimated_price) : (serviceListing ? serviceListing.service_startingprice : null),
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

        // Mark the availability slot as booked
        await prisma.availability.update({
            where: { availability_id: exactSlot.availability_id },
            data: { availability_isBooked: true }
        });

        console.log('✅ Appointment created successfully:', newAppointment.appointment_id);
        console.log('✅ Availability slot marked as booked:', exactSlot.availability_id);

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
        if (existingAppointment.appointment_status === 'finished') {
            return res.status(400).json({ message: 'Cannot cancel a finished appointment' });
        }

        if (existingAppointment.appointment_status === 'canceled') {
            return res.status(400).json({ message: 'Appointment is already cancelled' });
        }

        // Update appointment status to canceled
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointment_id) },
            data: { appointment_status: 'canceled' }
        });

        // Free up the availability slot
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[existingAppointment.scheduled_date.getDay()];
        const startTime = existingAppointment.scheduled_date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        await prisma.availability.updateMany({
            where: {
                provider_id: existingAppointment.provider_id,
                dayOfWeek: dayOfWeek,
                startTime: startTime
            },
            data: { availability_isBooked: false }
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

// CUSTOMER: Step 2 - Reset password without OTP verification (OTP already verified)
export const resetPasswordOnly = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// Get user profile and verification status
export const getUserProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(userId) },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                userName: true,
                email: true,
                phone_number: true,
                user_location: true,
                profile_photo: true,
                valid_id: true,
                is_verified: true,
                created_at: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'User profile retrieved successfully',
            user: user
        });
    } catch (err) {
        console.error('Get user profile error:', err);
        res.status(500).json({ message: 'Server error retrieving user profile' });
    }
};

// Update user verification documents
export const updateVerificationDocuments = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Handle file uploads
        const profilePictureFile = req.files && req.files['profilePicture'] ? req.files['profilePicture'][0] : null;
        const validIdFile = req.files && req.files['validId'] ? req.files['validId'][0] : null;

        const updateData = {};
          if (profilePictureFile) {
            updateData.profile_photo = profilePictureFile.path;
        }
        
        if (validIdFile) {
            updateData.valid_id = validIdFile.path;
        }

        // If documents are uploaded, set verification status to pending
        if (profilePictureFile || validIdFile) {
            updateData.is_verified = false; // Reset verification status, admin will need to verify
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: parseInt(userId) },
            data: updateData,            select: {
                user_id: true,
                profile_photo: true,
                valid_id: true,
                is_verified: true
            }
        });

        res.status(200).json({
            message: 'Verification documents updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update verification documents error:', err);
        res.status(500).json({ message: 'Server error updating verification documents' });
    }
};

// Get all service listings with filtering and pagination
export const getServiceListingsForCustomer = async (req, res) => {
    const { 
        page = 1, 
        limit = 12, 
        search = '', 
        category = '', 
        location = '', 
        sortBy = 'rating' 
    } = req.query;

    try {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where clause for filtering
        const whereClause = {};
        
        // Search filter
        if (search) {
            whereClause.OR = [
                { service_title: { contains: search, mode: 'insensitive' } },
                { service_description: { contains: search, mode: 'insensitive' } },
                { serviceProvider: { 
                    OR: [
                        { provider_first_name: { contains: search, mode: 'insensitive' } },
                        { provider_last_name: { contains: search, mode: 'insensitive' } }
                    ]
                }}
            ];
        }

        // Location filter
        if (location) {
            whereClause.serviceProvider = {
                ...whereClause.serviceProvider,
                provider_location: { contains: location, mode: 'insensitive' }
            };
        }

        // Category filter (through specific services)
        if (category) {
            whereClause.specific_services = {
                some: {
                    category: {
                        category_name: { equals: category, mode: 'insensitive' }
                    }
                }
            };
        }

        // Only show services from verified and activated providers
        whereClause.serviceProvider = {
            ...whereClause.serviceProvider,
            provider_isVerified: true,
            provider_isActivated: true
        };

        // Build orderBy clause
        let orderBy = {};
        switch (sortBy) {
            case 'rating':
                orderBy = { serviceProvider: { provider_rating: 'desc' } };
                break;
            case 'price-low':
                orderBy = { service_startingprice: 'asc' };
                break;
            case 'price-high':
                orderBy = { service_startingprice: 'desc' };
                break;
            case 'newest':
                orderBy = { service_id: 'desc' };
                break;
            default:
                orderBy = { serviceProvider: { provider_rating: 'desc' } };
        }

        // Get service listings
        const serviceListings = await prisma.serviceListing.findMany({
            where: whereClause,
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_userName: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_rating: true,
                        provider_isVerified: true,
                        provider_profile_photo: true
                    }
                },
                specific_services: {
                    include: {
                        category: {
                            select: {
                                category_name: true
                            }
                        }
                    }
                }
            },
            orderBy,
            skip,
            take: parseInt(limit)
        });

        // Get total count for pagination
        const totalCount = await prisma.serviceListing.count({
            where: whereClause
        });

        // Format the response
        const formattedListings = serviceListings.map(listing => ({
            id: listing.service_id,
            title: listing.service_title,
            description: listing.service_description,
            startingPrice: listing.service_startingprice,
            service_picture: listing.service_picture, // Add service picture
            provider: {
                id: listing.serviceProvider.provider_id,
                name: `${listing.serviceProvider.provider_first_name} ${listing.serviceProvider.provider_last_name}`,
                userName: listing.serviceProvider.provider_userName,
                rating: listing.serviceProvider.provider_rating || 0,
                location: listing.serviceProvider.provider_location,
                profilePhoto: listing.serviceProvider.provider_profile_photo
            },
            categories: listing.specific_services.map(service => service.category.category_name),
            specificServices: listing.specific_services.map(service => ({
                id: service.specific_service_id,
                title: service.specific_service_title,
                description: service.specific_service_description
            }))
        }));

        res.status(200).json({
            message: 'Service listings retrieved successfully',
            listings: formattedListings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                hasNext: skip + parseInt(limit) < totalCount,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (err) {
        console.error('Get service listings error:', err);
        res.status(500).json({ message: 'Server error retrieving service listings' });
    }
};

// Get service categories for filter dropdown
export const getServiceCategories = async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            select: {
                category_id: true,
                category_name: true
            },
            orderBy: {
                category_name: 'asc'
            }
        });

        res.status(200).json({
            message: 'Service categories retrieved successfully',
            categories
        });
    } catch (err) {
        console.error('Get service categories error:', err);
        res.status(500).json({ message: 'Server error retrieving service categories' });
    }
};

// Get customer statistics (bookings, ratings, etc.)
export const getCustomerStats = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Get appointment counts
        const [activeBookings, completedBookings, userRatings] = await Promise.all([
            prisma.appointment.count({
                where: {
                    customer_id: parseInt(userId),
                    appointment_status: {
                        in: ['pending', 'confirmed', 'in_progress']
                    }
                }
            }),
            prisma.appointment.count({
                where: {
                    customer_id: parseInt(userId),
                    appointment_status: 'completed'
                }
            }),
            prisma.rating.findMany({
                where: {
                    user_id: parseInt(userId)
                },
                select: {
                    rating_value: true
                }
            })
        ]);

        // Calculate average rating given by user
        const averageRating = userRatings.length > 0 
            ? userRatings.reduce((sum, rating) => sum + rating.rating_value, 0) / userRatings.length 
            : 0;

        res.status(200).json({
            message: 'Customer statistics retrieved successfully',
            stats: {
                activeBookings,
                completedBookings,
                averageRating: averageRating.toFixed(1)
            }
        });
    } catch (err) {
        console.error('Get customer stats error:', err);
        res.status(500).json({ message: 'Server error retrieving customer statistics' });
    }
};

// Get provider availability for booking
export const getProviderBookingAvailability = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { date } = req.query;

        // Get the day of week from the date
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Get provider's availability for the specific day
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(providerId),
                dayOfWeek: dayOfWeek,
                availability_isActive: true
                // Note: Removed availability_isBooked filter since we don't permanently mark slots as booked
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        // Get existing appointments for this date to filter out booked slots
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                provider_id: parseInt(providerId),
                scheduled_date: {
                    gte: new Date(date + 'T00:00:00.000Z'),
                    lt: new Date(date + 'T23:59:59.999Z')
                },
                appointment_status: {
                    in: ['accepted', 'on the way', 'finished'] // Only active appointments block slots
                }
            }
        });

        // Create a set of booked times for quick lookup
        const bookedTimes = new Set(
            existingAppointments.map(appointment => 
                appointment.scheduled_date.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                })
            )
        );

        // Add status to each availability slot (use EXACT slots from database, no breakdown)
        const today = new Date();
        const isToday = requestedDate.toDateString() === today.toDateString();
        
        const availabilityWithStatus = availability.map(slot => {
            // Check if this entire slot time range is booked
            const isBooked = bookedTimes.has(slot.startTime);
            
            // Check if slot is in the past (for today only)
            let isPast = false;
            
            if (isToday) {
                const currentTime = today.getHours() * 60 + today.getMinutes();
                const [hours, minutes] = slot.startTime.split(':');
                const slotTime = parseInt(hours) * 60 + parseInt(minutes);
                isPast = slotTime <= currentTime;
            }
            
            return {
                ...slot,
                isBooked,
                isPast,
                isAvailable: !isBooked && !isPast,
                status: isPast ? 'past' : isBooked ? 'booked' : 'available'
            };
        });

        res.status(200).json({
            success: true,
            message: 'Provider availability retrieved successfully',
            data: {
                date: date,
                dayOfWeek: dayOfWeek,
                providerId: parseInt(providerId),
                availability: availabilityWithStatus, // Changed from availableSlots to show all slots with status
                isToday: isToday,
                currentTime: isToday ? `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}` : null
            }
        });

    } catch (error) {
        console.error('Error getting provider availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving provider availability',
            error: error.message
        });
    }
};

// Create a new appointment booking
export const createAppointment = async (req, res) => {
    try {
        console.log('=== APPOINTMENT CREATION DEBUG ===');
        console.log('Auth headers:', req.headers.authorization);
        console.log('Customer ID from auth:', req.userId);
        console.log('Request body:', req.body);
        
        const customerId = req.userId; // From auth middleware
        const {
            provider_id,
            service_id,
            scheduled_date,
            scheduled_time,
            repairDescription
        } = req.body;

        // Validate required fields
        if (!provider_id || !service_id || !scheduled_date || !scheduled_time) {
            console.log('Missing required fields!');
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Combine date and time into a proper DateTime
        const appointmentDateTime = new Date(`${scheduled_date}T${scheduled_time}:00.000Z`);
        console.log('Appointment DateTime:', appointmentDateTime);

        // Check if the time slot is still available
        const dayOfWeek = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'long' });
        console.log('Day of week:', dayOfWeek);
        
        // Check if the requested time slot exists in provider's availability
        const exactSlot = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: scheduled_time,
                availability_isActive: true
            }
        });

        console.log('Looking for exact slot:', {
            provider_id: parseInt(provider_id),
            dayOfWeek: dayOfWeek,
            startTime: scheduled_time,
            availability_isActive: true
        });
        console.log('Found exact slot:', exactSlot);

        if (!exactSlot) {
            console.log('No exact slot found - checking availability slots in database');
            const allSlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(provider_id),
                    dayOfWeek: dayOfWeek
                }
            });
            console.log('All slots for this day:', allSlots);
            
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is not available'
            });
        }

        // Check for conflicting appointments
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                scheduled_date: appointmentDateTime,
                appointment_status: {
                    not: 'Cancelled'
                }
            }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked'
            });
        }

        // Create the appointment
        const newAppointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customerId),
                provider_id: parseInt(provider_id),
                appointment_status: 'Pending',
                scheduled_date: appointmentDateTime,
                repairDescription: repairDescription || null
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                }
            }
        });

        // Note: We don't mark the availability slot as booked because availability 
        // represents the provider's weekly schedule, not specific date bookings.
        // Specific bookings are tracked in the appointment table.

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: newAppointment
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating appointment',
            error: error.message
        });
    }
};

// Provider updates appointment status (for provider dashboard)
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status, provider_id } = req.body;

        // Validate status
        const validStatuses = ['accepted', 'on the way', 'finished', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        // Verify the appointment exists and belongs to the provider
        const appointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                provider_id: parseInt(provider_id)
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to this provider'
            });
        }

        // Update appointment status
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: status }
        });

        // If appointment is finished or canceled, free up the availability slot
        if (status === 'finished' || status === 'canceled') {
            const dayOfWeek = appointment.scheduled_date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const startTime = appointment.scheduled_date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            await prisma.availability.updateMany({
                where: {
                    provider_id: appointment.provider_id,
                    dayOfWeek: dayOfWeek,
                    startTime: startTime
                },
                data: { availability_isBooked: false }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment: updatedAppointment
        });

    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment status',
            error: error.message
        });
    }
};

// Get appointment details
export const getAppointmentDetails = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
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

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Appointment details retrieved successfully',
            appointment: appointment
        });

    } catch (error) {
        console.error('Error getting appointment details:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving appointment details',
            error: error.message
        });
    }
};



