import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all appointments (with filtering and pagination)
export const getAllAppointments = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            provider_id, 
            customer_id,
            from_date,
            to_date,
            sort_by = 'scheduled_date',
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        let whereClause = {};

        if (status) {
            whereClause.appointment_status = status;
        }

        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }

        if (customer_id) {
            whereClause.customer_id = parseInt(customer_id);
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        // Get appointments with pagination
        const [appointments, totalCount] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                            user_location: true
                        }
                    },
                    serviceProvider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_location: true,
                            provider_rating: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true,
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    [sort_by]: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointments',
            error: error.message
        });
    }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({
            where: {
                appointment_id: parseInt(appointmentId)
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true,
                        user_location: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_profile_photo: true,
                        provider_rating: true
                    }
                },
                appointment_rating: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
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
            data: appointment
        });

    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointment',
            error: error.message
        });
    }
};

// Create new appointment
export const createAppointment = async (req, res) => {
    try {
        const {
            customer_id,
            provider_id,
            scheduled_date,
            appointment_status = 'pending',
            final_price,
            repairDescription
        } = req.body;

        // Validate required fields
        if (!customer_id || !provider_id || !scheduled_date) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID, Provider ID, and scheduled date are required'
            });
        }

        // Validate customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Service provider not found'
            });
        }

        // Validate scheduled date
        const scheduledDateTime = new Date(scheduled_date);
        if (isNaN(scheduledDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduled date format'
            });
        }

        // Check for conflicts
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
                success: false,
                message: 'Provider already has an appointment at this time'
            });
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customer_id),
                provider_id: parseInt(provider_id),
                scheduled_date: scheduledDateTime,
                appointment_status,
                final_price: final_price ? parseFloat(final_price) : null,
                repairDescription: repairDescription || null
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

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
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

// Update appointment
export const updateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const {
            scheduled_date,
            appointment_status,
            final_price,
            repairDescription
        } = req.body;

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Build update data
        const updateData = {};

        if (scheduled_date) {
            const scheduledDateTime = new Date(scheduled_date);
            if (isNaN(scheduledDateTime.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid scheduled date format'
                });
            }

            // Check for conflicts if changing date
            if (scheduledDateTime.getTime() !== existingAppointment.scheduled_date.getTime()) {
                const conflictingAppointment = await prisma.appointment.findFirst({
                    where: {
                        provider_id: existingAppointment.provider_id,
                        scheduled_date: scheduledDateTime,
                        appointment_status: {
                            in: ['pending', 'confirmed', 'in-progress']
                        },
                        appointment_id: {
                            not: parseInt(appointmentId)
                        }
                    }
                });

                if (conflictingAppointment) {
                    return res.status(409).json({
                        success: false,
                        message: 'Provider already has an appointment at this new time'
                    });
                }
            }

            updateData.scheduled_date = scheduledDateTime;
        }

        if (appointment_status !== undefined) {
            updateData.appointment_status = appointment_status;
        }

        if (final_price !== undefined) {
            updateData.final_price = final_price ? parseFloat(final_price) : null;
        }

        if (repairDescription !== undefined) {
            updateData.repairDescription = repairDescription;
        }

        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: updateData,
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

        res.status(200).json({
            success: true,
            message: 'Appointment updated successfully',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment',
            error: error.message
        });
    }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                appointment_rating: true
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Delete related ratings first
        if (existingAppointment.appointment_rating.length > 0) {
            await prisma.rating.deleteMany({
                where: { appointment_id: parseInt(appointmentId) }
            });
        }

        // Delete appointment
        await prisma.appointment.delete({
            where: { appointment_id: parseInt(appointmentId) }
        });

        res.status(200).json({
            success: true,
            message: 'Appointment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting appointment',
            error: error.message
        });
    }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status values
        const validStatuses = ['pending', 'approved', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Update appointment status
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: status },
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

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status}`,
            data: updatedAppointment
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

// Cancel appointment with reason
export const cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellation_reason } = req.body;

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Update appointment status to cancelled with reason
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
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

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment',
            error: error.message
        });
    }
};

// Rate customer/appointment
export const rateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if appointment exists and is completed
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (existingAppointment.appointment_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed appointments'
            });
        }

        // Create or update rating
        const ratingData = await prisma.rating.upsert({
            where: {
                appointment_id: parseInt(appointmentId)
            },
            update: {
                rating_value: parseInt(rating),
                rating_comment: comment || null
            },
            create: {
                appointment_id: parseInt(appointmentId),
                rating_value: parseInt(rating),
                rating_comment: comment || null,
                user_id: existingAppointment.customer_id,
                provider_id: existingAppointment.provider_id
            }
        });

        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: ratingData
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
};

// Reschedule appointment
export const rescheduleAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { new_scheduled_date } = req.body;

        if (!new_scheduled_date) {
            return res.status(400).json({
                success: false,
                message: 'New scheduled date is required'
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Validate new date
        const newScheduledDateTime = new Date(new_scheduled_date);
        if (isNaN(newScheduledDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        // Check if new date is in the future
        if (newScheduledDateTime < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'New scheduled date must be in the future'
            });
        }

        // Check for conflicts
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: existingAppointment.provider_id,
                scheduled_date: newScheduledDateTime,
                appointment_status: {
                    in: ['pending', 'confirmed', 'in-progress']
                },
                appointment_id: {
                    not: parseInt(appointmentId)
                }
            }
        });

        if (conflictingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'Provider already has an appointment at the new time'
            });
        }

        // Update appointment
        const rescheduledAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: {
                scheduled_date: newScheduledDateTime,
                appointment_status: 'pending' // Reset to pending when rescheduled
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

        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: rescheduledAppointment
        });

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error rescheduling appointment',
            error: error.message
        });
    }
};

// Get provider appointments
export const getProviderAppointments = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { 
            status, 
            from_date, 
            to_date, 
            page = 1, 
            limit = 10,
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = {
            provider_id: parseInt(providerId)
        };

        if (status) {
            whereClause.appointment_status = status;
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        const [appointments, totalCount] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                            user_location: true,
                            profile_photo: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true
                        }
                    }
                },
                orderBy: {
                    scheduled_date: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching provider appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching provider appointments',
            error: error.message
        });
    }
};

// Get customer appointments
export const getCustomerAppointments = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { 
            status, 
            from_date, 
            to_date, 
            page = 1, 
            limit = 10,
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = {
            customer_id: parseInt(customerId)
        };

        if (status) {
            whereClause.appointment_status = status;
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        const [appointments, totalCount] = await Promise.all([
            prisma.appointment.findMany({
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
                            provider_profile_photo: true,
                            provider_rating: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true
                        }
                    }
                },
                orderBy: {
                    scheduled_date: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching customer appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer appointments',
            error: error.message
        });
    }
};

// Get appointment statistics
export const getAppointmentStats = async (req, res) => {
    try {
        const { provider_id } = req.query;

        let whereClause = {};
        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }

        // Get current date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Get overall statistics
        const [
            totalAppointments,
            pendingAppointments,
            confirmedAppointments,
            completedAppointments,
            cancelledAppointments,
            monthlyAppointments,
            yearlyAppointments,
            averageRating
        ] = await Promise.all([
            prisma.appointment.count({ where: whereClause }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'pending' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'confirmed' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'completed' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'cancelled' } 
            }),
            prisma.appointment.count({
                where: {
                    ...whereClause,
                    scheduled_date: {
                        gte: startOfMonth
                    }
                }
            }),
            prisma.appointment.count({
                where: {
                    ...whereClause,
                    scheduled_date: {
                        gte: startOfYear
                    }
                }
            }),
            prisma.rating.aggregate({
                where: {
                    ...(provider_id && { provider_id: parseInt(provider_id) })
                },
                _avg: {
                    rating_value: true
                }
            })
        ]);

        // Calculate total revenue
        const revenueData = await prisma.appointment.aggregate({
            where: {
                ...whereClause,
                appointment_status: 'completed',
                final_price: {
                    not: null
                }
            },
            _sum: {
                final_price: true
            }
        });

        const totalRevenue = revenueData._sum.final_price || 0;

        // Calculate completion rate
        const completionRate = totalAppointments > 0 
            ? Math.round((completedAppointments / totalAppointments) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                total_appointments: totalAppointments,
                pending_appointments: pendingAppointments,
                confirmed_appointments: confirmedAppointments,
                completed_appointments: completedAppointments,
                cancelled_appointments: cancelledAppointments,
                monthly_appointments: monthlyAppointments,
                yearly_appointments: yearlyAppointments,
                total_revenue: totalRevenue,
                average_rating: averageRating._avg.rating_value || 0,
                completion_rate: completionRate
            }
        });

    } catch (error) {
        console.error('Error fetching appointment statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointment statistics',
            error: error.message
        });
    }
};
