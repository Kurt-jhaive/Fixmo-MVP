const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAppointments() {
    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                provider_id: 2
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'asc'
            }
        });
        
        console.log(`=== ALL APPOINTMENTS FOR PROVIDER 2 ===`);
        console.log(`Total appointments: ${appointments.length}`);
        
        if (appointments.length === 0) {
            console.log('No appointments found');
        } else {
            appointments.forEach((apt, index) => {
                console.log(`[${index + 1}] ID: ${apt.appointment_id}`);
                console.log(`  Customer: ${apt.customer.first_name} ${apt.customer.last_name} (${apt.customer.email})`);
                console.log(`  Date: ${apt.scheduled_date}`);
                console.log(`  Status: ${apt.appointment_status}`);
                console.log(`  Price: $${apt.final_price}`);
                console.log(`  Description: ${apt.repairDescription}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('Error checking appointments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllAppointments();
