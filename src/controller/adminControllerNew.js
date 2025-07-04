import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

class AdminController {
    // Admin Authentication
    async adminLogin(req, res) {
        try {
            const { username, password } = req.body;

            // Find admin by username or email
            const admin = await prisma.admin.findFirst({
                where: {
                    OR: [
                        { admin_username: username },
                        { admin_email: username }
                    ]
                }
            });

            if (!admin) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, admin.admin_password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            await prisma.admin.update({
                where: { admin_id: admin.admin_id },
                data: { last_login: new Date() }
            });

            // Generate JWT token
            const token = jwt.sign(
                { 
                    adminId: admin.admin_id, 
                    username: admin.admin_username,
                    role: admin.admin_role
                },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                admin: {
                    id: admin.admin_id,
                    username: admin.admin_username,
                    email: admin.admin_email,
                    name: admin.admin_name,
                    role: admin.admin_role
                }
            });
        } catch (error) {
            console.error('Error in admin login:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async adminLogout(req, res) {
        try {
            res.json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Error in admin logout:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Dashboard Statistics
    async getDashboardStats(req, res) {
        try {
            const [
                totalUsers,
                totalProviders,
                totalCertificates,
                totalBookings,
                pendingUsers,
                pendingProviders,
                pendingCertificates,
                activeBookings
            ] = await Promise.all([
                prisma.user.count(),
                prisma.serviceProviderDetails.count(),
                prisma.certificate.count(),
                prisma.appointment.count(),
                prisma.user.count({ where: { is_verified: false } }),
                prisma.serviceProviderDetails.count({ where: { provider_isVerified: false } }),
                prisma.certificate.count({ where: { certificate_status: 'Pending' } }),
                prisma.appointment.count({ 
                    where: { 
                        appointment_status: { 
                            in: ['pending', 'confirmed', 'in-progress'] 
                        } 
                    } 
                })
            ]);

            res.json({
                totalUsers,
                totalProviders,
                totalCertificates,
                totalBookings,
                pendingUsers,
                pendingProviders,
                pendingCertificates,
                activeBookings
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Recent Activity
    async getRecentActivity(req, res) {
        try {
            const activities = [];

            // Get recent user registrations
            const recentUsers = await prisma.user.findMany({
                where: { is_verified: false },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    created_at: true
                }
            });

            recentUsers.forEach(user => {
                activities.push({
                    type: 'user',
                    title: 'New User Registration',
                    description: `${user.first_name} ${user.last_name} registered and is pending verification`,
                    created_at: user.created_at
                });
            });

            // Get recent provider registrations
            const recentProviders = await prisma.serviceProviderDetails.findMany({
                where: { provider_isVerified: false },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true,
                    created_at: true
                }
            });

            recentProviders.forEach(provider => {
                activities.push({
                    type: 'provider',
                    title: 'New Provider Registration',
                    description: `${provider.provider_first_name} ${provider.provider_last_name} registered and is pending verification`,
                    created_at: provider.created_at
                });
            });

            // Get recent certificate submissions
            const recentCertificates = await prisma.certificate.findMany({
                where: { certificate_status: 'Pending' },
                orderBy: { created_at: 'desc' },
                take: 5,
                include: {
                    provider: {
                        select: {
                            provider_first_name: true,
                            provider_last_name: true
                        }
                    }
                }
            });

            recentCertificates.forEach(cert => {
                activities.push({
                    type: 'certificate',
                    title: 'New Certificate Submission',
                    description: `${cert.provider.provider_first_name} ${cert.provider.provider_last_name} submitted ${cert.certificate_name}`,
                    created_at: cert.created_at
                });
            });

            // Sort all activities by date
            activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            res.json({ activities: activities.slice(0, 10) });
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // User Management
    async getUsers(req, res) {
        try {
            const users = await prisma.user.findMany({
                orderBy: { created_at: 'desc' },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    profile_photo: true,
                    valid_id: true,
                    userName: true,
                    is_verified: true,
                    is_activated: true,
                    created_at: true
                }
            });

            // Fix file paths to include /uploads/ prefix
            const usersWithFixedPaths = users.map(user => ({
                ...user,
                profile_photo: user.profile_photo ? `/uploads/${user.profile_photo}` : null,
                valid_id: user.valid_id ? `/uploads/${user.valid_id}` : null
            }));

            res.json({ users: usersWithFixedPaths });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUserById(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId) },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    profile_photo: true,
                    valid_id: true,
                    user_location: true,
                    exact_location: true,
                    userName: true,
                    is_verified: true,
                    is_activated: true,
                    birthday: true,
                    created_at: true
                }
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Fix file paths to include /uploads/ prefix
            const userWithFixedPaths = {
                ...user,
                profile_photo: user.profile_photo ? `/uploads/${user.profile_photo}` : null,
                valid_id: user.valid_id ? `/uploads/${user.valid_id}` : null
            };

            res.json({ user: userWithFixedPaths });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { is_verified: true }
            });

            res.json({ message: 'User verified successfully', user });
        } catch (error) {
            console.error('Error verifying user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async activateUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { is_activated: true }
            });

            res.json({ message: 'User activated successfully', user });
        } catch (error) {
            console.error('Error activating user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async deactivateUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { is_activated: false }
            });

            res.json({ message: 'User deactivated successfully', user });
        } catch (error) {
            console.error('Error deactivating user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Provider Management
    async getProviders(req, res) {
        try {
            const providers = await prisma.serviceProviderDetails.findMany({
                orderBy: { created_at: 'desc' },
                select: {
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true,
                    provider_email: true,
                    provider_phone_number: true,
                    provider_profile_photo: true,
                    provider_valid_id: true,
                    provider_userName: true,
                    provider_isVerified: true,
                    provider_isActivated: true,
                    provider_rating: true,
                    created_at: true
                }
            });

            // Fix file paths to include /uploads/ prefix
            const providersWithFixedPaths = providers.map(provider => ({
                ...provider,
                provider_profile_photo: provider.provider_profile_photo ? `/uploads/${provider.provider_profile_photo}` : null,
                provider_valid_id: provider.provider_valid_id ? `/uploads/${provider.provider_valid_id}` : null
            }));

            res.json({ providers: providersWithFixedPaths });
        } catch (error) {
            console.error('Error fetching providers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getProviderById(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.findUnique({
                where: { provider_id: parseInt(providerId) },
                include: {
                    provider_certificates: {
                        select: {
                            certificate_id: true,
                            certificate_name: true,
                            certificate_number: true,
                            certificate_status: true,
                            created_at: true
                        }
                    }
                }
            });

            if (!provider) {
                return res.status(404).json({ message: 'Provider not found' });
            }

            // Fix file paths to include /uploads/ prefix
            const providerWithFixedPaths = {
                ...provider,
                provider_profile_photo: provider.provider_profile_photo ? `/uploads/${provider.provider_profile_photo}` : null,
                provider_valid_id: provider.provider_valid_id ? `/uploads/${provider.provider_valid_id}` : null,
                certificates: provider.provider_certificates
            };

            res.json({ provider: providerWithFixedPaths });
        } catch (error) {
            console.error('Error fetching provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyProvider(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { provider_isVerified: true }
            });

            res.json({ message: 'Provider verified successfully', provider });
        } catch (error) {
            console.error('Error verifying provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async activateProvider(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { provider_isActivated: true }
            });

            res.json({ message: 'Provider activated successfully', provider });
        } catch (error) {
            console.error('Error activating provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async deactivateProvider(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { provider_isActivated: false }
            });

            res.json({ message: 'Provider deactivated successfully', provider });
        } catch (error) {
            console.error('Error deactivating provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Certificate Management
    async getCertificates(req, res) {
        try {
            const certificates = await prisma.certificate.findMany({
                orderBy: { created_at: 'desc' },
                include: {
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_isVerified: true
                        }
                    }
                }
            });

            const formattedCertificates = certificates.map(cert => ({
                ...cert,
                provider_name: `${cert.provider.provider_first_name} ${cert.provider.provider_last_name}`,
                provider_email: cert.provider.provider_email,
                provider_phone: cert.provider.provider_phone_number,
                provider_verified: cert.provider.provider_isVerified
            }));

            res.json({ certificates: formattedCertificates });
        } catch (error) {
            console.error('Error fetching certificates:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getCertificateById(req, res) {
        try {
            const { certificateId } = req.params;

            const certificate = await prisma.certificate.findUnique({
                where: { certificate_id: parseInt(certificateId) },
                include: {
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_isVerified: true
                        }
                    },
                    CoveredService: {
                        include: {
                            specific_service: {
                                select: {
                                    specific_service_title: true,
                                    specific_service_description: true
                                }
                            }
                        }
                    }
                }
            });

            if (!certificate) {
                return res.status(404).json({ message: 'Certificate not found' });
            }

            const formattedCertificate = {
                ...certificate,
                provider_name: `${certificate.provider.provider_first_name} ${certificate.provider.provider_last_name}`,
                provider_email: certificate.provider.provider_email,
                provider_phone: certificate.provider.provider_phone_number,
                provider_verified: certificate.provider.provider_isVerified,
                covered_services: certificate.CoveredService.map(cs => ({
                    service_title: cs.specific_service.specific_service_title,
                    service_description: cs.specific_service.specific_service_description
                }))
            };

            res.json({ certificate: formattedCertificate });
        } catch (error) {
            console.error('Error fetching certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async approveCertificate(req, res) {
        try {
            const { certificateId } = req.params;

            const certificate = await prisma.certificate.update({
                where: { certificate_id: parseInt(certificateId) },
                data: { certificate_status: 'Approved' }
            });

            res.json({ message: 'Certificate approved successfully', certificate });
        } catch (error) {
            console.error('Error approving certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async rejectCertificate(req, res) {
        try {
            const { certificateId } = req.params;

            const certificate = await prisma.certificate.update({
                where: { certificate_id: parseInt(certificateId) },
                data: { certificate_status: 'Rejected' }
            });

            res.json({ message: 'Certificate rejected successfully', certificate });
        } catch (error) {
            console.error('Error rejecting certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Booking Management
    async getBookings(req, res) {
        try {
            const [total, pending, completed, cancelled] = await Promise.all([
                prisma.appointment.count(),
                prisma.appointment.count({ where: { appointment_status: 'pending' } }),
                prisma.appointment.count({ where: { appointment_status: 'completed' } }),
                prisma.appointment.count({ where: { appointment_status: 'cancelled' } })
            ]);

            res.json({ total, pending, completed, cancelled });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Legacy methods - keeping for backward compatibility
    async verifyServiceProvider(req, res) {
        const { provider_isVerified, provider_id } = req.body;

        try {
            const verifyProvider = await prisma.serviceProviderDetails.update({
                where: { provider_id },
                data: { provider_isVerified }
            });
            res.status(200).json({ message: 'Service provider verification status updated successfully', data: verifyProvider });
        } catch (error) {
            console.error('Error updating service provider verification status:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyCustomer(req, res) {
        const { customer_isVerified, user_id } = req.body;

        try {
            const verifyCustomer = await prisma.user.update({
                where: { user_id },
                data: { is_verified: customer_isVerified }
            });
            res.status(200).json({ message: 'Customer verification status updated successfully', data: verifyCustomer });
        } catch (error) {
            console.error('Error updating customer verification status:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUnverifiedServiceProviders(req, res) {
        try {
            const unverifiedProviders = await prisma.serviceProviderDetails.findMany({
                where: {
                    provider_isVerified: false
                },
                orderBy: {
                    created_at: 'desc'
                },
                include: {
                    provider_certificates: true,
                }
            });

            res.status(200).json({
                message: 'Fetched unverified service providers',
                data: unverifiedProviders
            });
        } catch (error) {
            console.error('Error fetching unverified service providers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUnverifiedCustomers(req, res) {
        try {
            const unverifiedCustomers = await prisma.user.findMany({
                where: {
                    is_verified: false
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            res.status(200).json({
                message: 'Fetched unverified customers',
                data: unverifiedCustomers
            });
        } catch (error) {
            console.error('Error fetching unverified customers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new AdminController();
