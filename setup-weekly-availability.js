import prisma from './src/prismaclient.js';

async function setupWeeklyAvailability() {
    try {
        console.log('Setting up weekly availability for provider...');
        
        // First, let's check what providers exist
        const providers = await prisma.serviceProviderDetails.findMany({
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true
            }
        });
        
        console.log('Available providers:');
        providers.forEach(provider => {
            console.log(`- ID: ${provider.provider_id}, Name: ${provider.provider_first_name} ${provider.provider_last_name}`);
        });
        
        if (providers.length === 0) {
            console.log('No providers found. Please create a provider first.');
            return;
        }
        
        // Use the first provider for setup
        const providerId = providers[0].provider_id;
        console.log(`\nSetting up weekly availability for Provider ID: ${providerId}`);
        
        // Clear existing availability for this provider
        await prisma.availability.deleteMany({
            where: { provider_id: providerId }
        });
        
        // Define weekly schedule
        const weeklySchedule = [
            // Monday
            { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' },
            { dayOfWeek: 'Monday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Monday', startTime: '11:00', endTime: '12:00' },
            { dayOfWeek: 'Monday', startTime: '14:00', endTime: '15:00' },
            { dayOfWeek: 'Monday', startTime: '15:00', endTime: '16:00' },
            
            // Tuesday
            { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00' },
            { dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Tuesday', startTime: '14:00', endTime: '15:00' },
            { dayOfWeek: 'Tuesday', startTime: '15:00', endTime: '16:00' },
            { dayOfWeek: 'Tuesday', startTime: '16:00', endTime: '17:00' },
            
            // Wednesday
            { dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '09:00' },
            { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00' },
            { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '15:00' },
            
            // Thursday
            { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '10:00' },
            { dayOfWeek: 'Thursday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Thursday', startTime: '11:00', endTime: '12:00' },
            { dayOfWeek: 'Thursday', startTime: '15:00', endTime: '16:00' },
            { dayOfWeek: 'Thursday', startTime: '16:00', endTime: '17:00' },
            
            // Friday
            { dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00' },
            { dayOfWeek: 'Friday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Friday', startTime: '14:00', endTime: '15:00' },
            { dayOfWeek: 'Friday', startTime: '15:00', endTime: '16:00' },
            
            // Saturday (weekend hours)
            { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 'Saturday', startTime: '11:00', endTime: '12:00' },
            { dayOfWeek: 'Saturday', startTime: '14:00', endTime: '15:00' }
            
            // Sunday - No availability (day off)
        ];
        
        // Create availability slots
        for (const slot of weeklySchedule) {
            await prisma.availability.create({
                data: {
                    provider_id: providerId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    availability_isActive: true
                }
            });
        }
        
        console.log(`✅ Created ${weeklySchedule.length} weekly availability slots for Provider ${providerId}`);
        
        // Show summary by day
        console.log('\nWeekly Schedule Summary:');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        for (const day of days) {
            const daySlots = weeklySchedule.filter(slot => slot.dayOfWeek === day);
            if (daySlots.length > 0) {
                const times = daySlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ');
                console.log(`${day}: ${times}`);
            } else {
                console.log(`${day}: No availability (day off)`);
            }
        }
        
        // Set up availability for provider 2 as well if it exists
        if (providers.length > 1) {
            const provider2Id = providers[1].provider_id;
            console.log(`\nSetting up availability for Provider ID: ${provider2Id} as well...`);
            
            // Clear existing availability
            await prisma.availability.deleteMany({
                where: { provider_id: provider2Id }
            });
            
            // Slightly different schedule for provider 2
            const schedule2 = [
                // Monday
                { dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:00' },
                { dayOfWeek: 'Monday', startTime: '13:00', endTime: '14:00' },
                { dayOfWeek: 'Monday', startTime: '14:00', endTime: '15:00' },
                
                // Tuesday  
                { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00' },
                { dayOfWeek: 'Tuesday', startTime: '11:00', endTime: '12:00' },
                { dayOfWeek: 'Tuesday', startTime: '15:00', endTime: '16:00' },
                
                // Wednesday
                { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:00' },
                { dayOfWeek: 'Wednesday', startTime: '16:00', endTime: '17:00' },
                
                // Friday
                { dayOfWeek: 'Friday', startTime: '08:00', endTime: '09:00' },
                { dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00' },
                { dayOfWeek: 'Friday', startTime: '13:00', endTime: '14:00' }
            ];
            
            for (const slot of schedule2) {
                await prisma.availability.create({
                    data: {
                        provider_id: provider2Id,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        availability_isActive: true
                    }
                });
            }
            
            console.log(`✅ Created ${schedule2.length} weekly availability slots for Provider ${provider2Id}`);
        }
        
        console.log('\n✅ Weekly availability setup complete!');
        console.log('You can now test the booking system with weekly recurring schedules.');
        
    } catch (error) {
        console.error('Error setting up weekly availability:', error);
    } finally {
        await prisma.$disconnect();
    }
}

setupWeeklyAvailability();
