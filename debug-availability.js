import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAvailability() {
  try {
    console.log('=== Checking Availability Table ===');
    const availability = await prisma.availability.findMany({
      include: {
        serviceProvider: {
          select: {
            provider_first_name: true,
            provider_last_name: true
          }
        }
      }
    });
    
    console.log('Total availability records:', availability.length);
    availability.forEach((avail, index) => {
      console.log(`${index + 1}. Provider: ${avail.serviceProvider.provider_first_name} ${avail.serviceProvider.provider_last_name}`);
      console.log(`   Day: ${avail.dayOfWeek}, Time: ${avail.startTime} - ${avail.endTime}`);
      console.log(`   Active: ${avail.availability_isActive}, Booked: ${avail.availability_isBooked}`);
      console.log(`   Provider ID: ${avail.provider_id}`);
      console.log('');
    });
    
    // Check specific Monday availability
    console.log('=== Monday Availability ===');
    const mondayAvail = await prisma.availability.findMany({
      where: {
        dayOfWeek: 'Monday'
      }
    });
    console.log('Monday slots:', mondayAvail.length);
    mondayAvail.forEach(slot => {
      console.log(`Provider ${slot.provider_id}: ${slot.startTime}-${slot.endTime} (Active: ${slot.availability_isActive}, Booked: ${slot.availability_isBooked})`);
    });
    
    // Check service listings to get provider IDs
    console.log('=== Service Listings ===');
    const services = await prisma.serviceListing.findMany({
      select: {
        service_id: true,
        service_title: true,
        provider_id: true,
        serviceProvider: {
          select: {
            provider_first_name: true,
            provider_last_name: true
          }
        }
      }
    });
    
    console.log('Service listings with provider IDs:');
    services.forEach(service => {
      console.log(`Service ID: ${service.service_id}, Provider ID: ${service.provider_id}, Title: ${service.service_title}`);
      console.log(`Provider: ${service.serviceProvider.provider_first_name} ${service.serviceProvider.provider_last_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailability();
