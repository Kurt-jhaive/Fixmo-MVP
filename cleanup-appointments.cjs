const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupInvalidAppointments() {
    try {
        // Delete appointments that don't have matching availability slots
        const deleted = await prisma.appointment.deleteMany({
            where: {
                // Delete all existing appointments since they were made with the old system
                appointment_id: {
                    gte: 1
                }
            }
        });

        console.log(`Deleted ${deleted.count} appointments from the old booking system`);

        // Reset all availability slots to not booked
        const resetSlots = await prisma.availability.updateMany({
            where: {},
            data: {
                availability_isBooked: false
            }
        });

        console.log(`Reset ${resetSlots.count} availability slots to not booked`);

        console.log('\n✅ Database cleaned up and ready for new exact slot booking system');

    } catch (error) {
        console.error('Error cleaning up appointments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupInvalidAppointments();
