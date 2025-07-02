const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetWeeklyAvailability() {
    try {
        console.log('🔄 Resetting weekly availability slots...');
        
        // Reset all availability slots to be available (isBooked = false)
        // This simulates the start of a new week
        const result = await prisma.availability.updateMany({
            where: {
                availability_isBooked: true
            },
            data: {
                availability_isBooked: false
            }
        });
        
        console.log(`✅ Reset ${result.count} weekly availability slots.`);
        
        // Show current availability status
        const totalSlots = await prisma.availability.count({
            where: {
                availability_isActive: true
            }
        });
        
        const availableSlots = await prisma.availability.count({
            where: {
                availability_isActive: true,
                availability_isBooked: false
            }
        });
        
        const bookedSlots = await prisma.availability.count({
            where: {
                availability_isActive: true,
                availability_isBooked: true
            }
        });
        
        console.log('📊 Weekly Availability Summary:');
        console.log(`   Total active slots: ${totalSlots}`);
        console.log(`   Available slots: ${availableSlots}`);
        console.log(`   Booked slots: ${bookedSlots}`);
        
        // Optional: Update appointment statuses for new week
        // You might want to mark old appointments as 'completed' or 'expired'
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const oldAppointments = await prisma.appointment.updateMany({
            where: {
                scheduled_date: {
                    lt: oneWeekAgo
                },
                appointment_status: {
                    in: ['accepted', 'on the way']
                }
            },
            data: {
                appointment_status: 'finished' // or 'expired'
            }
        });
        
        console.log(`📅 Marked ${oldAppointments.count} old appointments as finished.`);
        
        console.log('✅ Weekly reset completed successfully!');
        
    } catch (error) {
        console.error('❌ Error resetting weekly availability:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Check if this script is being run directly
if (require.main === module) {
    resetWeeklyAvailability();
}

module.exports = { resetWeeklyAvailability };
