const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAvailabilityTable() {
    try {
        console.log('=== FULL AVAILABILITY TABLE ===');
        
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
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        
        console.log('Total records:', availability.length);
        console.log('\nDetailed availability records:');
        
        availability.forEach((record, index) => {
            console.log(`[${index + 1}] ID: ${record.availability_id}`);
            console.log(`  Provider: ${record.provider_id} (${record.serviceProvider.provider_first_name} ${record.serviceProvider.provider_last_name})`);
            console.log(`  Day: ${record.dayOfWeek}`);
            console.log(`  Time: ${record.startTime} - ${record.endTime}`);
            console.log(`  Active: ${record.availability_isActive}`);
            console.log(`  Booked: ${record.availability_isBooked}`);
            console.log('');
        });
        
        // Group by provider and day
        console.log('\n=== SUMMARY BY PROVIDER ===');
        const grouped = {};
        availability.forEach(record => {
            const key = `Provider ${record.provider_id} (${record.serviceProvider.provider_first_name})`;
            if (!grouped[key]) grouped[key] = {};
            if (!grouped[key][record.dayOfWeek]) grouped[key][record.dayOfWeek] = [];
            grouped[key][record.dayOfWeek].push({
                time: `${record.startTime}-${record.endTime}`,
                active: record.availability_isActive
            });
        });
        
        Object.keys(grouped).forEach(provider => {
            console.log(`\n${provider}:`);
            Object.keys(grouped[provider]).forEach(day => {
                const slots = grouped[provider][day];
                const activeSlots = slots.filter(s => s.active);
                console.log(`  ${day}: ${slots.map(s => s.time + (s.active ? ' (ACTIVE)' : ' (inactive)')).join(', ')}`);
            });
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAvailabilityTable();
