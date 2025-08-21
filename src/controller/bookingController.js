// Booking Controller for Provider Dashboard
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class BookingController {
    // Get all bookings for a provider
    async getProviderBookings(req, res) {
        try {
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            const bookings = await prisma.appointment.findMany({
                where: {
                    provider_id: providerId
                },
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                            profile_photo: true
                        }
                    },
                    service: {
                        select: {
                            service_id: true,
                            service_title: true,
                            service_description: true,
                            service_startingprice: true,
                            service_picture: true
                        }
                    },
                    availability: {
                        select: {
                            availability_id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
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
                    created_at: 'desc'
                }
            });

            res.json({ 
                success: true, 
                appointments: bookings,
                total: bookings.length
            });
        } catch (error) {
            console.error('Error fetching provider bookings:', error);
            res.status(500).json({ 
                error: 'Failed to fetch bookings',
                details: error.message 
            });
        }
    }

    // Get booking statistics for provider
    async getProviderBookingStats(req, res) {
        try {
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            const bookings = await prisma.appointment.findMany({
                where: {
                    provider_id: providerId
                },
                include: {
                    appointment_rating: true
                }
            });

            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const stats = {
                totalBookings: bookings.length,
                pendingBookings: bookings.filter(b => b.appointment_status === 'pending').length,
                confirmedBookings: bookings.filter(b => b.appointment_status === 'confirmed').length,
                inProgressBookings: bookings.filter(b => b.appointment_status === 'in_progress').length,
                completedBookings: bookings.filter(b => b.appointment_status === 'completed').length,
                cancelledBookings: bookings.filter(b => b.appointment_status === 'cancelled').length,
                todayBookings: bookings.filter(b => 
                    new Date(b.scheduled_date).toDateString() === today.toDateString()
                ).length,
                monthlyBookings: bookings.filter(b => 
                    new Date(b.scheduled_date) >= thisMonth
                ).length,
                totalRevenue: bookings
                    .filter(b => b.appointment_status === 'completed')
                    .reduce((sum, b) => sum + (b.final_price || 0), 0),
                averageRating: this.calculateAverageRating(bookings)
            };

            res.json({ success: true, stats });
        } catch (error) {
            console.error('Error fetching booking stats:', error);
            res.status(500).json({ 
                error: 'Failed to fetch booking statistics',
                details: error.message 
            });
        }
    }

    // Update booking status
    async updateBookingStatus(req, res) {
        try {
            const { appointmentId } = req.params;
            const { status, cancellation_reason, final_price } = req.body;
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            // Validate status
            const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid booking status' });
            }

            // Check if appointment belongs to this provider
            const appointment = await prisma.appointment.findUnique({
                where: {
                    appointment_id: parseInt(appointmentId)
                }
            });

            if (!appointment) {
                return res.status(404).json({ error: 'Appointment not found' });
            }

            if (appointment.provider_id !== providerId) {
                return res.status(403).json({ error: 'Unauthorized access to this appointment' });
            }

            // Update the appointment
            const updateData = {
                appointment_status: status,
                ...(cancellation_reason && { cancellation_reason }),
                ...(final_price && { final_price: parseFloat(final_price) })
            };

            const updatedBooking = await prisma.appointment.update({
                where: {
                    appointment_id: parseInt(appointmentId)
                },
                data: updateData,
                include: {
                    customer: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true
                        }
                    },
                    service: {
                        select: {
                            service_title: true
                        }
                    }
                }
            });

            // Here you could add notification logic
            // await this.sendStatusUpdateNotification(updatedBooking);

            res.json({ 
                success: true, 
                message: `Booking ${status} successfully`,
                appointment: updatedBooking 
            });
        } catch (error) {
            console.error('Error updating booking status:', error);
            res.status(500).json({ 
                error: 'Failed to update booking status',
                details: error.message 
            });
        }
    }

    // Get specific booking details
    async getBookingDetails(req, res) {
        try {
            const { appointmentId } = req.params;
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            const booking = await prisma.appointment.findUnique({
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
                            profile_photo: true,
                            user_location: true
                        }
                    },
                    service: {
                        select: {
                            service_id: true,
                            service_title: true,
                            service_description: true,
                            service_startingprice: true,
                            service_picture: true
                        }
                    },
                    availability: {
                        select: {
                            availability_id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true
                        }
                    }
                }
            });

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            if (booking.provider_id !== providerId) {
                return res.status(403).json({ error: 'Unauthorized access to this booking' });
            }

            res.json({ success: true, booking });
        } catch (error) {
            console.error('Error fetching booking details:', error);
            res.status(500).json({ 
                error: 'Failed to fetch booking details',
                details: error.message 
            });
        }
    }

    // Reschedule appointment
    async rescheduleBooking(req, res) {
        try {
            const { appointmentId } = req.params;
            const { newDate, newTime, reason } = req.body;
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            // Validate inputs
            if (!newDate || !newTime) {
                return res.status(400).json({ error: 'New date and time are required' });
            }

            const appointment = await prisma.appointment.findUnique({
                where: {
                    appointment_id: parseInt(appointmentId)
                },
                include: {
                    customer: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true
                        }
                    }
                }
            });

            if (!appointment) {
                return res.status(404).json({ error: 'Appointment not found' });
            }

            if (appointment.provider_id !== providerId) {
                return res.status(403).json({ error: 'Unauthorized access to this appointment' });
            }

            // Combine date and time
            const newScheduledDate = new Date(`${newDate}T${newTime}`);
            
            // Update the appointment
            const updatedBooking = await prisma.appointment.update({
                where: {
                    appointment_id: parseInt(appointmentId)
                },
                data: {
                    scheduled_date: newScheduledDate,
                    appointment_status: 'confirmed', // Keep as confirmed after reschedule
                    ...(reason && { cancellation_reason: `Rescheduled: ${reason}` })
                }
            });

            // Here you could add notification logic
            // await this.sendRescheduleNotification(updatedBooking, appointment.customer);

            res.json({ 
                success: true, 
                message: 'Booking rescheduled successfully',
                appointment: updatedBooking 
            });
        } catch (error) {
            console.error('Error rescheduling booking:', error);
            res.status(500).json({ 
                error: 'Failed to reschedule booking',
                details: error.message 
            });
        }
    }

    // Get recent bookings for dashboard
    async getRecentBookings(req, res) {
        try {
            const providerId = req.user?.provider_id || req.session?.provider_id;
            
            if (!providerId) {
                return res.status(401).json({ error: 'Provider authentication required' });
            }

            const recentBookings = await prisma.appointment.findMany({
                where: {
                    provider_id: providerId
                },
                include: {
                    customer: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    },
                    service: {
                        select: {
                            service_title: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                take: 5
            });

            res.json({ 
                success: true, 
                bookings: recentBookings 
            });
        } catch (error) {
            console.error('Error fetching recent bookings:', error);
            res.status(500).json({ 
                error: 'Failed to fetch recent bookings',
                details: error.message 
            });
        }
    }

    // Helper method to calculate average rating
    calculateAverageRating(bookings) {
        const ratingsData = bookings
            .filter(b => b.appointment_rating && b.appointment_rating.length > 0)
            .flatMap(b => b.appointment_rating);
        
        if (ratingsData.length === 0) return 0;
        
        const sum = ratingsData.reduce((acc, rating) => acc + rating.rating_value, 0);
        return parseFloat((sum / ratingsData.length).toFixed(1));
    }

    // Helper method to send notifications (placeholder)
    async sendStatusUpdateNotification(booking) {
        // Implement notification logic here
        // This could send email, SMS, or push notifications
        console.log(`Notification: Booking ${booking.appointment_id} status updated to ${booking.appointment_status}`);
    }

    // Helper method to send reschedule notifications (placeholder)
    async sendRescheduleNotification(booking, customer) {
        // Implement notification logic here
        console.log(`Notification: Booking ${booking.appointment_id} rescheduled for ${customer.first_name} ${customer.last_name}`);
    }
}

export default new BookingController();
