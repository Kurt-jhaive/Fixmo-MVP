const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAvailability() {
    try {
        console.log('=== ALL PROVIDERS AVAILABILITY ===');
        
        const availability = await prisma.availability.findMany({
            include: {
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            },
            orderBy: [
                { provider_id: 'asc' },
                { dayOfWeek: 'asc' }
            ]
        });
        
        let currentProviderId = null;
        availability.forEach(slot => {
            if (slot.provider_id !== currentProviderId) {
                currentProviderId = slot.provider_id;
                console.log(`\n--- Provider ${slot.provider_id}: ${slot.serviceProvider.provider_first_name} ${slot.serviceProvider.provider_last_name} ---`);
            }
            console.log(`  ${slot.dayOfWeek}: ${slot.startTime} - ${slot.endTime} (Active: ${slot.availability_isActive})`);
        });
        
        console.log('\n=== SUMMARY ===');
        const activeSlots = availability.filter(slot => slot.availability_isActive);
        console.log(`Total active availability slots: ${activeSlots.length}`);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAvailability();
