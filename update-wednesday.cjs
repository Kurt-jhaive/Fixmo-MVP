const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addWednesdayAvailability() {
    try {
        // Add availability for Wednesday
        const result = await prisma.availability.updateMany({
            where: {
                provider_id: 2,
                dayOfWeek: 'Wednesday'
            },
            data: {
                availability_isActive: true
            }
        });
        
        console.log('Updated Wednesday availability to active:', result.count);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

addWednesdayAvailability();
