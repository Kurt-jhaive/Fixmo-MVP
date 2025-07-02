import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProviders() {
    try {
        console.log('=== CHECKING PROVIDERS ===');
        
        // Check total service provider count
        const totalProviders = await prisma.serviceProviderDetails.count();
        console.log('Total providers:', totalProviders);
        
        // Check verified/activated providers
        const verifiedProviders = await prisma.serviceProviderDetails.count({
            where: {
                provider_isVerified: true,
                provider_isActivated: true
            }
        });
        console.log('Verified & Activated providers:', verifiedProviders);
        
        // Check service listings count
        const totalListings = await prisma.serviceListing.count();
        console.log('Total service listings:', totalListings);
        
        // Check service listings with verified providers
        const verifiedListings = await prisma.serviceListing.count({
            where: {
                serviceProvider: {
                    provider_isVerified: true,
                    provider_isActivated: true
                }
            }
        });
        console.log('Service listings with verified providers:', verifiedListings);
        
        // Show first few providers with their status
        const providers = await prisma.serviceProviderDetails.findMany({
            take: 5,
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_isVerified: true,
                provider_isActivated: true
            }
        });
        
        console.log('\nFirst 5 providers:');
        providers.forEach(p => {
            console.log(`${p.provider_id}: ${p.provider_first_name} ${p.provider_last_name} - Verified: ${p.provider_isVerified}, Activated: ${p.provider_isActivated}`);
        });
        
        // If no verified providers, let's activate them
        if (verifiedProviders === 0 && totalProviders > 0) {
            console.log('\n=== ACTIVATING PROVIDERS ===');
            const result = await prisma.serviceProviderDetails.updateMany({
                data: {
                    provider_isVerified: true,
                    provider_isActivated: true
                }
            });
            console.log(`Activated ${result.count} providers`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProviders();
