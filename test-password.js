import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testPassword() {
    try {
        const user = await prisma.user.findUnique({ 
            where: { email: 'testcustomer@example.com' },
            select: { 
                user_id: true, 
                email: true, 
                userName: true,
                password: true 
            } 
        });
        
        if (user) {
            console.log('User found:', { 
                user_id: user.user_id, 
                email: user.email, 
                userName: user.userName,
                hasPassword: !!user.password 
            });
            
            // Test common passwords
            const testPasswords = ['testpass', 'password', '123456', 'test', 'testcustomer'];
            
            for (const pwd of testPasswords) {
                const isMatch = await bcrypt.compare(pwd, user.password);
                console.log(`Password "${pwd}":`, isMatch ? '✓ MATCH' : '✗ no match');
            }
            
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPassword();
