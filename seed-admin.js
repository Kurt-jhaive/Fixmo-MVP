import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseContents() {
  try {
    console.log('Checking database contents...\n');
    
    // Check Users
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);
    if (userCount > 0) {
      const users = await prisma.user.findMany({ take: 3 });
      console.log('Sample users:', users.map(u => ({ id: u.user_id, email: u.email, name: `${u.first_name} ${u.last_name}` })));
    }

    // Check Service Providers
    const providerCount = await prisma.serviceProviderDetails.count();
    console.log(`\nService Providers: ${providerCount}`);
    if (providerCount > 0) {
      const providers = await prisma.serviceProviderDetails.findMany({ take: 3 });
      console.log('Sample providers:', providers.map(p => ({ id: p.provider_id, email: p.provider_email, name: `${p.provider_first_name} ${p.provider_last_name}` })));
    }

    // Check Certificates
    const certCount = await prisma.certificate.count();
    console.log(`\nCertificates: ${certCount}`);
    if (certCount > 0) {
      const certs = await prisma.certificate.findMany({ take: 3 });
      console.log('Sample certificates:', certs.map(c => ({ id: c.certificate_id, name: c.certificate_name, status: c.certificate_status })));
    }

    // Check Appointments
    const appointmentCount = await prisma.appointment.count();
    console.log(`\nAppointments: ${appointmentCount}`);

    // Check Service Listings
    const serviceCount = await prisma.serviceListing.count();
    console.log(`\nService Listings: ${serviceCount}`);

    // Check Admins
    const adminCount = await prisma.admin.count();
    console.log(`\nAdmins: ${adminCount}`);

    console.log('\n=== Database status check complete ===');

  } catch (error) {
    console.error('Error checking database contents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseContents();
