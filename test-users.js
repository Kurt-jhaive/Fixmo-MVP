import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUsers() {
    try {
        const users = await prisma.user.findMany({ 
            select: { 
                user_id: true, 
                email: true, 
                userName: true 
            } 
        });
        console.log('Users:', users);
        console.log('Total users:', users.length);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testUsers();
