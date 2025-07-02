const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAppointments() {
    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                provider_id: 2,
                scheduled_date: {
                    gte: new Date('2025-07-08T00:00:00.000Z'),
                    lt: new Date('2025-07-08T23:59:59.999Z')
                }
            }
        });
        
        console.log('Appointments for Provider 2 on 2025-07-08:');
        appointments.forEach(apt => {
            console.log(`- ${apt.scheduled_date} (${apt.appointment_status})`);
        });
        
        if (appointments.length === 0) {
            console.log('No appointments found for this date');
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAppointments();
