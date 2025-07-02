import prisma from './src/prismaclient.js';

async function checkServices() {
    try {
        const serviceCount = await prisma.serviceListing.count();
        const providerCount = await prisma.serviceProvider.count();
        
        console.log('=== DATABASE CHECK ===');
        console.log('Service Listings:', serviceCount);
        console.log('Service Providers:', providerCount);
        
        if (serviceCount > 0) {
            const services = await prisma.serviceListing.findMany({
                take: 3,
                include: {
                    serviceProvider: true,
                    specific_services: {
                        include: {
                            category: true
                        }
                    }
                }
            });
            
            console.log('\nFirst 3 services:');
            services.forEach((service, index) => {
                console.log(`${index + 1}. ${service.service_title} by ${service.serviceProvider.provider_first_name} ${service.serviceProvider.provider_last_name}`);
                console.log(`   Price: $${service.service_startingprice}`);
                console.log(`   Provider Verified: ${service.serviceProvider.provider_isVerified}`);
                console.log(`   Provider Activated: ${service.serviceProvider.provider_isActivated}`);
            });
        }
        
    } catch (error) {
        console.error('Error checking services:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkServices();
