import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
    try {
        console.log('🌱 Seeding admin user...\n');

        // Check if admin already exists
        const existingAdmin = await prisma.admin.findFirst({
            where: { admin_email: 'admin@fixmo.com' }
        });

        if (existingAdmin) {
            console.log('✅ Admin user already exists:', existingAdmin.admin_email);
            console.log('   Username:', existingAdmin.admin_username);
            console.log('   Name:', existingAdmin.admin_name);
            console.log('   Role:', existingAdmin.admin_role);
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create admin user
        const admin = await prisma.admin.create({
            data: {
                admin_username: 'admin',
                admin_email: 'admin@fixmo.com',
                admin_password: hashedPassword,
                admin_name: 'Fixmo Administrator',
                admin_role: 'admin',
                is_active: true
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log('   ID:', admin.admin_id);
        console.log('   Username:', admin.admin_username);
        console.log('   Email:', admin.admin_email);
        console.log('   Name:', admin.admin_name);
        console.log('   Role:', admin.admin_role);
        
        console.log('\n🔑 Login Credentials:');
        console.log('   Username: admin');
        console.log('   Email: admin@fixmo.com');
        console.log('   Password: admin123');
        
        console.log('\n🌐 Access URLs:');
        console.log('   Admin Portal: http://localhost:3000/admin');
        console.log('   Direct Login: http://localhost:3000/admin-login');
        console.log('   Dashboard: http://localhost:3000/admin-dashboard');

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

seedAdmin();
