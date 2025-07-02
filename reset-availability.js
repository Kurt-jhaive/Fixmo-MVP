import prisma from './src/prismaclient.js';

async function resetAvailabilitySlots() {
    try {
        console.log('Resetting availability slots...');
        
        // Reset all availability slots to be available (isBooked = false)
        const result = await prisma.availability.updateMany({
            where: {
                availability_isBooked: true
            },
            data: {
                availability_isBooked: false
            }
        });
        
        console.log(`Reset ${result.count} availability slots to be available again.`);
        
        // Show current availability status
        const availabilityCount = await prisma.availability.count({
            where: {
                availability_isActive: true,
                availability_isBooked: false
            }
        });
        
        console.log(`Total available slots now: ${availabilityCount}`);
        
    } catch (error) {
        console.error('Error resetting availability slots:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAvailabilitySlots();
