import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class AvailabilityController {
    // Get provider's availability
    static async getProviderAvailability(req, res) {
        try {
            console.log('Getting provider availability for provider:', req.userId);
            
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const availability = await prisma.availability.findMany({
                where: {
                    provider_id: providerId
                },
                orderBy: [
                    {
                        dayOfWeek: 'asc'
                    },
                    {
                        startTime: 'asc'
                    }
                ]
            });

            console.log(`Found ${availability.length} availability records for provider ${providerId}`);

            res.json({
                success: true,
                data: availability
            });

        } catch (error) {
            console.error('Error fetching availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching availability'
            });
        }
    }

    // Set or update provider's availability
    static async setProviderAvailability(req, res) {
        try {
            console.log('Setting provider availability for provider:', req.userId);
            console.log('Availability data:', req.body);
            
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const { availabilityData } = req.body;

            if (!Array.isArray(availabilityData)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid availability data format'
                });
            }

            // Delete existing availability for this provider
            await prisma.availability.deleteMany({
                where: {
                    provider_id: providerId
                }
            });

            console.log('Deleted existing availability records');

            // Insert new availability records
            const availabilityRecords = [];
            
            for (const dayData of availabilityData) {
                const { dayOfWeek, isAvailable, startTime, endTime } = dayData;
                
                if (isAvailable && startTime && endTime) {
                    // Validate time format
                    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid time format for ${dayOfWeek}`
                        });
                    }

                    // Check if end time is after start time
                    if (startTime >= endTime) {
                        return res.status(400).json({
                            success: false,
                            message: `End time must be after start time for ${dayOfWeek}`
                        });
                    }

                    availabilityRecords.push({
                        provider_id: providerId,
                        dayOfWeek: dayOfWeek,
                        startTime: startTime,
                        endTime: endTime,
                        availability_isBooked: false
                    });
                }
            }

            if (availabilityRecords.length > 0) {
                await prisma.availability.createMany({
                    data: availabilityRecords
                });
                console.log(`Created ${availabilityRecords.length} availability records`);
            }

            res.json({
                success: true,
                message: 'Availability updated successfully',
                data: availabilityRecords
            });

        } catch (error) {
            console.error('Error setting availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating availability'
            });
        }
    }

    // Delete specific availability record
    static async deleteAvailability(req, res) {
        try {
            const { availabilityId } = req.params;
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if the availability belongs to the provider
            const availability = await prisma.availability.findFirst({
                where: {
                    availability_id: parseInt(availabilityId),
                    provider_id: providerId
                }
            });

            if (!availability) {
                return res.status(404).json({
                    success: false,
                    message: 'Availability record not found'
                });
            }

            // Check if the availability is booked
            if (availability.availability_isBooked) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete booked availability'
                });
            }

            await prisma.availability.delete({
                where: {
                    availability_id: parseInt(availabilityId)
                }
            });

            console.log(`Deleted availability record ${availabilityId} for provider ${providerId}`);            res.json({
                success: true,
                message: 'Availability deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting availability'
            });
        }
    }

    // Get availability summary
    static async getAvailabilitySummary(req, res) {
        try {
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const totalSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId
                }
            });

            const bookedSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId,
                    availability_isBooked: true
                }
            });

            const availableSlots = totalSlots - bookedSlots;

            // Get availability by day
            const availabilityByDay = await prisma.availability.groupBy({
                by: ['dayOfWeek'],
                where: {
                    provider_id: providerId
                },
                _count: {
                    availability_id: true
                }
            });

            res.json({
                success: true,
                data: {
                    totalSlots,
                    bookedSlots,
                    availableSlots,
                    availabilityByDay
                }
            });

        } catch (error) {
            console.error('Error getting availability summary:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting availability summary'
            });
        }
    }
}

export default AvailabilityController;
