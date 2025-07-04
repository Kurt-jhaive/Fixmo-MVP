import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestCustomer() {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: 'testuser@example.com' }
        });
        
        if (existingUser) {
            console.log('Test user already exists');
            return;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash('testpassword123', 10);
        
        // Create user
        const user = await prisma.user.create({
            data: {
                first_name: 'Test',
                last_name: 'User',
                userName: 'testuser',
                email: 'testuser@example.com',
                password: hashedPassword,
                phone_number: '09123456789',
                user_location: 'Test Location',
                is_activated: true,
                is_verified: true
            }
        });
        
        console.log('Test customer created:', {
            user_id: user.user_id,
            email: user.email,
            userName: user.userName
        });
        
        console.log('Login credentials:');
        console.log('Email: testuser@example.com');
        console.log('Password: testpassword123');
        
    } catch (error) {
        console.error('Error creating test customer:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestCustomer();
