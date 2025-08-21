import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const verifyServiceProvider = async (req, res) =>{
    const {provider_isVerified, provider_id} = req.body;

    try {
        const verifyProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id },
            data: { provider_isVerified }
        })
        res.status(200).json({ message: 'Service provider verification status updated successfully', data: verifyProvider });
    } catch (error) {
        console.error('Error updating service provider verification status:', error);
    }
} 

export const verifyCustomer = async (req, res) => {
    const { customer_isVerified, user_id } = req.body;

    try {
        const verifyCustomer = await prisma.customerDetails.update({
            where: { user_id },
            data: { isVerified }
        });
        res.status(200).json({ message: 'Customer verification status updated successfully', data: verifyCustomer });
    } catch (error) {
        console.error('Error updating customer verification status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const getUnverifiedServiceProviders = async (req, res) => {
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
  }});

    res.status(200).json({
      message: 'Fetched unverified service providers',
      data: unverifiedProviders
    });

  } catch (error) {
    console.error('Error fetching unverified service providers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUnverifiedCustomers = async (req, res) => {
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

