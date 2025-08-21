// Manage Services JavaScript - Separate from main dashboard for DRY architecture
class ManageServices {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.providerData = null;
        this.services = [];
        this.certificates = [];
        this.init();
    }

    async init() {
        // Check if user is authenticated
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        try {
            await this.loadProviderProfile();
            this.setupEventListeners();
            await this.loadData();
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
        // Add service form
        const addServiceForm = document.getElementById('addServiceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddService();
            });
        }

        // Edit service form
        const editServiceForm = document.getElementById('editServiceForm');
        if (editServiceForm) {
            editServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditService();
            });
        }
    }

    async loadData() {
        this.showLoading();
        try {
            await Promise.all([
                this.loadServices(),
                this.loadCertificates()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        } finally {
            this.hideLoading();
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

            this.services = await response.json();
            this.renderServices();
        } catch (error) {
            console.error('Error loading services:', error);
            servicesContainer.innerHTML = '<div class="no-data">Error loading services</div>';
        }
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

            this.certificates = await response.json();
            this.populateCertificateDropdowns();
        } catch (error) {
            console.error('Error loading certificates:', error);
        }
    }

    populateCertificateDropdowns() {
        const dropdowns = ['certificate_id', 'edit_certificate_id'];
        
        dropdowns.forEach(dropdownId => {
            const select = document.getElementById(dropdownId);
            if (!select) return;

            select.innerHTML = '<option value="">Select a certificate</option>';
            
            this.certificates.forEach(cert => {
                const option = document.createElement('option');
                option.value = cert.certificate_id;
                option.textContent = cert.certificate_name;
                select.appendChild(option);
            });
        });
    }

    renderServices() {
        const servicesContainer = document.getElementById('servicesList');
        
        if (this.services.length === 0) {
            servicesContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-cogs" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3>No services found</h3>
                    <p>Start by adding your first service based on your certificates!</p>
                    <button class="btn btn-primary" onclick="showAddServiceModal()">
                        <i class="fas fa-plus"></i>
                        Add Your First Service
                    </button>
                </div>
            `;
            return;
        }

        const servicesHTML = this.services.map(service => `
            <div class="service-card" data-service-id="${service.listing_id}">
                ${service.service_picture ? `
                <div class="service-image">
                    <img src="/${service.service_picture}" alt="${service.service_title}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;">
                </div>
                ` : ''}
                <div class="service-header">
                    <h3>${service.service_title}</h3>
                    <div class="service-category">
                        <i class="fas fa-certificate"></i>
                        ${service.category?.category_name || 'General'}
                    </div>
                </div>
                <div class="service-body">
                    <p class="service-description">${service.service_description}</p>
                    <div class="service-details">
                        <div class="service-price">
                            <i class="fas fa-peso-sign"></i>
                            Starts at ${parseFloat(service.service_startingprice).toLocaleString()}
                        </div>
                    </div>
                    <div class="service-stats">
                        <small class="text-muted">
                            <i class="fas fa-calendar-plus"></i>
                            Created: ${new Date(service.created_at || Date.now()).toLocaleDateString()}
                        </small>
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

    async handleAddService() {
        const form = document.getElementById('addServiceForm');
        const formData = new FormData(form);
        
        // Add provider_id to formData
        if (this.providerData && this.providerData.provider_id) {
            formData.append('provider_id', this.providerData.provider_id);
        }

        // Validation
        const certificateId = formData.get('certificate_id');
        const serviceTitle = formData.get('service_title');
        const serviceDescription = formData.get('service_description');
        const servicePicture = formData.get('service_picture');

        if (!certificateId) {
            this.showNotification('Please select a certificate', 'error');
            return;
        }

        if (!serviceTitle || !serviceDescription) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate image if provided
        if (servicePicture && servicePicture.size > 0) {
            if (servicePicture.size > 5 * 1024 * 1024) { // 5MB limit
                this.showNotification('Image file must be less than 5MB', 'error');
                return;
            }
            
            if (!servicePicture.type.startsWith('image/')) {
                this.showNotification('Please select a valid image file', 'error');
                return;
            }
        }

        try {
            this.showLoading();
            
            const response = await fetch('/auth/addListing', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                    // Note: Don't set Content-Type for FormData, browser will set it automatically
                },
                body: formData
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

    async handleEditService() {
        const form = document.getElementById('editServiceForm');
        const formData = new FormData(form);
        
        const serviceId = parseInt(formData.get('service_id'));
        const serviceData = {
            certificate_id: parseInt(formData.get('edit_certificate_id')),
            service_title: formData.get('edit_service_title').trim(),
            service_description: formData.get('edit_service_description').trim(),
            service_startingprice: parseFloat(formData.get('edit_service_startingprice'))
        };

        try {
            this.showLoading();
            
            const response = await fetch(`/auth/service/${serviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceData)
            });

            if (!response.ok) {
                throw new Error('Failed to update service');
            }

            // Close modal and reload services
            this.closeEditServiceModal();
            await this.loadServices();
            
            // Show success message
            this.showNotification('Service updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating service:', error);
            this.showNotification('Update feature will be implemented soon', 'info');
        } finally {
            this.hideLoading();
        }
    }

    async handleDeleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/auth/service/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete service');
            }

            // Reload services
            await this.loadServices();
            
            // Show success message
            this.showNotification('Service deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showNotification('Delete feature will be implemented soon', 'info');
        } finally {
            this.hideLoading();
        }
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

    showEditServiceModal(serviceId) {
        const service = this.services.find(s => s.listing_id === serviceId);
        if (!service) {
            this.showNotification('Service not found', 'error');
            return;
        }

        // Populate form with service data
        document.getElementById('edit_service_id').value = service.listing_id;
        document.getElementById('edit_certificate_id').value = service.certificate_id || '';
        document.getElementById('edit_service_title').value = service.service_title;
        document.getElementById('edit_service_description').value = service.service_description;
        document.getElementById('edit_service_startingprice').value = service.service_startingprice;

        const modal = document.getElementById('editServiceModal');
        modal.style.display = 'block';
    }

    closeEditServiceModal() {
        const modal = document.getElementById('editServiceModal');
        modal.style.display = 'none';
        
        // Reset form
        const form = document.getElementById('editServiceForm');
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
        // Create a notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--secondary-color)'};
            color: white;
            border-radius: var(--border-radius);
            z-index: 2000;
            box-shadow: var(--shadow);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideIn 0.3s ease;
        `;

        // Add animation keyframes
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userType');
        window.location.href = '/fixmo-login';
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userType');
        window.location.href = '/fixmo-login';
    }
}

// Global functions for modal and other actions
function showAddServiceModal() {
    manageServices.showAddServiceModal();
}

function closeAddServiceModal() {
    manageServices.closeAddServiceModal();
}

function showEditServiceModal() {
    manageServices.showEditServiceModal();
}

function closeEditServiceModal() {
    manageServices.closeEditServiceModal();
}

function editService(serviceId) {
    manageServices.showEditServiceModal(serviceId);
}

function deleteService(serviceId) {
    manageServices.handleDeleteService(serviceId);
}

function logout() {
    manageServices.logout();
}

// Image validation and preview functions
function validateImageOrientation(input) {
    const file = input.files[0];
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!file) {
        previewContainer.style.display = 'none';
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        input.value = '';
        previewContainer.style.display = 'none';
        return;
    }
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        input.value = '';
        previewContainer.style.display = 'none';
        return;
    }
    
    // Create image object to check dimensions
    const img = new Image();
    img.onload = function() {
        if (this.width <= this.height) {
            alert('Please select a landscape image (width must be greater than height)');
            input.value = '';
            previewContainer.style.display = 'none';
            return;
        }
        
        // Show preview if validation passes
        previewImg.src = URL.createObjectURL(file);
        previewContainer.style.display = 'block';
    };
    
    img.onerror = function() {
        alert('Invalid image file');
        input.value = '';
        previewContainer.style.display = 'none';
    };
    
    img.src = URL.createObjectURL(file);
}

// Initialize manage services when DOM is loaded
let manageServices;
document.addEventListener('DOMContentLoaded', () => {
    manageServices = new ManageServices();
});

// Close modals when clicking outside
window.onclick = function(event) {
    const addModal = document.getElementById('addServiceModal');
    const editModal = document.getElementById('editServiceModal');
    
    if (event.target === addModal) {
        manageServices.closeAddServiceModal();
    }
    
    if (event.target === editModal) {
        manageServices.closeEditServiceModal();
    }
}
