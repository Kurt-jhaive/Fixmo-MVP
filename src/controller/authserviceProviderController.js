import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword } from '../services/otpUtils.js';

const prisma = new PrismaClient();

// Helper function to convert time string (HH:MM) to minutes
const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper function to convert minutes back to time string (HH:MM)
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

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


// Add a new service listing
// This function allows a service provider to create a new service listing

export const addServiceListing = async (req, res) => {
  const {
    provider_id,
    specific_service_id,
    service_title,
    service_description,
    service_price,
    category_id
  } = req.body;

  try {
    // Validate required fields
    if (!provider_id || !service_description || !service_price) {
      return res.status(400).json({ message: 'Provider ID, service description, and service price are required' });
    }

    // Verify the provider exists
    const provider = await prisma.serviceProviderDetails.findUnique({
      where: { provider_id: parseInt(provider_id) }
    });

    if (!provider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    let serviceTitle = service_title;
    let specificService = null;

    // If specific_service_id is provided and not null, validate it and get the title
    if (specific_service_id && specific_service_id !== null && specific_service_id !== '') {
      specificService = await prisma.specificService.findUnique({
        where: { specific_service_id: parseInt(specific_service_id) }
      });

      if (!specificService) {
        return res.status(404).json({ message: 'Specific service not found' });
      }

      // Use the specific service title if available
      serviceTitle = specificService.specific_service_title;
    }

    // If no service title provided and no specific service, return error
    if (!serviceTitle) {
      return res.status(400).json({ message: 'Service title is required when no specific service is selected' });
    }

    // Create the listing
    const listing = await prisma.serviceListing.create({
      data: {
        service_title: serviceTitle,
        service_description,
        service_startingprice: parseFloat(service_price),
        provider_id: parseInt(provider_id)
      }
    });

    // If we have a specific service, link it to the new listing
    if (specificService && specific_service_id) {
      await prisma.specificService.update({
        where: { specific_service_id: parseInt(specific_service_id) },
        data: {
          service_id: listing.service_id
        }
      });
    }

    return res.status(201).json({
      message: 'Service listing created successfully',
      listing
    });

  } catch (error) {
    console.error('Error creating service listing:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addAvailability = async (req, res) => {
    const { provider_id, dayOfWeek, startTime, endTime } = req.body;
    
    try {
        // Validate input
        if (!provider_id || !dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({ message: 'Provider ID, day of week, start time, and end time are required' });
        }

        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Validate dayOfWeek is valid
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
        }        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ message: 'Invalid time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }

        // Validate that start time is before end time
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (startMinutes >= endMinutes) {
            return res.status(400).json({ message: 'Start time must be before end time' });
        }

        // Check for overlapping time slots for the same provider and day
        const existingAvailabilities = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek
            }
        });

        // Check for time overlaps
        for (const existing of existingAvailabilities) {
            const existingStartMinutes = timeToMinutes(existing.startTime);
            const existingEndMinutes = timeToMinutes(existing.endTime);
            
            // Check if new slot overlaps with existing slot
            if (
                (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) ||
                (startMinutes === existingStartMinutes || endMinutes === existingEndMinutes)
            ) {
                return res.status(400).json({ 
                    message: `Time slot overlaps with existing availability: ${existing.startTime} - ${existing.endTime}` 
                });
            }
        }
    
        // Create availability entry
        const availability = await prisma.availability.create({
            data: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: startTime,
                endTime: endTime
            }
        });        res.status(201).json({ 
            message: 'Availability slot added successfully', 
            availability: {
                availability_id: availability.availability_id,
                dayOfWeek: availability.dayOfWeek,
                startTime: availability.startTime,
                endTime: availability.endTime,
                provider_id: availability.provider_id
            },
            note: 'You can add more time slots for the same day as long as they don\'t overlap'
        });
    } catch (error) {
        console.error('Error adding availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get availability for a provider
export const getProviderAvailability = async (req, res) => {
    const { provider_id } = req.params;
    
    try {
        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Get all availability for the provider
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id)
            },
            orderBy: {
                dayOfWeek: 'asc'
            }
        });
    
        res.status(200).json({ 
            message: 'Availability retrieved successfully', 
            provider_id: parseInt(provider_id),
            availability: availability
        });
    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update availability for a provider
export const updateAvailability = async (req, res) => {
    const { availability_id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;
    
    try {
        // Validate input
        if (!dayOfWeek && !startTime && !endTime) {
            return res.status(400).json({ message: 'At least one field (dayOfWeek, startTime, endTime) is required to update' });
        }

        // Check if availability exists
        const existingAvailability = await prisma.availability.findUnique({
            where: { availability_id: parseInt(availability_id) }
        });

        if (!existingAvailability) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        // Validate dayOfWeek if provided
        if (dayOfWeek) {
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
            }
        }

        // Validate time format if provided
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (startTime && !timeRegex.test(startTime)) {
            return res.status(400).json({ message: 'Invalid start time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }
        if (endTime && !timeRegex.test(endTime)) {
            return res.status(400).json({ message: 'Invalid end time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }

        // Prepare update data
        const updateData = {};
        if (dayOfWeek) updateData.dayOfWeek = dayOfWeek;
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
    
        // Update availability
        const updatedAvailability = await prisma.availability.update({
            where: { availability_id: parseInt(availability_id) },
            data: updateData
        });
    
        res.status(200).json({ 
            message: 'Availability updated successfully', 
            availability: updatedAvailability
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete availability for a provider
export const deleteAvailability = async (req, res) => {
    const { availability_id } = req.params;
    
    try {
        // Check if availability exists
        const existingAvailability = await prisma.availability.findUnique({
            where: { availability_id: parseInt(availability_id) }
        });

        if (!existingAvailability) {
            return res.status(404).json({ message: 'Availability not found' });
        }
    
        // Delete availability
        await prisma.availability.delete({
            where: { availability_id: parseInt(availability_id) }
        });
    
        res.status(200).json({ 
            message: 'Availability deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get available time slots for a specific provider and day (sorted by time)
export const getProviderDayAvailability = async (req, res) => {
    const { provider_id, dayOfWeek } = req.params;
    
    try {
        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Validate dayOfWeek
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
        }

        // Get all availability slots for the specific day
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        // Convert times to minutes and sort for better display
        const sortedSlots = availability.map(slot => ({
            ...slot,
            startMinutes: timeToMinutes(slot.startTime),
            endMinutes: timeToMinutes(slot.endTime)
        })).sort((a, b) => a.startMinutes - b.startMinutes);
    
        res.status(200).json({ 
            message: 'Day availability retrieved successfully', 
            provider_id: parseInt(provider_id),
            dayOfWeek: dayOfWeek,
            totalSlots: sortedSlots.length,
            availability: sortedSlots.map(slot => ({
                availability_id: slot.availability_id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                duration: `${Math.round((slot.endMinutes - slot.startMinutes) / 60 * 100) / 100} hours`
            }))
        });
    } catch (error) {
        console.error('Error getting day availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

