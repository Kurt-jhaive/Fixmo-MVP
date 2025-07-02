const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncAvailabilityWithAppointments() {
    try {
        // Get all active appointments (accepted, on the way, finished)
        const activeAppointments = await prisma.appointment.findMany({
            where: {
                appointment_status: {
                    in: ['accepted', 'on the way', 'finished']
                }
            }
        });

        console.log(`Found ${activeAppointments.length} active appointments to sync`);

        for (const appointment of activeAppointments) {
            const dayOfWeek = appointment.scheduled_date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const startTime = appointment.scheduled_date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            console.log(`\nProcessing appointment ${appointment.appointment_id}:`);
            console.log(`  Provider: ${appointment.provider_id}`);
            console.log(`  Date: ${appointment.scheduled_date}`);
            console.log(`  Day: ${dayOfWeek}`);
            console.log(`  Time: ${startTime}`);

            // Find matching availability slot
            const availabilitySlot = await prisma.availability.findFirst({
                where: {
                    provider_id: appointment.provider_id,
                    dayOfWeek: dayOfWeek,
                    startTime: startTime,
                    availability_isActive: true
                }
            });

            if (availabilitySlot) {
                console.log(`  Found matching availability slot ${availabilitySlot.availability_id}`);
                
                // Mark as booked if not already booked
                if (!availabilitySlot.availability_isBooked) {
                    await prisma.availability.update({
                        where: { availability_id: availabilitySlot.availability_id },
                        data: { availability_isBooked: true }
                    });
                    console.log(`  ✅ Marked slot as booked`);
                } else {
                    console.log(`  ⚠️ Slot already marked as booked`);
                }
            } else {
                console.log(`  ❌ No matching availability slot found`);
            }
        }

        console.log('\n=== SYNC COMPLETE ===');

    } catch (error) {
        console.error('Error syncing availability with appointments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

syncAvailabilityWithAppointments();
