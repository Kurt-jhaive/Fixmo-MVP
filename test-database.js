import prisma from './src/prismaclient.js';

async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing database connection and models...');
        
        // Test 1: Check if customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: 1 }
        });
        console.log('Customer 1 exists:', !!customer);
        if (customer) {
            console.log('Customer name:', customer.first_name, customer.last_name);
        }
        
        // Test 2: Check if provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: 2 }
        });
        console.log('Provider 2 exists:', !!provider);
        if (provider) {
            console.log('Provider name:', provider.provider_first_name, provider.provider_last_name);
        }
        
        // Test 3: Check if service listing exists
        const serviceListing = await prisma.serviceListing.findUnique({
            where: { service_id: 2 }
        });
        console.log('Service listing 2 exists:', !!serviceListing);
        if (serviceListing) {
            console.log('Service title:', serviceListing.service_title);
            console.log('Service provider ID:', serviceListing.provider_id);
        }
        
        // Test 4: Check availability slot
        const availability = await prisma.availability.findFirst({
            where: {
                provider_id: 2,
                dayOfWeek: 'Monday',
                startTime: '08:00'
            }
        });
        console.log('Availability slot exists:', !!availability);
        if (availability) {
            console.log('Slot details:', {
                availability_id: availability.availability_id,
                dayOfWeek: availability.dayOfWeek,
                startTime: availability.startTime,
                isBooked: availability.availability_isBooked
            });
        }
        
        // Test 5: Try creating an appointment directly
        console.log('\n🧪 Testing appointment creation...');
        
        const scheduledDateTime = new Date('2025-07-07T08:00:00');
        console.log('Scheduled DateTime:', scheduledDateTime);
        
        const appointmentData = {
            customer_id: 1,
            provider_id: 2,
            appointment_status: 'accepted',
            scheduled_date: scheduledDateTime,
            final_price: 100.0,
            repairDescription: 'Test booking'
        };
        
        console.log('Appointment data to create:', appointmentData);
        
        const newAppointment = await prisma.appointment.create({
            data: appointmentData,
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            }
        });
        
        console.log('✅ Appointment created successfully!');
        console.log('Appointment ID:', newAppointment.appointment_id);
        console.log('Customer:', newAppointment.customer.first_name, newAppointment.customer.last_name);
        console.log('Provider:', newAppointment.serviceProvider.provider_first_name, newAppointment.serviceProvider.provider_last_name);
        
    } catch (error) {
        console.error('❌ Error during database test:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        if (error.meta) {
            console.error('Error meta:', error.meta);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testDatabaseConnection();
