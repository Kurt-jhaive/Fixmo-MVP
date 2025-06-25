import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Load certificate-service mappings from JSON
const loadServiceCategoriesData = () => {
    try {
        const filePath = path.join(process.cwd(), 'src', 'public', 'data', 'servicecategories.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading service categories data:', error);
        return [];
    }
};

// Get all services for a provider
export const getProviderServices = async (req, res) => {
    try {
        const providerId = req.userId;
        
        const services = await prisma.serviceListing.findMany({
            where: { 
                provider_id: providerId 
            },
            include: {
                specific_services: {
                    include: {
                        category: {
                            select: {
                                category_id: true,
                                category_name: true
                            }
                        },
                        covered_by_certificates: {
                            include: {
                                certificate: {
                                    select: {
                                        certificate_id: true,
                                        certificate_name: true,
                                        certificate_file_path: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                service_id: 'desc'
            }
        });        // Transform the data to match the expected frontend format
        const transformedServices = services.map(service => ({
            listing_id: service.service_id,
            service_id: service.service_id, // Add both for compatibility
            service_name: service.service_title,
            service_title: service.service_title, // Add both for compatibility
            description: service.service_description,
            service_description: service.service_description, // Add both for compatibility
            price: service.service_startingprice,
            service_startingprice: service.service_startingprice, // Add both for compatibility
            price_per_hour: service.service_startingprice,
            provider_id: service.provider_id,            is_available: service.servicelisting_isActive, // Use actual field from database
            status: service.servicelisting_isActive ? 'active' : 'inactive', // Based on database field
            specific_services: service.specific_services,
            category_name: service.specific_services.length > 0 ? service.specific_services[0].category.category_name : 'Uncategorized',
            category: service.specific_services[0]?.category || null,
            category_id: service.specific_services[0]?.category_id || null,
            certificates: service.specific_services.flatMap(ss => 
                ss.covered_by_certificates.map(cbc => cbc.certificate)
            ),
            booking_count: 0 // Default since not tracked in current schema
        }));

        res.status(200).json({
            success: true,
            data: transformedServices,
            count: transformedServices.length
        });
    } catch (error) {
        console.error('Error fetching provider services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching services'
        });
    }
};

// Get a single service by ID
export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;        const service = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            },
            include: {
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: {
                            include: {
                                certificate: true
                            }
                        }
                    }
                }
            }
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service'
        });
    }
};

// Create a new service
export const createService = async (req, res) => {
    console.log('=== CREATE SERVICE FUNCTION CALLED (This should NOT be called for edit) ===');
    try {
        const providerId = req.userId;
        const {
            certificate_id,
            service_title,
            service_description,
            service_startingprice
        } = req.body;

        console.log('Create service request:', {
            providerId,
            certificate_id,
            service_title,
            service_description,
            service_startingprice
        });

        // Validation
        if (!certificate_id || !service_title || !service_description || !service_startingprice) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }// Find certificate to infer category
        const certificate = await prisma.certificate.findUnique({
            where: { certificate_id: parseInt(certificate_id) }
        });        if (!certificate || certificate.provider_id !== providerId) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found or does not belong to you.'
            });
        }

        // Check if certificate is approved
        if (certificate.certificate_status !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: 'You can only create services with approved certificates. Please wait for your certificate to be approved.'
            });
        }        // Infer category from certificate name first to check for duplicates
        const categoryName = certificate.certificate_name.split(' ')[0];
        let category = await prisma.serviceCategory.findFirst({
            where: { category_name: categoryName }
        });

        if (!category) {
            category = await prisma.serviceCategory.create({
                data: { category_name: categoryName }
            });
        }

        // Check if provider already has a service with the same title and category
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                provider_id: providerId,
                service_title: service_title,
                specific_services: {
                    some: {
                        category_id: category.category_id
                    }
                }
            }
        });        if (existingService) {
            return res.status(400).json({
                success: false,
                message: `You already have a service titled "${service_title}" in the "${categoryName}" category. Please use a different title or edit your existing service.`
            });
        }

        // Create the service listing and the specific service in a transaction
        const newService = await prisma.$transaction(async (prisma) => {
            const serviceListing = await prisma.serviceListing.create({
                data: {
                    service_title: service_title,
                    service_description: service_description,
                    service_startingprice: parseFloat(service_startingprice),
                    provider_id: providerId
                }
            });

            const specificService = await prisma.specificService.create({
                data: {
                    specific_service_title: service_title, // Use listing title
                    specific_service_description: service_description,
                    service_id: serviceListing.service_id,
                    category_id: category.category_id
                }
            });

            await prisma.coveredService.create({
                data: {
                    specific_service_id: specificService.specific_service_id,
                    certificate_id: parseInt(certificate_id)
                }
            });

            return serviceListing;
        });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: newService
        });

    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
};

// Update a service
export const updateService = async (req, res) => {
    console.log('=== UPDATE SERVICE FUNCTION CALLED ===');
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;
        
        console.log('Update service request:', { 
            serviceId, 
            providerId, 
            body: req.body,
            headers: req.headers,
            userId: req.userId 
        }); // Debug log
        
        const {
            service_title,
            service_description,
            service_startingprice,
            certificate_id
        } = req.body;        // Validate required fields - certificate_id is optional for updates
        console.log('Validation check:', { 
            service_description, 
            service_startingprice,
            hasDescription: !!service_description,
            hasPrice: !!service_startingprice,
            descriptionTrimmed: service_description?.trim(),
            priceAsNumber: service_startingprice ? parseFloat(service_startingprice) : null
        });
        
        if (!service_description || !service_description.trim() || !service_startingprice || isNaN(parseFloat(service_startingprice))) {
            console.log('Validation failed - missing required fields');
            return res.status(400).json({ success: false, message: 'Service description and starting price are required.' });
        }        const serviceListingId = parseInt(serviceId);
        console.log('Parsed serviceListingId:', serviceListingId);

        await prisma.$transaction(async (prisma) => {
            console.log('Starting database transaction...');
            
            const existingService = await prisma.serviceListing.findFirst({
                where: {
                    service_id: serviceListingId,
                    provider_id: providerId
                },
                include: {
                    specific_services: true
                }
            });
            
            console.log('Existing service found:', !!existingService);
            console.log('Existing service data:', existingService);

            if (!existingService) {
                console.log('Service not found - throwing error');
                throw new Error('Service not found or access denied');
            }// Update basic service information
            const updateData = {
                service_description: service_description.trim(),
                service_startingprice: parseFloat(service_startingprice)
            };
            
            // Only update title if provided (for backwards compatibility)
            if (service_title) {
                updateData.service_title = service_title.trim();
            }

            await prisma.serviceListing.update({
                where: { service_id: serviceListingId },
                data: updateData
            });

            const specificService = existingService.specific_services[0];
            if (specificService) {
                // Update specific service description
                const updateSpecificData = {
                    specific_service_description: service_description.trim()
                };
                
                // Only update title if provided
                if (service_title) {
                    updateSpecificData.specific_service_title = service_title.trim();
                }
                
                await prisma.specificService.update({
                    where: { specific_service_id: specificService.specific_service_id },
                    data: updateSpecificData
                });

                // Only update certificate and category if certificate_id is provided
                if (certificate_id) {
                    const certificate = await prisma.certificate.findUnique({
                        where: { certificate_id: parseInt(certificate_id) }
                    });

                    if (!certificate || certificate.provider_id !== providerId) {
                        throw new Error('New certificate not found or does not belong to you.');
                    }

                    const categoryName = certificate.certificate_name.split(' ')[0];
                    let category = await prisma.serviceCategory.findFirst({
                        where: { category_name: categoryName }
                    });
                    if (!category) {
                        category = await prisma.serviceCategory.create({
                            data: { category_name: categoryName }
                        });
                    }

                    await prisma.specificService.update({
                        where: { specific_service_id: specificService.specific_service_id },
                        data: {
                            category_id: category.category_id,
                            specific_service_title: service_title?.trim() || specificService.specific_service_title
                        }                    });

                    const existingCoveredService = await prisma.coveredService.findFirst({
                        where: { specific_service_id: specificService.specific_service_id }
                    });

                    if (existingCoveredService) {
                        await prisma.coveredService.update({
                            where: { covered_service_id: existingCoveredService.covered_service_id },
                            data: { certificate_id: parseInt(certificate_id) }
                        });
                    } else {
                        await prisma.coveredService.create({
                            data: {
                                specific_service_id: specificService.specific_service_id,
                                certificate_id: parseInt(certificate_id)
                            }
                        });
                    }
                }
            }
        });
        
        const completeService = await prisma.serviceListing.findUnique({
            where: { service_id: serviceListingId },
            include: {
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: { include: { certificate: true } }
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            data: completeService
        });

    } catch (error) {
        console.error('Error updating service:', error);
        if (error.message.includes('Service not found') || error.message.includes('New certificate not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating service',
            error: error.message
        });
    }
};

// Delete a service
export const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;

        // Check if service exists and belongs to provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }        // Delete related records first to avoid foreign key constraint violations
        // Get all specific services for this service
        const specificServices = await prisma.specificService.findMany({
            where: { service_id: parseInt(serviceId) }
        });

        // Delete all covered services that reference these specific services
        for (const specificService of specificServices) {
            await prisma.coveredService.deleteMany({
                where: { specific_service_id: specificService.specific_service_id }
            });
        }

        // Delete related specific services
        await prisma.specificService.deleteMany({
            where: { service_id: parseInt(serviceId) }
        });

        // Delete the service listing
        await prisma.serviceListing.delete({
            where: { service_id: parseInt(serviceId) }
        });

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting service'
        });
    }
};

// Toggle service availability
export const toggleServiceAvailability = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;        // Check if service exists and belongs to provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }        // Toggle availability
        const updatedService = await prisma.serviceListing.update({
            where: { service_id: parseInt(serviceId) },
            data: {
                servicelisting_isActive: !existingService.servicelisting_isActive
            },
            include: {
                serviceProvider: true,
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: {
                            include: {
                                certificate: true
                            }
                        }
                    }
                }
            }
        });        res.status(200).json({
            success: true,
            message: `Service ${updatedService.servicelisting_isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedService
        });
    } catch (error) {
        console.error('Error toggling service availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service availability'
        });
    }
};

// Get service categories for dropdown
export const getServiceCategories = async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            select: {
                category_id: true,
                category_name: true
            },
            orderBy: {
                category_name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
};

// Get provider certificates for dropdown
export const getProviderCertificates = async (req, res) => {
    try {
        const providerId = req.userId;

        const certificates = await prisma.certificate.findMany({
            where: { provider_id: providerId },
            select: {
                certificate_id: true,
                certificate_name: true,
                certificate_file_path: true,
                expiry_date: true
            },
            orderBy: {
                certificate_name: 'asc'
            }
        });

        res.status(200).json({            success: true,
            data: certificates
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificates'
        });
    }
};

// Get certificate-service mappings
export const getCertificateServices = async (req, res) => {
    try {
        const categoriesData = loadServiceCategoriesData();
        res.status(200).json({
            success: true,
            data: categoriesData
        });
    } catch (error) {
        console.error('Error fetching certificate services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificate services',
            error: error.message
        });
    }
};
