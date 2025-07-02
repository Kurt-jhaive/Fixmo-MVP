const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomers() {
    try {
        const customers = await prisma.user.findMany({
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                userName: true,
                is_verified: true
            }
        });
        
        console.log('=== CUSTOMERS ===');
        customers.forEach(customer => {
            console.log(`ID: ${customer.user_id}, Name: ${customer.first_name} ${customer.last_name}, Email: ${customer.email}, Username: ${customer.userName}, Verified: ${customer.is_verified}`);
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkCustomers();
