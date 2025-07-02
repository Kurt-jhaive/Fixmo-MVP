const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAppointmentStatuses() {
    try {
        // Update all pending appointments to accepted
        const updatedPending = await prisma.appointment.updateMany({
            where: {
                appointment_status: 'Pending'
            },
            data: {
                appointment_status: 'accepted'
            }
        });

        console.log(`Updated ${updatedPending.count} pending appointments to accepted`);

        // Update any other old statuses
        const updatedCompleted = await prisma.appointment.updateMany({
            where: {
                appointment_status: 'completed'
            },
            data: {
                appointment_status: 'finished'
            }
        });

        console.log(`Updated ${updatedCompleted.count} completed appointments to finished`);

        const updatedCancelled = await prisma.appointment.updateMany({
            where: {
                appointment_status: 'cancelled'
            },
            data: {
                appointment_status: 'canceled'
            }
        });

        console.log(`Updated ${updatedCancelled.count} cancelled appointments to canceled`);

        // Show all appointments with new statuses
        const allAppointments = await prisma.appointment.findMany({
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            }
        });

        console.log('\n=== ALL APPOINTMENTS WITH UPDATED STATUSES ===');
        allAppointments.forEach((apt, index) => {
            console.log(`[${index + 1}] ID: ${apt.appointment_id}`);
            console.log(`  Customer: ${apt.customer.first_name} ${apt.customer.last_name}`);
            console.log(`  Provider: ${apt.serviceProvider.provider_first_name} ${apt.serviceProvider.provider_last_name}`);
            console.log(`  Date/Time: ${apt.scheduled_date}`);
            console.log(`  Status: ${apt.appointment_status}`);
            console.log(`  Price: $${apt.final_price || 'N/A'}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error updating appointment statuses:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateAppointmentStatuses();
