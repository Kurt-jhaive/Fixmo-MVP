const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestCustomer() {
    try {
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        const customer = await prisma.user.upsert({
            where: { email: 'testcustomer@example.com' },
            update: {
                password: hashedPassword
            },
            create: {
                first_name: 'Test',
                last_name: 'Customer',
                userName: 'testcustomer',
                email: 'testcustomer@example.com',
                password: hashedPassword,
                phone_number: '1234567890',
                is_verified: true
            }
        });
        
        console.log('Test customer created/updated:', customer);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

createTestCustomer();
