// Service Management JavaScript
class ServiceManager {
    constructor() {
        this.services = [];
        this.categories = [];
        this.certificates = [];
        this.certificateServices = []; // New: certificate-service mappings
        this.selectedServices = []; // New: selected services for creation
        this.currentEditingService = null;
        this.serviceToDelete = null;
        this.initialized = false;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.modalOpen = false; // Prevent duplicate modal openings
    }

    async init() {
        if (this.initialized) {
            console.log('Service manager already initialized');
            return;
        }
        try {
            console.log('Initializing service manager...');
            
            // Load initial data
            await Promise.all([
                this.loadServices(),
                this.loadCategories(),
                this.loadCertificates(),
                this.loadCertificateServices()
            ]);
            
            this.setupEventListeners();
            this.renderServices();
            this.initialized = true;
            console.log('Service manager initialized successfully');
        } catch (error) {
            console.error('Error initializing service manager:', error);
            this.showToast('Error loading service data', 'error');
        }
    }

    setupEventListeners() {
        console.log('Setting up service manager event listeners...');
        
        // Add service buttons (main button and empty state button)
        const setupAddServiceButtons = () => {
            const addServiceBtn = document.getElementById('addServiceBtn');
            const addFirstServiceBtn = document.getElementById('addFirstServiceBtn');
            const clearFiltersBtn = document.getElementById('clearFiltersBtn');
            
            console.log('Add service button found:', !!addServiceBtn);
            console.log('Add first service button found:', !!addFirstServiceBtn);            console.log('Clear filters button found:', !!clearFiltersBtn);
            
            // Handle main add service button
            if (addServiceBtn) {
                // Remove any existing listeners
                addServiceBtn.replaceWith(addServiceBtn.cloneNode(true));
                const newAddServiceBtn = document.getElementById('addServiceBtn');
                
                newAddServiceBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('=== Add service button clicked! ===');
                    console.log('Button element:', e.target);
                    console.log('Event:', e);
                    console.log('Service manager instance:', this);
                    this.showAddServiceModal();
                });
                console.log('Add service button listener attached');
            } else {
                console.log('Main add service button not found');
            }
            
            // Handle empty state add service button
            if (addFirstServiceBtn) {
                addFirstServiceBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Add first service button clicked!');
                    this.showAddServiceModal();
                });
                console.log('Add first service button listener attached');
            }
            
            // Handle clear filters button
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clear filters button clicked!');
                    this.clearFilters();
                });
                console.log('Clear filters button listener attached');
            }
        };

        // Set up add service buttons initially and after renders
        setupAddServiceButtons();
        this.setupAddServiceButtons = setupAddServiceButtons;

        // Modal close buttons
        const modalCloses = document.querySelectorAll('.modal-close, #cancelAddService, #cancelEditService, #cancelDelete');
        modalCloses.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModals();
            });
        });

        // Add service form
        const addServiceForm = document.getElementById('addServiceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Add service form submitted!');
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

        // Search functionality
        const searchInput = document.getElementById('servicesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterServices(e.target.value);
            });
        }

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterServices();
            });
        });        // Confirm delete
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDeleteService();
            });
        }

        // Certificate selection handling for duplicate prevention
        const certificateSelect = document.getElementById('serviceCertificate');
        if (certificateSelect) {
            certificateSelect.addEventListener('change', (e) => {
                this.handleCertificateSelection(e.target.value);
            });
        }

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        // Initialize filter state
        this.currentFilter = 'all';
        this.currentSearch = '';
        
        console.log('Service manager event listeners setup complete');
    }

    async loadServices() {
        try {
            const response = await fetch('/api/services/services', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.services = data.data || [];
                console.log('Services loaded:', this.services.length);
            } else {
                throw new Error('Failed to load services');
            }
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = [];
            throw error;
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/services/categories', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.categories = data.data || [];
                this.populateCategoryDropdown();
            } else {
                throw new Error('Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
        }
    }

    async loadCertificates() {
        try {
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/certificates', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log('Service manager certificates response:', responseData);
                
                if (responseData.success && Array.isArray(responseData.data)) {
                    this.certificates = responseData.data.map(cert => ({
                        certificate_id: cert.certificate_id,
                        certificate_name: cert.certificate_name,
                        certificate_file_path: cert.certificate_file_path,
                        certificate_status: cert.certificate_status || 'Pending',
                        created_at: cert.created_at,
                        expiry_date: cert.expiry_date,
                        certificate_number: cert.certificate_number
                    }));
                } else if (Array.isArray(responseData)) {
                    this.certificates = responseData;
                } else {
                    console.warn('Unexpected response format for certificates:', responseData);
                    this.certificates = [];
                }
                
                console.log('Service manager processed certificates:', this.certificates.length);
                console.log('Approved certificates:', this.certificates.filter(c => c.certificate_status === 'Approved').length);
                this.populateCertificateDropdown();
            } else {
                throw new Error('Failed to load certificates');
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.certificates = [];
        }
    }

    async loadCertificateServices() {
        try {
            const response = await fetch('/api/services/certificate-services', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.certificateServices = data.data || [];
                console.log('Certificate services loaded:', this.certificateServices.length);
            } else {
                throw new Error('Failed to load certificate services');
            }
        } catch (error) {
            console.error('Error loading certificate services:', error);
            this.certificateServices = [];
            throw error;
        }
    }

    populateCategoryDropdown() {
        const categorySelect = document.getElementById('serviceCategory');
        if (!categorySelect) return;

        categorySelect.innerHTML = '<option value="">Select Category</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            categorySelect.appendChild(option);
        });
    }

    populateCertificateDropdown() {
        const certificateSelect = document.getElementById('serviceCertificate');
        if (!certificateSelect) return;

        certificateSelect.innerHTML = '<option value="">No Certificate Required</option>';
        this.certificates.forEach(certificate => {
            const option = document.createElement('option');
            option.value = certificate.certificate_id;
            option.textContent = certificate.certificate_name;
            certificateSelect.appendChild(option);
        });
    }    renderServices() {
        console.log('Rendering services...');
        const container = document.getElementById('servicesContainer');
        if (!container) {
            console.error('Services container not found!');
            return;
        }

        console.log('Services to render:', this.services.length);

        // Update stats
        this.updateServiceStats();

        // Filter services based on current filter and search
        const filteredServices = this.getFilteredServices();

        if (filteredServices.length === 0) {
            if (this.services.length === 0) {
                console.log('No services found, showing empty state');
                container.innerHTML = `
                    <div class="services-empty-state">
                        <i class="fas fa-tools"></i>
                        <h3>No services yet</h3>
                        <p>Create your first service listing to start attracting customers and grow your business</p>                        <button class="btn-primary" id="addFirstServiceBtn">
                            <i class="fas fa-plus"></i> Add Your First Service
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="services-empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No services found</h3>
                        <p>Try adjusting your search or filter criteria</p>                        <button class="btn-secondary" id="clearFiltersBtn">
                            <i class="fas fa-times"></i> Clear Filters
                        </button>
                    </div>
                `;
            }
            return;
        }        console.log('Rendering service cards for', filteredServices.length, 'services');
        const servicesHTML = filteredServices.map(service => this.createServiceCard(service)).join('');
        container.innerHTML = servicesHTML;
        
        // Re-setup add service buttons after rendering (for dynamic content)
        if (this.setupAddServiceButtons) {
            this.setupAddServiceButtons();
        }
    }    updateServiceStats() {
        const total = this.services.length;
        const active = this.services.filter(s => s.is_available && s.status !== 'draft').length;
        const inactive = this.services.filter(s => !s.is_available && s.status !== 'draft').length;
        const draft = this.services.filter(s => s.status === 'draft').length;

        // Update stats if elements exist
        const totalElement = document.getElementById('totalServicesCount');
        const activeElement = document.getElementById('activeServicesCount');
        const inactiveElement = document.getElementById('inactiveServicesCount');
        const draftElement = document.getElementById('draftServicesCount');

        if (totalElement) totalElement.textContent = total;
        if (activeElement) activeElement.textContent = active;
        if (inactiveElement) inactiveElement.textContent = inactive;
        if (draftElement) draftElement.textContent = draft;
    }

    getFilteredServices() {
        let filtered = [...this.services];        // Apply status filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(service => {
                switch (this.currentFilter) {
                    case 'active':
                        return service.is_available && service.status !== 'draft';
                    case 'inactive':
                        return !service.is_available && service.status !== 'draft';
                    case 'draft':
                        return service.status === 'draft';
                    default:
                        return true;
                }
            });
        }

        // Apply search filter
        if (this.currentSearch) {
            const search = this.currentSearch.toLowerCase();
            filtered = filtered.filter(service => 
                service.service_name.toLowerCase().includes(search) ||
                service.description.toLowerCase().includes(search) ||
                (service.category?.category_name || '').toLowerCase().includes(search)
            );
        }

        return filtered;
    }

    filterServices(searchTerm = '') {
        this.currentSearch = searchTerm;
        this.renderServices();
    }

    clearFilters() {
        this.currentFilter = 'all';
        this.currentSearch = '';
        
        // Reset UI
        document.getElementById('servicesSearchInput').value = '';
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
        });
        
        this.renderServices();
    }    createServiceCard(service) {
        const categoryName = service.category_name || service.specific_services?.[0]?.category?.category_name || 'Uncategorized';
        const certificateNames = service.certificates?.map(cert => cert.certificate_name).join(', ') || 'No certificates';
        
        // Use specific service name from the radio button selection if available
        const serviceName = service.specific_services?.[0]?.specific_service_title || service.service_name || service.service_title;
        
        // Format price
        const price = parseFloat(service.price || service.service_startingprice || 0);
        
        // Determine if service is active
        const isActive = service.is_available !== false && service.status !== 'inactive';
        const statusClass = isActive ? 'active' : 'inactive';
        const statusText = isActive ? 'Active' : 'Inactive';
        
        return `
            <div class="service-card ${statusClass}">
                ${this.renderServiceImage(service, serviceName)}
                
                <div class="service-category">${this.escapeHtml(categoryName)}</div>
                
                <div class="service-status ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="service-header">
                    <h3 class="service-title">${this.escapeHtml(serviceName)}</h3>
                    <div class="service-price">
                        <span class="starting-from">Starting from</span>
                        ₱${price.toFixed(2)}
                    </div>
                </div>
                
                <p class="service-description">${this.escapeHtml(service.description || service.service_description || '')}</p>
                
                <div class="service-meta">
                    <div class="service-meta-item">
                        <span class="label">Specific Services</span>
                        <span class="value">${service.specific_services?.length || 0}</span>
                    </div>
                    <div class="service-meta-item">
                        <span class="label">Certificates</span>
                        <span class="value">${service.certificates?.length || 0}</span>
                    </div>
                    <div class="service-meta-item">
                        <span class="label">Bookings</span>
                        <span class="value">0</span>
                    </div>
                </div>
                
                <div class="service-details">
                    <strong>Certificates:</strong> ${this.escapeHtml(certificateNames)}
                </div>

                <div class="service-actions">
                    <button class="btn btn-secondary" onclick="window.serviceManager.editService(${service.listing_id || service.service_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${isActive ? 
                        `<button class="btn btn-warning" onclick="window.serviceManager.deactivateService(${service.listing_id || service.service_id}, '${this.escapeHtml(serviceName)}')">
                            <i class="fas fa-pause"></i> Deactivate
                        </button>` :
                        `<button class="btn btn-success" onclick="window.serviceManager.activateService(${service.listing_id || service.service_id}, '${this.escapeHtml(serviceName)}')">
                            <i class="fas fa-play"></i> Activate
                        </button>`
                    }
                    <button class="btn btn-delete" onclick="window.serviceManager.deleteService(${service.listing_id || service.service_id}, '${this.escapeHtml(serviceName)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    // Helper function to safely render service images
    renderServiceImage(service, serviceName = 'Service') {
        const hasValidImage = service.service_picture && 
                              service.service_picture !== 'undefined' && 
                              service.service_picture !== 'null' && 
                              service.service_picture !== null && 
                              service.service_picture.trim() !== '';
        
        if (hasValidImage) {
            const imageSrc = service.service_picture.startsWith('/') ? service.service_picture : `/${service.service_picture}`;
            return `
                <div class="service-image">
                    <img src="${imageSrc}" alt="${this.escapeHtml(serviceName)}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'service-placeholder\\' style=\\'height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: 500;\\'>\\n<i class=\\'fas fa-tools\\' style=\\'font-size: 48px; margin-bottom: 8px;\\'></i>\\n<span>${this.escapeHtml(serviceName)}</span>\\n</div>'">
                </div>
            `;
        } else {
            return `
                <div class="service-image">
                    <div class="service-placeholder" style="height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: 500;">
                        <i class="fas fa-tools" style="font-size: 48px; margin-bottom: 8px;"></i>
                        <span>${this.escapeHtml(serviceName)}</span>
                    </div>
                </div>
            `;
        }
    }

    showAddServiceModal() {
        console.log('=== showAddServiceModal called ===');
        console.log('Current modalOpen state:', this.modalOpen);
        
        // Prevent duplicate openings
        if (this.modalOpen) {
            console.log('Modal already open, ignoring duplicate request');
            return;
        }
        
        const modal = document.getElementById('addServiceModal');
        console.log('Modal element found:', !!modal);
        console.log('Modal element:', modal);
        
        if (modal) {
            this.modalOpen = true;
            console.log('Setting modalOpen to true');
              // Reset form
            const form = document.getElementById('addServiceForm');
            if (form) {
                form.reset();
                console.log('Form reset');
            } else {
                console.error('Form not found!');
            }
            
            // Clear service title and make it editable again
            this.updateServiceTitle('');
            
            this.currentEditingService = null;
            this.selectedServices = [];
            
            const modalTitle = document.querySelector('#addServiceModal .modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Service';
                console.log('Modal title set');
            }
            
            // Render certificate-service selector
            console.log('Rendering certificate service selector...');
            this.renderCertificateServiceSelector();
            this.updateSelectedServicesList();
              // Add show class to display modal
            modal.classList.add('show');
            console.log('Modal class added, modal should be visible');
            console.log('Modal classes:', modal.className);
        } else {
            console.error('Add service modal not found!');
            console.log('Available elements with modal in ID:', document.querySelectorAll('[id*="modal"]'));
        }
    }

    editService(serviceId) {
        const service = this.services.find(s => s.listing_id == serviceId);
        if (!service) {
            this.showToast('Service not found', 'error');
            return;
        }

        // Populate edit form
        this.populateEditForm(service);
          // Show edit modal
        const modal = document.getElementById('editServiceModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    populateEditForm(service) {
        document.getElementById('editServiceId').value = service.listing_id;
        document.getElementById('editServiceTitle').value = service.service_name || '';
        document.getElementById('editServiceDescription').value = service.description || service.service_description || '';
        document.getElementById('editServicePrice').value = service.price_per_hour || service.price || '';
        document.getElementById('editServiceDuration').value = service.estimated_duration || service.duration || '';
        document.getElementById('editServiceLocation').value = service.service_location || 'customer';
        document.getElementById('editServiceStatus').value = service.status || (service.is_available ? 'active' : 'inactive');
        document.getElementById('editServiceRequirements').value = service.requirements || '';
        
        // Set category
        const categorySelect = document.getElementById('editServiceCategory');
        if (categorySelect && service.category_id) {
            categorySelect.value = service.category_id;
        }
    }    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active', 'show');
        });
        this.currentEditingService = null;
        this.serviceToDelete = null;
        this.modalOpen = false; // Reset modal state
    }async handleAddService() {
        try {
            const form = document.getElementById('addServiceForm');
            
            // Validate required fields
            const serviceTitle = form.querySelector('#serviceTitle').value;
            const serviceDescription = form.querySelector('#serviceDescription').value;
            const servicePrice = form.querySelector('#servicePrice').value;
            const servicePicture = form.querySelector('#servicePicture').files[0];
            
            if (!serviceTitle || !serviceDescription || !servicePrice) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (this.selectedServices.length === 0) {
                this.showToast('Please select at least one service based on your certificates', 'error');
                return;
            }

            // Create FormData for multipart/form-data submission
            const formData = new FormData();
            const selectedService = this.selectedServices[0];
            
            formData.append('service_title', serviceTitle.trim());
            formData.append('service_description', serviceDescription.trim());
            formData.append('service_startingprice', parseFloat(servicePrice));
            formData.append('certificate_id', selectedService.certificate_id);
            
            // Add image file if selected
            if (servicePicture) {
                console.log('Service picture selected:', servicePicture);
                console.log('Service picture name:', servicePicture.name);
                console.log('Service picture size:', servicePicture.size);
                console.log('Service picture type:', servicePicture.type);
                formData.append('service_picture', servicePicture);
            } else {
                console.log('No service picture selected');
            }

            console.log('Sending service data via FormData');
            console.log('FormData contents:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
            
            const token = localStorage.getItem('fixmo_provider_token');
            console.log('Using token:', token ? 'Token found' : 'No token found');
            
            const response = await fetch('/api/services/services', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData // No Content-Type header for FormData
            });

            const result = await response.json();

            if (!response.ok) {
                this.showToast(result.message || 'Error creating service', 'error');
                return;
            }

            this.showToast('Service created successfully!', 'success');
            this.hideModals();
            await this.loadServices();
            this.renderServices();
            
        } catch (error) {
            console.error('Error creating service:', error);
            this.showToast('Error creating service', 'error');
        }
    }

    async handleEditService() {
        const form = document.getElementById('editServiceForm');
        const formData = new FormData(form);
        
        // Validate required fields
        const title = formData.get('serviceTitle');
        const description = formData.get('serviceDescription');
        const price = formData.get('servicePrice');
        const category = formData.get('serviceCategory');
        
        if (!title || !description || !price || !category) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const serviceId = formData.get('serviceId');
            const serviceData = {
                service_name: title,
                description: description,
                price_per_hour: parseFloat(price),
                category_id: parseInt(category),
                estimated_duration: formData.get('serviceDuration') ? parseFloat(formData.get('serviceDuration')) : null,
                service_location: formData.get('serviceLocation'),
                requirements: formData.get('serviceRequirements'),
                status: formData.get('serviceStatus'),
                is_available: formData.get('serviceStatus') === 'active'
            };
            const response = await fetch(`/api/services/services/${serviceId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Service updated successfully!', 'success');
                this.hideModals();
                await this.loadServices();
                this.renderServices();
            } else {
                this.showToast(result.message || 'Error updating service', 'error');
            }
        } catch (error) {
            console.error('Error updating service:', error);
            this.showToast('Error updating service', 'error');
        }
    }    async toggleService(serviceId) {
        try {
            const response = await fetch(`/api/services/services/${serviceId}/toggle`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(result.message, 'success');
                await this.loadServices();
                this.renderServices();
            } else {
                this.showToast(result.message || 'Error updating service', 'error');
            }
        } catch (error) {
            console.error('Error toggling service:', error);
            this.showToast('Error updating service', 'error');
        }
    }

    deleteService(serviceId, serviceName) {
        // Show confirmation modal
        this.serviceToDelete = serviceId;
        document.getElementById('deleteServiceName').textContent = serviceName;
          const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            modal.classList.add('show');        }
    }

    async confirmDeleteService() {
        if (!this.serviceToDelete) return;

        try {
            const response = await fetch(`/api/services/services/${this.serviceToDelete}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Service deleted successfully!', 'success');
                this.hideModals();
                await this.loadServices();
                this.renderServices();
            } else {
                this.showToast(result.message || 'Error deleting service', 'error');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showToast('Error deleting service', 'error');
        } finally {
            this.serviceToDelete = null;
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Add to container
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || icons.info;
    }    renderCertificateServiceSelector() {
        const container = document.getElementById('certificateServiceSelector');
        if (!container) return;

        console.log('=== Certificate Service Selector Debug ===');
        console.log('Total certificates loaded:', this.certificates.length);
        console.log('Certificates data:', this.certificates);
        
        // Filter certificates to only include approved ones
        const approvedCertificates = this.certificates.filter(cert => 
            cert.certificate_status === 'Approved'
        );
        
        console.log('Approved certificates:', approvedCertificates.length);
        console.log('Certificate services:', this.certificateServices.length);

        if (approvedCertificates.length === 0 || this.certificateServices.length === 0) {
            const totalCertificates = this.certificates.length;
            const pendingCount = this.certificates.filter(c => c.certificate_status === 'Pending').length;
            const rejectedCount = this.certificates.filter(c => c.certificate_status === 'Rejected').length;
            
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-certificate" style="font-size: 2rem; margin-bottom: 1rem; color: var(--provider-warning);"></i>
                    ${totalCertificates === 0 ? `
                        <h3>No Certificates Found</h3>
                        <p>You need to upload your TESDA certificates first to add services.</p>
                        <button class="btn-primary" onclick="window.certificateManager.showAddCertificateModal()" style="margin-top: 1rem;">
                            <i class="fas fa-plus"></i> Add Certificate
                        </button>
                    ` : `
                        <h3>No Approved Certificates</h3>
                        <p>You have ${totalCertificates} certificate(s), but none are approved yet.</p>
                        <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                            <div><i class="fas fa-clock" style="color: var(--provider-warning);"></i> ${pendingCount} Pending Review</div>
                            ${rejectedCount > 0 ? `<div><i class="fas fa-times-circle" style="color: var(--provider-error);"></i> ${rejectedCount} Rejected</div>` : ''}
                        </div>
                        <p style="margin-top: 1rem;">Only approved certificates can be used to create services.</p>
                        <button class="btn-secondary" onclick="window.certificateManager.showViewCertificatesModal()" style="margin-top: 1rem;">
                            <i class="fas fa-eye"></i> View My Certificates
                        </button>
                    `}
                </div>
            `;
            return;
        }

        // Create a dropdown with all available services organized by category
        let options = '<option value="">Select a service to offer...</option>';
        
        // Group certificate services by certificate (only approved certificates)
        const certificateGroups = this.certificateServices.filter(certData => 
            approvedCertificates.some(cert => cert.certificate_name === certData.certificate)
        );

        // Group all services by category across all approved certificates, avoiding duplicates
        const categorizedServices = {};
        
        certificateGroups.forEach(certData => {
            const certificate = approvedCertificates.find(cert => cert.certificate_name === certData.certificate);
            
            Object.entries(certData.categories).forEach(([categoryName, services]) => {
                if (!categorizedServices[categoryName]) {
                    categorizedServices[categoryName] = [];
                }
                
                services.forEach(serviceName => {
                    // Check if this service already exists in this category (avoid duplicates)
                    const existingService = categorizedServices[categoryName].find(s => 
                        s.serviceName === serviceName && s.certificate_id === certificate.certificate_id
                    );
                    
                    if (!existingService) {
                        categorizedServices[categoryName].push({
                            certificate_id: certificate.certificate_id,
                            certificate_name: certificate.certificate_name,
                            categoryName,
                            serviceName
                        });
                    }
                });
            });
        });

        // Sort categories alphabetically and build optgroups
        const sortedCategories = Object.keys(categorizedServices).sort();
        sortedCategories.forEach(categoryName => {
            const services = categorizedServices[categoryName];
            options += `<optgroup label="📋 ${categoryName}">`;
            
            // Sort services within each category
            services.sort((a, b) => a.serviceName.localeCompare(b.serviceName)).forEach(service => {
                const optionValue = JSON.stringify(service);
                options += `<option value='${optionValue}'>${service.serviceName} (🏆 ${service.certificate_name})</option>`;
            });
            options += `</optgroup>`;
        });

        const html = `
            <div class="service-selector-container">
                <div class="form-group">
                    <label for="serviceDropdown">
                        <i class="fas fa-list"></i> Available Services:
                    </label>
                    <select id="serviceDropdown" class="form-control" onchange="window.serviceManager.onServiceSelected(this.value)">
                        ${options}
                    </select>
                    <small class="form-help">
                        <i class="fas fa-info-circle"></i> 
                        Choose a service you're certified to offer. The service title will be automatically filled.
                    </small>
                </div>
                  <div class="certificates-summary" style="margin-top: 1rem;">
                    <h4><i class="fas fa-certificate"></i> Your Approved Certificates & Services:</h4>
                    <div class="certificates-grid">
                        ${certificateGroups.map(certData => {
                            const certificate = approvedCertificates.find(cert => cert.certificate_name === certData.certificate);
                            const totalServices = Object.values(certData.categories).reduce((sum, services) => sum + services.length, 0);
                            return `
                                <div class="certificate-card">
                                    <div class="certificate-header">
                                        <i class="fas fa-award"></i> 
                                        <span class="certificate-name">${this.escapeHtml(certData.certificate)}</span>
                                        <span class="service-count">${totalServices} services</span>
                                        <span class="certificate-status approved">
                                            <i class="fas fa-check-circle"></i> Approved
                                        </span>
                                    </div>
                                    <div class="certificate-categories">
                                        ${Object.entries(certData.categories).map(([categoryName, services]) => `
                                            <div class="category-group">
                                                <div class="category-title">
                                                    <i class="fas fa-tag"></i> ${this.escapeHtml(categoryName)} 
                                                    <span class="category-count">(${services.length})</span>
                                                </div>
                                                <div class="services-grid">
                                                    ${services.slice(0, 3).map(serviceName => `
                                                        <span class="service-badge">${this.escapeHtml(serviceName)}</span>
                                                    `).join('')}
                                                    ${services.length > 3 ? `
                                                        <span class="service-badge more">+${services.length - 3} more</span>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }    onServiceSelected(optionValue) {
        console.log('Service selected:', optionValue);
        
        if (!optionValue) {
            this.selectedServices = [];
            this.updateSelectedServicesList();
            this.updateServiceTitle('');
            return;
        }

        try {
            const serviceData = JSON.parse(optionValue);
            
            // Check if provider already has a service with this certificate
            const certificateUsed = this.services.find(existingService => {
                // Check if any of the existing service's certificates match the selected service's certificate
                return existingService.certificates && 
                       existingService.certificates.some(cert => cert.certificate_name === serviceData.certificate);
            });

            if (certificateUsed) {
                this.showToast(`You already have a service "${certificateUsed.service_title}" using the certificate "${serviceData.certificate}". Please choose a different service or edit your existing service.`, 'error');
                
                // Reset the dropdown
                const dropdown = document.getElementById('serviceDropdown');
                if (dropdown) dropdown.value = '';
                
                return;
            }
            
            // Clear previous selections and add new one (single selection mode)
            this.selectedServices = [serviceData];
            
            // Update the service title field with the selected service name (auto-fill and readonly)
            this.updateServiceTitle(serviceData.serviceName);
            
            // Update the selected services display
            this.updateSelectedServicesList();
            
            // Add visual feedback
            this.showToast(`Service "${serviceData.serviceName}" selected!`, 'success');
            
            console.log('Selected service:', serviceData);
            console.log('Total selected services:', this.selectedServices.length);
            
        } catch (error) {
            console.error('Error parsing selected service:', error);
            this.showToast('Error selecting service. Please try again.', 'error');
        }
    }updateServiceTitle(serviceName) {
        const serviceTitleInput = document.getElementById('serviceTitle');
        if (serviceTitleInput) {
            serviceTitleInput.value = serviceName;
            // Make it readonly when auto-filled from service selection
            serviceTitleInput.readOnly = !!serviceName;
            
            if (serviceName) {
                serviceTitleInput.style.backgroundColor = '#e8f5e8';
                serviceTitleInput.style.borderColor = '#28a745';
                serviceTitleInput.style.color = '#155724';
                serviceTitleInput.style.fontWeight = '500';
                serviceTitleInput.title = 'Auto-filled from selected service';
                
                // Add visual indicator that it's auto-filled
                const parentGroup = serviceTitleInput.closest('.form-group');
                if (parentGroup) {
                    let indicator = parentGroup.querySelector('.auto-fill-indicator');
                    if (!indicator) {
                        indicator = document.createElement('small');
                        indicator.className = 'auto-fill-indicator';
                        indicator.innerHTML = '<i class="fas fa-magic"></i> Auto-filled from service selection';
                        indicator.style.color = '#28a745';
                        indicator.style.fontWeight = '500';
                        indicator.style.marginTop = '0.25rem';
                        indicator.style.display = 'block';
                        parentGroup.appendChild(indicator);
                    }
                }
            } else {
                serviceTitleInput.style.backgroundColor = '';
                serviceTitleInput.style.borderColor = '';
                serviceTitleInput.style.color = '';
                serviceTitleInput.style.fontWeight = '';
                serviceTitleInput.title = '';
                
                // Remove auto-fill indicator
                const parentGroup = serviceTitleInput.closest('.form-group');
                if (parentGroup) {
                    const indicator = parentGroup.querySelector('.auto-fill-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }
            }
        }
    }updateSelectedServicesList() {
        const listContainer = document.getElementById('selectedServicesList');
        const servicesContainer = document.getElementById('selectedServicesContainer');
        
        if (!listContainer || !servicesContainer) return;

        if (this.selectedServices.length === 0) {
            listContainer.style.display = 'none';
            return;
        }

        listContainer.style.display = 'block';
        
        const html = this.selectedServices.map((service, index) => {
            const certificate = this.certificates.find(c => c.certificate_id === service.certificate_id);
            return `
                <div class="selected-service-item">
                    <div class="selected-service-info">
                        <div class="selected-service-name">
                            <i class="fas fa-wrench"></i>
                            ${this.escapeHtml(service.serviceName)}
                        </div>
                        <div class="selected-service-category">
                            <i class="fas fa-folder"></i>
                            ${this.escapeHtml(service.categoryName)}
                        </div>
                        <div class="selected-service-certificate">
                            <i class="fas fa-certificate"></i>
                            Certified by: ${this.escapeHtml(certificate?.certificate_name || 'Unknown')}
                        </div>
                    </div>
                    <button type="button" class="remove-service-btn" onclick="window.serviceManager.removeSelectedService(${index})" title="Remove this service">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        servicesContainer.innerHTML = html;
        
        // Add smooth animation
        setTimeout(() => {
            const items = servicesContainer.querySelectorAll('.selected-service-item');
            items.forEach((item, i) => {
                item.style.animationDelay = `${i * 0.1}s`;
                item.classList.add('fade-in');
            });
        }, 10);
    }    removeSelectedService(index) {
        const removedService = this.selectedServices[index];
        console.log('Removing service:', removedService);
        
        this.selectedServices.splice(index, 1);
        
        // Reset the dropdown to "Select a service..."
        const dropdown = document.getElementById('serviceDropdown');
        if (dropdown) {
            dropdown.value = '';
        }
        
        // Clear the service title
        this.updateServiceTitle('');        
        // Update the display
        this.updateSelectedServicesList();
        
        // Show feedback
        if (removedService) {
            this.showToast(`Service "${removedService.serviceName}" removed`, 'info');
        }
          console.log('Remaining selected services:', this.selectedServices.length);
    }

    // Toggle service status (activate/deactivate)
    async deactivateService(serviceId, serviceName) {
        if (!confirm(`Are you sure you want to deactivate "${serviceName}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('fixmo_provider_token');
              const response = await fetch(`/api/services/services/${serviceId}/toggle`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })                }
            });

            if (response.ok) {
                this.showToast(`Service "${serviceName}" deactivated successfully`, 'success');
                await this.loadServices();
                this.renderServices();
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Failed to deactivate service', 'error');
            }
        } catch (error) {
            console.error('Error deactivating service:', error);            this.showToast('Error deactivating service', 'error');
        }
    }

    async activateService(serviceId, serviceName) {
        try {
            const token = localStorage.getItem('fixmo_provider_token');
              const response = await fetch(`/api/services/services/${serviceId}/toggle`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                this.showToast(`Service "${serviceName}" activated successfully`, 'success');
                await this.loadServices();
                this.renderServices();
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Failed to activate service', 'error');
            }
        } catch (error) {
            console.error('Error activating service:', error);
            this.showToast('Error activating service', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global function for image validation (called from HTML)
function validateImageOrientation(input) {
    const file = input.files[0];
    const previewDiv = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!file) {
        previewDiv.style.display = 'none';
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        input.value = '';
        previewDiv.style.display = 'none';
        return;
    }
    
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        img.onload = function() {
            if (this.width <= this.height) {
                alert('Please upload a landscape image (width must be greater than height)');
                input.value = '';
                previewDiv.style.display = 'none';
                return;
            }
            
            // Show preview
            previewImg.src = e.target.result;
            previewDiv.style.display = 'block';
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Service manager will be initialized by the dashboard when needed
// Ensure global availability
window.ServiceManager = ServiceManager;

// Initialize immediately if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('ServiceManager class is available globally');
    if (!window.serviceManager) {
        console.log('Creating emergency service manager instance...');
        // Create instance immediately for debugging
        window.serviceManager = new ServiceManager();
        console.log('Emergency service manager created');
    }
});
