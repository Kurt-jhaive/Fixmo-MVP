const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServiceListings() {
    try {
        console.log('=== SERVICE LISTINGS ===');
        
        const listings = await prisma.serviceListing.findMany({
            include: {
                provider: {
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
                service_listing_id: 'asc'
            }
        });
        
        console.log('Total service listings:', listings.length);
        console.log('\nListing details:');
        
        listings.forEach(listing => {
            console.log('Service ID:', listing.service_listing_id);
            console.log('Service:', listing.service_listing_title);
            console.log('Description:', listing.service_listing_description);
            console.log('Price:', listing.service_listing_price);
            console.log('Provider:', listing.provider ? listing.provider.provider_first_name + ' ' + listing.provider.provider_last_name : 'No provider');
            console.log('Provider Verified:', listing.provider ? listing.provider.provider_isVerified : false);
            console.log('Provider Activated:', listing.provider ? listing.provider.provider_isActivated : false);
            console.log('---');
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkServiceListings();
