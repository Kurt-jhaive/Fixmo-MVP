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

            // Instead of deleting all, we need to handle availability slots more carefully
            // to avoid foreign key constraint violations
            
            // First, get existing availability slots that have appointments
            const slotsWithAppointments = await prisma.availability.findMany({
                where: {
                    provider_id: providerId,
                    appointments: {
                        some: {} // Has at least one appointment
                    }
                },
                select: {
                    availability_id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true
                }
            });

            console.log(`Found ${slotsWithAppointments.length} slots with appointments`);

            // Delete only availability slots that don't have appointments
            await prisma.availability.deleteMany({
                where: {
                    provider_id: providerId,
                    appointments: {
                        none: {} // Has no appointments
                    }
                }
            });

            console.log('Deleted availability records without appointments');            // Process new availability records
            const availabilityRecords = [];
            const updatePromises = [];
            
            for (const dayData of availabilityData) {
                const { dayOfWeek, isAvailable, startTime, endTime } = dayData;
                
                // Save time slots if they exist, regardless of isAvailable status
                if (startTime && endTime) {
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

                    // Check if this slot already exists (especially those with appointments)
                    const existingSlot = slotsWithAppointments.find(slot => 
                        slot.dayOfWeek === dayOfWeek && 
                        slot.startTime === startTime && 
                        slot.endTime === endTime
                    );

                    if (existingSlot) {
                        // Update existing slot that has appointments
                        updatePromises.push(
                            prisma.availability.update({
                                where: { availability_id: existingSlot.availability_id },
                                data: { availability_isActive: isAvailable }
                            })
                        );
                    } else {
                        // Create new slot
                        availabilityRecords.push({
                            provider_id: providerId,
                            dayOfWeek: dayOfWeek,
                            startTime: startTime,
                            endTime: endTime,
                            availability_isActive: isAvailable // Store the checkbox state
                        });
                    }
                }
            }

            // Execute updates for existing slots with appointments
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                console.log(`Updated ${updatePromises.length} existing slots with appointments`);
            }

            // Create new slots
            if (availabilityRecords.length > 0) {
                await prisma.availability.createMany({
                    data: availabilityRecords
                });
                console.log(`Created ${availabilityRecords.length} new availability records`);
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
    }    // Get availability summary
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

            const activeSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId,
                    availability_isActive: true
                }
            });

            // Count booked slots by counting availabilities that have appointments
            const bookedSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId,
                    availability_isActive: true,
                    appointments: {
                        some: {} // Has at least one appointment
                    }
                }
            });

            const availableSlots = activeSlots - bookedSlots;
            const configuredSlots = totalSlots - activeSlots;

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

            // Get active days count
            const activeDays = await prisma.availability.groupBy({
                by: ['dayOfWeek'],
                where: {
                    provider_id: providerId,
                    availability_isActive: true
                },
                _count: {
                    availability_id: true
                }
            });

            res.json({
                success: true,
                data: {
                    totalSlots,
                    activeSlots,
                    bookedSlots,
                    availableSlots,
                    configuredSlots,
                    activeDays: activeDays.length,
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
