// Debug script to check service_picture field in database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServices() {
    try {
        const services = await prisma.serviceListing.findMany({
            select: {
                service_id: true,
                service_title: true,
                service_picture: true
            }
        });

        console.log('Services in database:');
        services.forEach(service => {
            console.log(`- ID: ${service.service_id}, Title: ${service.service_title}, Picture: ${service.service_picture || 'NULL'}`);
        });
        
        console.log(`\nTotal services: ${services.length}`);
        console.log(`Services with pictures: ${services.filter(s => s.service_picture).length}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkServices();
