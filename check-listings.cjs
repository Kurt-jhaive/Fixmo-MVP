const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServiceListings() {
    try {
        console.log('=== SERVICE LISTINGS ===');
        
        const listings = await prisma.serviceListing.findMany({
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_isVerified: true,
                        provider_isActivated: true
                    }
                }
            },
            orderBy: {
                service_id: 'asc'
            }
        });
        
        console.log('Total service listings:', listings.length);
        console.log('\nListing details:');
        
        listings.forEach(listing => {
            console.log('Service ID:', listing.service_id);
            console.log('Service:', listing.service_title);
            console.log('Description:', listing.service_description);
            console.log('Price:', listing.service_startingprice);
            console.log('Provider:', listing.serviceProvider ? listing.serviceProvider.provider_first_name + ' ' + listing.serviceProvider.provider_last_name : 'No provider');
            console.log('Provider Verified:', listing.serviceProvider ? listing.serviceProvider.provider_isVerified : false);
            console.log('Provider Activated:', listing.serviceProvider ? listing.serviceProvider.provider_isActivated : false);
            console.log('---');
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkServiceListings();
