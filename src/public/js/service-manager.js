// Service Management JavaScript
class ServiceManager {    constructor() {
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
            console.log('Initializing service manager...');            // Load initial data
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
    }    setupEventListeners() {
        console.log('Setting up service manager event listeners...');        // Add service buttons (main button and empty state button)
        const setupAddServiceButtons = () => {
            const addServiceBtn = document.getElementById('addServiceBtn');
            const addFirstServiceBtn = document.getElementById('addFirstServiceBtn');
            const clearFiltersBtn = document.getElementById('clearFiltersBtn');
            
            console.log('Add service button found:', !!addServiceBtn);
            console.log('Add first service button found:', !!addFirstServiceBtn);
            console.log('Clear filters button found:', !!clearFiltersBtn);
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
        });

        // Confirm delete
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDeleteService();
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
            const response = await fetch('/api/services/certificates', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.certificates = data.data || [];
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
    }updateServiceStats() {
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
        let filtered = [...this.services];

        // Apply status filter
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
        
        // Format price
        const price = parseFloat(service.price || service.service_startingprice || 0);
        
        return `
            <div class="service-card">
                <div class="service-category">${this.escapeHtml(categoryName)}</div>
                
                <div class="service-status active">
                    Active
                </div>
                
                <div class="service-header">
                    <h3 class="service-title">${this.escapeHtml(service.service_name || service.service_title)}</h3>
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
                    <button class="btn btn-delete" onclick="window.serviceManager.deleteService(${service.listing_id || service.service_id}, '${this.escapeHtml(service.service_name || service.service_title)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }    showAddServiceModal() {
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
            const formData = new FormData(form);
            
            // Validate required fields
            const serviceTitle = formData.get('serviceTitle');
            const serviceDescription = formData.get('serviceDescription');
            const servicePrice = formData.get('servicePrice');
            
            if (!serviceTitle || !serviceDescription || !servicePrice) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }

            if (this.selectedServices.length === 0) {
                this.showToast('Please select at least one service based on your certificates', 'error');
                return;
            }

            // For each selected certificate, create a service
            for (const selectedService of this.selectedServices) {
                const serviceData = {
                    service_title: serviceTitle.trim(),
                    service_description: serviceDescription.trim(),
                    service_startingprice: parseFloat(servicePrice),
                    certificate_id: selectedService.certificate_id
                };

                console.log('Sending service data:', serviceData);

                const response = await fetch('/api/services/services', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(serviceData)
                });

                const result = await response.json();

                if (!response.ok) {
                    this.showToast(result.message || `Error creating service for certificate ${selectedService.certificate_name}`, 'error');
                    return;
                }
            }

            this.showToast('Service(s) created successfully!', 'success');
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

            const response = await fetch(`/api/services/service/${serviceId}`, {
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
    }

    async toggleService(serviceId) {
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
            modal.classList.add('show');
        }
    }    async confirmDeleteService() {
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

        if (this.certificates.length === 0 || this.certificateServices.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-certificate" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>You need to upload your TESDA certificates first to add services.</p>
                    <p>Go to your profile to upload certificates.</p>
                </div>
            `;
            return;
        }

        // Group certificate services by certificate
        const certificateGroups = this.certificateServices.filter(certData => 
            this.certificates.some(cert => cert.certificate_name === certData.certificate)
        );

        const html = certificateGroups.map(certData => {
            const certificate = this.certificates.find(cert => cert.certificate_name === certData.certificate);
            
            return `
                <div class="certificate-group">
                    <div class="certificate-header">
                        <i class="fas fa-certificate"></i> ${this.escapeHtml(certData.certificate)}
                    </div>
                    <div class="certificate-categories">
                        ${Object.entries(certData.categories).map(([categoryName, services]) => `
                            <div class="category-group">
                                <div class="category-title">
                                    <i class="fas fa-tag"></i> ${this.escapeHtml(categoryName)}
                                </div>
                                <div class="service-checkboxes">
                                    ${services.map(serviceName => {
                                        const isSelected = this.selectedServices.some(s => 
                                            s.certificate_id === certificate.certificate_id &&
                                            s.categoryName === categoryName &&
                                            s.serviceName === serviceName
                                        );
                                        return `
                                            <div class="service-checkbox ${isSelected ? 'selected' : ''}">
                                                <input type="checkbox" 
                                                       id="service_${certificate.certificate_id}_${categoryName}_${serviceName}"
                                                       ${isSelected ? 'checked' : ''}
                                                       onchange="window.serviceManager.toggleServiceSelection(${certificate.certificate_id}, '${categoryName}', '${serviceName}', this.checked)">
                                                <label for="service_${certificate.certificate_id}_${categoryName}_${serviceName}">
                                                    ${this.escapeHtml(serviceName)}
                                                </label>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }    toggleServiceSelection(certificateId, categoryName, serviceName, isSelected) {
        const serviceKey = `${certificateId}_${categoryName}_${serviceName}`;
        
        if (isSelected) {
            // Add service
            this.selectedServices.push({
                certificate_id: certificateId,
                categoryName,
                serviceName
            });
        } else {
            // Remove service
            this.selectedServices = this.selectedServices.filter(s => 
                !(s.certificate_id === certificateId && 
                  s.categoryName === categoryName && 
                  s.serviceName === serviceName)
            );
        }

        this.updateSelectedServicesList();
        
        // Update checkbox styling
        const checkbox = document.querySelector(`#service_${certificateId}_${categoryName}_${serviceName}`);
        if (checkbox) {
            const container = checkbox.closest('.service-checkbox');
            if (container) {
                container.classList.toggle('selected', isSelected);
            }
        }
    }

    updateSelectedServicesList() {
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
                        <div class="selected-service-name">${this.escapeHtml(service.serviceName)}</div>
                        <div class="selected-service-category">${this.escapeHtml(service.categoryName)}</div>
                        <div class="selected-service-certificate">Certified by: ${this.escapeHtml(certificate?.certificate_name || 'Unknown')}</div>
                    </div>
                    <button type="button" class="remove-service-btn" onclick="window.serviceManager.removeSelectedService(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        servicesContainer.innerHTML = html;
    }

    removeSelectedService(index) {
        const removedService = this.selectedServices[index];
        this.selectedServices.splice(index, 1);
        
        // Uncheck the corresponding checkbox
        const checkbox = document.querySelector(`#service_${removedService.certificate_id}_${removedService.categoryName}_${removedService.serviceName}`);
        if (checkbox) {
            checkbox.checked = false;
            const container = checkbox.closest('.service-checkbox');
            if (container) {
                container.classList.remove('selected');
            }
        }
        
        this.updateSelectedServicesList();
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Service manager will be initialized by the dashboard when needed
// Do not auto-initialize here
