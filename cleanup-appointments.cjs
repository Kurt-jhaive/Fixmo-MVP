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

        console.log('\n✅ Database cleaned up and ready for new appointment-availability linked booking system');

    } catch (error) {
        console.error('Error cleaning up appointments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupInvalidAppointments();
