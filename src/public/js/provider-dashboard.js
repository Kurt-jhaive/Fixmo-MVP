// Provider Dashboard JavaScript with JWT Authentication
class ProviderDashboard {    constructor() {
        this.token = localStorage.getItem('fixmo_provider_token');
        this.providerData = null;
        this.init();
    }

    async init() {
        // Check if user is authenticated
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        // Verify token and load provider data
        try {
            await this.loadProviderProfile();
            this.setupEventListeners();
            this.loadDashboardData();
        } catch (error) {
            console.error('Authentication failed:', error);
            this.redirectToLogin();
        }
    }

    async loadProviderProfile() {
        try {
            const response = await fetch('/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                throw new Error('Failed to load profile');
            }

            this.providerData = await response.json();
            this.updateProviderInfo();
        } catch (error) {
            console.error('Error loading provider profile:', error);
            throw error;
        }
    }

    updateProviderInfo() {
        const providerNameEl = document.getElementById('providerName');
        if (providerNameEl && this.providerData) {
            providerNameEl.textContent = `${this.providerData.provider_first_name} ${this.providerData.provider_last_name}`;
        }
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                this.updateActiveNav(link);
            });
        });

        // Add service form
        const addServiceForm = document.getElementById('addServiceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddService();
            });
        }
    }    showSection(sectionName) {
        // Special case for manage-services - redirect to separate page
        if (sectionName === 'manage-services') {
            window.location.href = '/provider-manage-services';
            return;
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardStats();
                break;
            case 'manage-services':
                await this.loadServices();
                await this.loadCertificates();
                break;
            case 'bookings':
                await this.loadBookings();
                break;
            case 'availability':
                await this.loadAvailability();
                break;
            case 'profile':
                await this.loadProfile();
                break;
        }
    }

    async loadDashboardData() {
        await this.loadDashboardStats();
        await this.loadRecentBookings();
        await this.loadServicePerformance();
    }

    async loadDashboardStats() {
        try {
            const [servicesResponse, bookingsResponse] = await Promise.all([
                fetch('/auth/my-services', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // Note: Add bookings endpoint when available
                new Promise(resolve => resolve({ ok: true, json: () => [] }))
            ]);

            if (servicesResponse.ok) {
                const services = await servicesResponse.json();
                document.getElementById('totalServices').textContent = services.length;
                
                // Calculate total earnings (mock for now)
                const totalEarnings = services.reduce((sum, service) => {
                    return sum + (parseFloat(service.price_per_hour) * 10); // Mock calculation
                }, 0);
                document.getElementById('totalEarnings').textContent = `₱${totalEarnings.toLocaleString()}`;
            }

            // Mock data for now
            document.getElementById('totalBookings').textContent = '12';
            document.getElementById('averageRating').textContent = '4.8';

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadServices() {
        const servicesContainer = document.getElementById('servicesList');
        servicesContainer.innerHTML = '<div class="loading">Loading your services...</div>';

        try {
            const response = await fetch('/auth/my-services', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load services');
            }

            const services = await response.json();
            this.renderServices(services);
        } catch (error) {
            console.error('Error loading services:', error);
            servicesContainer.innerHTML = '<div class="no-data">Error loading services</div>';
        }
    }

    renderServices(services) {
        const servicesContainer = document.getElementById('servicesList');
        
        if (services.length === 0) {
            servicesContainer.innerHTML = '<div class="no-data">No services found. Add your first service!</div>';
            return;
        }

        const servicesHTML = services.map(service => `
            <div class="service-card">
                <div class="service-header">
                    <h3>${service.service_name}</h3>
                    <div class="service-category">${service.category?.category_name || 'General'}</div>
                </div>
                <div class="service-body">
                    <p class="service-description">${service.service_description}</p>
                    <div class="service-details">
                        <span class="service-price">₱${parseFloat(service.price_per_hour).toLocaleString()}/hr</span>
                        <span class="service-duration">${service.estimated_duration}h duration</span>
                    </div>
                    <div class="service-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editService(${service.listing_id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteService(${service.listing_id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        servicesContainer.innerHTML = servicesHTML;
    }

    async loadCertificates() {
        try {
            const response = await fetch('/auth/my-certificates', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load certificates');
            }

            const certificates = await response.json();
            this.populateCertificateDropdown(certificates);
        } catch (error) {
            console.error('Error loading certificates:', error);
        }
    }

    populateCertificateDropdown(certificates) {
        const certificateSelect = document.getElementById('certificate_id');
        if (!certificateSelect) return;

        certificateSelect.innerHTML = '<option value="">Select a certificate</option>';
        
        certificates.forEach(cert => {
            const option = document.createElement('option');
            option.value = cert.certificate_id;
            option.textContent = cert.certificate_name;
            certificateSelect.appendChild(option);
        });
    }

    async handleAddService() {
        const form = document.getElementById('addServiceForm');
        const formData = new FormData(form);
        
        const serviceData = {
            certificate_id: parseInt(formData.get('certificate_id')),
            service_name: formData.get('service_name'),
            service_description: formData.get('service_description'),
            price_per_hour: parseFloat(formData.get('price_per_hour')),
            estimated_duration: parseFloat(formData.get('estimated_duration'))
        };

        try {
            this.showLoading();
            
            const response = await fetch('/auth/addListing', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add service');
            }

            const result = await response.json();
            console.log('Service added successfully:', result);
            
            // Close modal and reload services
            this.closeAddServiceModal();
            await this.loadServices();
            
            // Show success message
            this.showNotification('Service added successfully!', 'success');
            
        } catch (error) {
            console.error('Error adding service:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadRecentBookings() {
        // Mock data for now - implement when bookings API is available
        const recentBookingsEl = document.getElementById('recentBookings');
        recentBookingsEl.innerHTML = `
            <div class="activity-item">
                <div class="activity-info">
                    <h4>Plumbing Service</h4>
                    <p>John Doe - Today, 2:00 PM</p>
                </div>
                <span class="activity-status status-confirmed">Confirmed</span>
            </div>
            <div class="activity-item">
                <div class="activity-info">
                    <h4>Electrical Work</h4>
                    <p>Jane Smith - Tomorrow, 10:00 AM</p>
                </div>
                <span class="activity-status status-pending">Pending</span>
            </div>
        `;
    }

    async loadServicePerformance() {
        // Mock data for now
        const performanceEl = document.getElementById('servicePerformance');
        performanceEl.innerHTML = `
            <div class="performance-item">
                <div class="performance-info">
                    <h4>Plumbing Services</h4>
                    <p>8 bookings this month</p>
                </div>
                <span class="performance-status status-confirmed">Active</span>
            </div>
            <div class="performance-item">
                <div class="performance-info">
                    <h4>Electrical Work</h4>
                    <p>5 bookings this month</p>
                </div>
                <span class="performance-status status-confirmed">Active</span>
            </div>
        `;
    }

    async loadBookings() {
        // TODO: Implement when bookings API is available
        const bookingsContainer = document.getElementById('bookingsList');
        bookingsContainer.innerHTML = '<div class="no-data">Bookings management will be implemented soon</div>';
    }

    async loadAvailability() {
        // TODO: Implement availability management
        const availabilityContainer = document.getElementById('availabilitySettings');
        availabilityContainer.innerHTML = '<div class="no-data">Availability settings will be implemented soon</div>';
    }

    async loadProfile() {
        // TODO: Implement profile editing
        const profileContainer = document.getElementById('profileForm');
        profileContainer.innerHTML = '<div class="no-data">Profile editing will be implemented soon</div>';
    }

    // Modal functions
    showAddServiceModal() {
        const modal = document.getElementById('addServiceModal');
        modal.style.display = 'block';
    }

    closeAddServiceModal() {
        const modal = document.getElementById('addServiceModal');
        modal.style.display = 'none';
        
        // Reset form
        const form = document.getElementById('addServiceForm');
        if (form) form.reset();
    }

    // Utility functions
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
            color: white;
            border-radius: var(--border-radius);
            z-index: 2000;
            box-shadow: var(--shadow);
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }    redirectToLogin() {
        localStorage.removeItem('fixmo_provider_token');
        localStorage.removeItem('fixmo_provider_id');
        localStorage.removeItem('fixmo_provider_name');
        localStorage.removeItem('fixmo_user_type');
        window.location.href = '/fixmo-login';
    }

    logout() {
        localStorage.removeItem('fixmo_provider_token');
        localStorage.removeItem('fixmo_provider_id');
        localStorage.removeItem('fixmo_provider_name');
        localStorage.removeItem('fixmo_user_type');
        window.location.href = '/fixmo-login';
    }
}

// Global functions for modal and other actions
function showAddServiceModal() {
    dashboard.showAddServiceModal();
}

function closeAddServiceModal() {
    dashboard.closeAddServiceModal();
}

function showProfile() {
    dashboard.showSection('profile');
    document.querySelector('[data-section="profile"]').classList.add('active');
}

function logout() {
    dashboard.logout();
}

function editService(serviceId) {
    // TODO: Implement service editing
    console.log('Edit service:', serviceId);
    dashboard.showNotification('Service editing will be implemented soon', 'info');
}

function deleteService(serviceId) {
    if (confirm('Are you sure you want to delete this service?')) {
        // TODO: Implement service deletion
        console.log('Delete service:', serviceId);
        dashboard.showNotification('Service deletion will be implemented soon', 'info');
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new ProviderDashboard();
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addServiceModal');
    if (event.target === modal) {
        dashboard.closeAddServiceModal();
    }
}
