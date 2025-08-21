import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Session authentication middleware for providers
export const requireProviderSession = async (req, res, next) => {
    try {
        // Check if user is logged in via session
        if (!req.session.provider) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated. Please login.',
                redirectTo: '/fixmo-login'
            });
        }

        // Verify the session data is still valid
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: req.session.provider.id }
        });

        if (!provider) {
            // Clear invalid session
            req.session.destroy();
            return res.status(401).json({ 
                success: false, 
                message: 'Session invalid. Please login again.',
                redirectTo: '/fixmo-login'
            });
        }

        // Attach provider data to request
        req.user = {
            id: provider.provider_id,
            email: provider.provider_email,
            userType: 'provider'
        };
        req.userId = provider.provider_id;
        req.userType = 'provider';

        next();
    } catch (error) {
        console.error('Session authentication error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication error' 
        });
    }
};

// Session authentication middleware for customers
export const requireCustomerSession = async (req, res, next) => {
    try {
        // Check if user is logged in via session
        if (!req.session.customer) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated. Please login.',
                redirectTo: '/fixmo-login'
            });
        }

        // Verify the session data is still valid
        const customer = await prisma.customerDetails.findUnique({
            where: { customer_id: req.session.customer.id }
        });

        if (!customer) {
            // Clear invalid session
            req.session.destroy();
            return res.status(401).json({ 
                success: false, 
                message: 'Session invalid. Please login again.',
                redirectTo: '/fixmo-login'
            });
        }

        // Attach customer data to request
        req.user = {
            id: customer.customer_id,
            email: customer.customer_email,
            userType: 'customer'
        };
        req.userId = customer.customer_id;
        req.userType = 'customer';

        next();
    } catch (error) {
        console.error('Session authentication error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication error' 
        });
    }
};

// Hybrid middleware that accepts both JWT and session auth
export const requireAuth = (userType = null) => {
    return async (req, res, next) => {
        try {
            console.log('RequireAuth middleware called for userType:', userType);
            console.log('Session data:', req.session);
            console.log('Auth header:', req.headers['authorization']);
            
            let authenticated = false;
            
            // First try JWT authentication (for API calls)
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                    console.log('JWT decoded successfully:', decoded);
                    req.userId = decoded.id || decoded.providerId;
                    req.userType = decoded.userType || 'provider';
                    authenticated = true;
                } catch (jwtError) {
                    console.log('JWT verification failed:', jwtError.message);
                }
            }

            // If JWT failed, try session authentication
            if (!authenticated) {
                console.log('Trying session authentication...');
                if (userType === 'provider' && req.session.provider) {
                    console.log('Found provider session:', req.session.provider);
                    const provider = await prisma.serviceProviderDetails.findUnique({
                        where: { provider_id: req.session.provider.id }
                    });
                    if (provider) {
                        console.log('Provider found in database');
                        req.userId = provider.provider_id;
                        req.userType = 'provider';
                        authenticated = true;
                    }
                } else if (userType === 'customer' && req.session.customer) {
                    const customer = await prisma.customerDetails.findUnique({
                        where: { customer_id: req.session.customer.id }
                    });
                    if (customer) {
                        req.userId = customer.customer_id;
                        req.userType = 'customer';
                        authenticated = true;
                    }
                } else if (!userType) {
                    // Check both provider and customer sessions
                    if (req.session.provider) {
                        const provider = await prisma.serviceProviderDetails.findUnique({
                            where: { provider_id: req.session.provider.id }
                        });
                        if (provider) {
                            req.userId = provider.provider_id;
                            req.userType = 'provider';
                            authenticated = true;
                        }
                    } else if (req.session.customer) {
                        const customer = await prisma.customerDetails.findUnique({
                            where: { customer_id: req.session.customer.id }
                        });
                        if (customer) {
                            req.userId = customer.customer_id;
                            req.userType = 'customer';
                            authenticated = true;
                        }
                    }
                }
            }

            if (!authenticated) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required. Please login.',
                    redirectTo: '/fixmo-login'
                });
            }

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Authentication error' 
            });
        }
    };
};

export default { requireProviderSession, requireCustomerSession, requireAuth };
