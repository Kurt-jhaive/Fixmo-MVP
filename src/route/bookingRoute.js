// Booking Routes for Provider Dashboard
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
    getAllAppointments, 
    getAppointmentById, 
    updateAppointmentStatus,
    getProviderAppointments
} from '../controller/appointmentController.js';

// Import authentication middleware
import authMiddleware from '../middleware/authMiddleware.js';
import { requireProviderSession } from '../middleware/sessionAuth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all booking routes
router.use(requireProviderSession);

// Get all bookings for provider (using existing appointment controller)
router.get('/provider', async (req, res) => {
    try {
        const providerId = req.user?.id || req.userId;
        
        if (!providerId) {
            return res.status(401).json({ error: 'Provider authentication required' });
        }

        // Set provider_id in query params for the existing controller
        req.query.provider_id = providerId;
        req.query.limit = 100; // Get more appointments for the dashboard
        
        // Create a custom response handler to match our expected format
        const originalSend = res.json;
        res.json = function(data) {
            // Transform the response to match booking manager expectations
            if (data.success && data.data) {
                return originalSend.call(this, {
                    success: true,
                    appointments: data.data,
                    total: data.pagination?.total_count || data.data.length
                });
            }
            return originalSend.call(this, data);
        };
        
        // Call the existing appointment controller
        return await getAllAppointments(req, res);
    } catch (error) {
        console.error('Error fetching provider bookings:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bookings',
            details: error.message 
        });
    }
});

// Get booking statistics for provider
router.get('/provider/stats', async (req, res) => {
    try {
        const providerId = req.user?.id || req.userId;
        
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
            averageRating: calculateAverageRating(bookings)
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching booking stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch booking statistics',
            details: error.message 
        });
    }
});

// Get specific booking details (using existing appointment controller)
router.get('/:appointmentId', getAppointmentById);

// Update booking status (using existing appointment controller)
router.put('/:appointmentId/status', updateAppointmentStatus);

// Reschedule booking
router.put('/:appointmentId/reschedule', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { newDate, newTime, reason } = req.body;
        const providerId = req.user?.id || req.userId;
        
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
});

// Helper function to calculate average rating
function calculateAverageRating(bookings) {
    const ratingsData = bookings
        .filter(b => b.appointment_rating && b.appointment_rating.length > 0)
        .flatMap(b => b.appointment_rating);
    
    if (ratingsData.length === 0) return 0;
    
    const sum = ratingsData.reduce((acc, rating) => acc + rating.rating_value, 0);
    return parseFloat((sum / ratingsData.length).toFixed(1));
}

export default router;
