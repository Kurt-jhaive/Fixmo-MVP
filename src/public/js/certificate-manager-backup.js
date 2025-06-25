// Certificate Management JavaScript
class CertificateManager {
    constructor() {
        this.certificates = [];
        this.serviceCategories = [];
        this.initialized = false;
        this.currentFilter = 'all';
        this.currentSearch = '';
    }

    async init() {
        if (this.initialized) {
            console.log('Certificate manager already initialized');
            return;
        }

        try {
            console.log('Initializing certificate manager...');
            
            // Load initial data
            await Promise.all([
                this.loadCertificates(),
                this.loadServiceCategories()
            ]);
            
            this.setupEventListeners();
            this.populateCertificateDropdown();
            this.initialized = true;
            console.log('Certificate manager initialized successfully');
        } catch (error) {
            console.error('Error initializing certificate manager:', error);
            this.showToast('Error loading certificate data', 'error');
        }
    }

    setupEventListeners() {
        console.log('Setting up certificate manager event listeners...');

        // Add certificate button
        const addCertificateBtn = document.getElementById('addCertificateBtn');
        if (addCertificateBtn) {
            addCertificateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Add certificate button clicked!');
                this.showAddCertificateModal();
            });
        }

        // View certificates button
        const viewCertificatesBtn = document.getElementById('viewCertificatesBtn');
        if (viewCertificatesBtn) {
            viewCertificatesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('View certificates button clicked!');
                this.showViewCertificatesModal();
            });
        }

        // Certificate dropdown
        const certificateSelect = document.getElementById('selectedCertificate');
        if (certificateSelect) {
            certificateSelect.addEventListener('change', (e) => {
                this.onCertificateSelected(e.target.value);
            });
        }

        // File upload handling
        const fileInput = document.getElementById('certificateFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }

        // Drop zone handling
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const fileInput = document.getElementById('certificateFile');
                    fileInput.files = files;
                    this.handleFileSelect(files[0]);
                }
            });
        }

        // Modal closes
        const modalCloses = document.querySelectorAll('#addCertificateModalClose, #viewCertificatesModalClose, #cancelAddCertificate');
        modalCloses.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModals();
                this.resetAddCertificateForm();
            });
        });

        // Add certificate form
        const addCertificateForm = document.getElementById('addCertificateForm');
        if (addCertificateForm) {
            addCertificateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCertificate();
            });
        }

        // Delete certificate buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-certificate')) {
                const certificateId = e.target.getAttribute('data-certificate-id');
                this.deleteCertificate(parseInt(certificateId));
            }
        });

        // Certificate filters and search
        const searchInput = document.getElementById('certificateSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.filterAndDisplayCertificates();
            });
        }

        const filterButtons = document.querySelectorAll('.certificate-filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.certificate-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.getAttribute('data-filter');
                this.filterAndDisplayCertificates();
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshCertificates');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadCertificates();
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
                this.resetAddCertificateForm();
            }
        });        console.log('Certificate manager event listeners set up successfully');
    }

    async loadCertificates() {
        try {
            console.log('Loading certificates...');
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/certificates', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });            if (response.ok) {
                const responseData = await response.json();
                console.log('Raw certificates response:', responseData);
                
                // Handle the response format from the controller: {success: true, data: certificates}                if (responseData.success && Array.isArray(responseData.data)) {
                    this.certificates = responseData.data.map(cert => ({
                        certificate_id: cert.certificate_id,
                        certificate_name: cert.certificate_name,
                        certificate_file_path: cert.certificate_file_path,
                        certificate_status: cert.certificate_status || 'Pending',
                        created_at: cert.created_at,
                        expiry_date: cert.expiry_date,
                        certificate_number: cert.certificate_number
                    }));
                    console.log('Certificates processed:', this.certificates.length);
                    console.log('Sample certificate:', this.certificates[0]);
                } else if (Array.isArray(responseData)) {
                    // Fallback if response is directly an array
                    this.certificates = responseData;
                } else {
                    console.warn('Unexpected response format for certificates:', responseData);
                    this.certificates = [];
                }
                
                console.log('Processed certificates:', this.certificates);
                this.filterAndDisplayCertificates();
            } else {
                console.error('Failed to load certificates:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                this.certificates = [];
                this.showToast('Failed to load certificates', 'error');
                this.filterAndDisplayCertificates();
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.certificates = [];
            this.showToast('Error loading certificates', 'error');
            this.filterAndDisplayCertificates();
        }
    }

    async loadServiceCategories() {
        try {
            console.log('Loading service categories...');
            const token = localStorage.getItem('fixmo_provider_token');
            
            // Mock service categories for now
            this.serviceCategories = [
                { category_id: 1, category_name: 'Plumbing' },
                { category_id: 2, category_name: 'Electrical' },
                { category_id: 3, category_name: 'Carpentry' },
                { category_id: 4, category_name: 'Appliance Repair' },
                { category_id: 5, category_name: 'Cleaning' }
            ];
            
            console.log('Service categories loaded:', this.serviceCategories);
        } catch (error) {
            console.error('Error loading service categories:', error);
            this.serviceCategories = [];    }

    async populateCertificateDropdown() {
        const certificateSelect = document.getElementById('certificateSelect');
        if (!certificateSelect) {
            console.error('Certificate select element not found');
            return;
        }

        try {
            console.log('Loading certificate types from API...');
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/certificates/valid-types', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const certificateTypes = await response.json();
                console.log('Certificate types loaded successfully:', certificateTypes);
                
                // Clear and populate dropdown
                certificateSelect.innerHTML = '<option value="">Choose a certificate...</option>';
                
                certificateTypes.forEach(certType => {
                    const option = document.createElement('option');
                    option.value = certType;
                    option.textContent = certType;
                    certificateSelect.appendChild(option);
                });
                
                console.log('Dropdown populated with', certificateTypes.length, 'options');
            } else {
                console.error('Failed to load certificate types, status:', response.status);
                this.populateFallbackCertificateTypes(certificateSelect);
            }
        } catch (error) {
            console.error('Error loading certificate types:', error);
            this.populateFallbackCertificateTypes(certificateSelect);
        }
    }

    populateFallbackCertificateTypes(certificateSelect) {
        certificateSelect.innerHTML = '<option value="">Select a certificate...</option>';
        
        const certificateTypes = [
            'Electrical Technician Certificate',
            'Plumbing License',
            'HVAC Certification',
            'Carpentry Certificate',
            'Appliance Repair Certification',
            'Safety Training Certificate',
            'Trade School Diploma',
            'Professional License'
        ];
        
        certificateTypes.forEach(certType => {
            const option = document.createElement('option');
            option.value = certType;
            option.textContent = certType;
            certificateSelect.appendChild(option);
        });
    }

    onCertificateSelected(certificateName) {
        if (!certificateName) {
            this.clearCertificateInfo();
            return;
        }

        // Show certificate information
        this.displayCertificateInfo(certificateName);
    }

    displayCertificateInfo(certificateName) {
        const infoContainer = document.getElementById('certificateServicesInfo');
        if (!infoContainer) return;

        // Mock certificate-service mapping
        const certificateMapping = {
            'Electrical Technician Certificate': {
                categories: {
                    'Electrical': ['Wiring Installation', 'Outlet Repair', 'Circuit Breaker Service', 'Lighting Installation']
                }
            },
            'Plumbing License': {
                categories: {
                    'Plumbing': ['Pipe Repair', 'Drain Cleaning', 'Faucet Installation', 'Water Heater Service']
                }
            },
            'HVAC Certification': {
                categories: {
                    'HVAC': ['Air Conditioning Repair', 'Heating System Service', 'Ventilation Installation']
                }
            },
            'Carpentry Certificate': {
                categories: {
                    'Carpentry': ['Furniture Repair', 'Cabinet Installation', 'Door Repair', 'Window Installation']
                }
            },
            'Appliance Repair Certification': {
                categories: {
                    'Appliance Repair': ['Refrigerator Repair', 'Washing Machine Service', 'Dryer Repair', 'Microwave Service']
                }
            }
        };

        const certMapping = certificateMapping[certificateName];
        if (certMapping) {
            this.showCertificateServicesInfo(certificateName, certMapping);
        }
    }

    showCertificateServicesInfo(certificateName, certMapping) {
        const infoContainer = document.getElementById('certificateServicesInfo');
        if (!infoContainer) return;

        const html = `
            <div class="certificate-info">
                <h4><i class="fas fa-certificate"></i> ${certificateName}</h4>
                <div class="service-categories">
                    ${Object.entries(certMapping.categories).map(([categoryName, services]) => `
                        <div class="category-group">
                            <h5><i class="fas fa-folder"></i> ${categoryName}</h5>
                            <div class="services-list">
                                ${services.map(service => `
                                    <span class="service-item">${service}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        infoContainer.innerHTML = html;
        infoContainer.style.display = 'block';
    }

    clearCertificateInfo() {
        const infoContainer = document.getElementById('certificateServicesInfo');
        if (infoContainer) {
            infoContainer.innerHTML = '';
            infoContainer.style.display = 'none';
        }
    }    handleFileSelect(file) {
        if (!file) return;

        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            this.showToast('File size must be less than 10MB', 'error');
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showToast('Only JPG and PNG image files are allowed', 'error');
            return;
        }

        // Show file info
        const fileInfo = document.getElementById('selectedFileInfo');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div class="selected-file">
                    <i class="fas fa-file-alt"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" class="remove-file-btn" onclick="window.certificateManager.removeSelectedFile()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            fileInfo.style.display = 'block';
        }

        console.log('File selected:', file.name, file.size, file.type);
    }

    removeSelectedFile() {
        const fileInput = document.getElementById('certificateFile');
        const fileInfo = document.getElementById('selectedFileInfo');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) {
            fileInfo.innerHTML = '';
            fileInfo.style.display = 'none';
        }
    }

    async handleAddCertificate() {
        try {
            const form = document.getElementById('addCertificateForm');
            const formData = new FormData(form);
            
            const certificateName = formData.get('certificateName');
            const certificateFile = formData.get('certificateFile');
            
            if (!certificateName || !certificateFile) {
                this.showToast('Please select a certificate type and upload a file', 'error');
                return;
            }

            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/certificates/upload', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('Certificate uploaded successfully!', 'success');
                this.hideModals();
                this.resetAddCertificateForm();
                await this.loadCertificates();
                this.populateCertificateDropdown();
                
                // Update service manager if it exists
                if (window.serviceManager) {
                    await window.serviceManager.loadApprovedCertificates();
                }
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Failed to upload certificate', 'error');
            }
        } catch (error) {
            console.error('Error uploading certificate:', error);
            this.showToast('Error uploading certificate', 'error');
        }
    }

    resetAddCertificateForm() {
        const form = document.getElementById('addCertificateForm');
        if (form) form.reset();
        
        this.removeSelectedFile();
        this.clearCertificateInfo();
        
        const dropdown = document.getElementById('selectedCertificate');
        if (dropdown) dropdown.value = '';
    }    showAddCertificateModal() {
        console.log('=== Showing add certificate modal ===');
        
        // Reset form
        const form = document.getElementById('addCertificateForm');
        if (form) {
            form.reset();
        }
        
        // Clear file info
        const fileInfo = document.getElementById('selectedFileInfo');
        if (fileInfo) {
            fileInfo.style.display = 'none';
            fileInfo.innerHTML = '';
        }
        
        // Populate dropdown
        console.log('Populating certificate dropdown...');
        this.populateCertificateDropdown();
        
        // Show modal
        const modal = document.getElementById('addCertificateModal');
        if (modal) {
            modal.classList.add('show');
            console.log('Modal shown successfully');
        } else {
            console.error('Add certificate modal not found in DOM');
        }
    }showViewCertificatesModal() {
        console.log('Showing view certificates modal...');
        this.filterAndDisplayCertificates();
        const modal = document.getElementById('viewCertificatesModal');
        if (modal) {
            modal.classList.add('show');
        } else {
            console.error('View certificates modal not found');
        }
    }

    filterAndDisplayCertificates() {
        // Ensure certificates is always an array
        if (!Array.isArray(this.certificates)) {
            console.warn('Certificates is not an array, initializing as empty array:', this.certificates);
            this.certificates = [];
        }

        let filteredCertificates = [...this.certificates];        // Apply status filter
        if (this.currentFilter !== 'all') {
            filteredCertificates = filteredCertificates.filter(cert => cert.certificate_status === this.currentFilter);
        }

        // Apply search filter
        if (this.currentSearch) {
            const searchTerm = this.currentSearch.toLowerCase();
            filteredCertificates = filteredCertificates.filter(cert =>
                (cert.certificate_name && cert.certificate_name.toLowerCase().includes(searchTerm)) ||
                (cert.certificate_status && cert.certificate_status.toLowerCase().includes(searchTerm))
            );
        }
        
        this.displayCertificates(filteredCertificates);
    }

    displayCertificates(certificates = []) {
        const container = document.getElementById('certificatesContainer');
        if (!container) {
            console.error('Certificates container not found');
            return;
        }

        // Ensure certificates is an array
        if (!Array.isArray(certificates)) {
            console.warn('Certificates parameter is not an array:', certificates);
            certificates = [];
        }

        if (certificates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-certificate"></i>
                    <h3>No Certificates</h3>
                    <p>${this.currentFilter === 'all' ? 
                        'You haven\'t uploaded any certificates yet.' : 
                        `No ${this.currentFilter} certificates found.`}
                    </p>
                </div>
            `;
            return;
        }        container.innerHTML = certificates.map(cert => `
            <div class="certificate-item ${cert.certificate_status || 'unknown'}">
                <div class="certificate-header">
                    <div class="certificate-icon">
                        <i class="fas fa-certificate"></i>
                    </div>
                    <div class="certificate-info">
                        <h4 class="certificate-name">${cert.certificate_name || 'Unknown Certificate'}</h4>
                        <span class="certificate-status status-${cert.certificate_status || 'unknown'}">${(cert.certificate_status || 'unknown').charAt(0).toUpperCase() + (cert.certificate_status || 'unknown').slice(1)}</span>
                    </div>                    <div class="certificate-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.certificateManager.viewCertificate('${cert.certificate_file_path || ''}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-delete delete-certificate" data-certificate-id="${cert.certificate_id || ''}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="certificate-details">
                    <div class="certificate-meta">
                        <span class="upload-date">
                            <i class="fas fa-calendar"></i> 
                            Uploaded: ${cert.created_at ? new Date(cert.created_at).toLocaleDateString() : 'Unknown date'}
                        </span>                        ${cert.certificate_status === 'approved' ? 
                            `<span class="approval-date">
                                <i class="fas fa-check-circle"></i> 
                                Approved: ${cert.approved_at ? new Date(cert.approved_at).toLocaleDateString() : 'N/A'}
                             </span>` : ''}
                    </div>
                    ${cert.admin_note ? 
                        `<div class="admin-note">
                            <i class="fas fa-comment"></i>
                            <span>Admin Note: ${cert.admin_note}</span>
                         </div>` : ''}
                </div>
            </div>
        `).join('');
    }    viewCertificate(filePath) {
        if (filePath) {
            console.log('Opening certificate file:', filePath);
            // Use the file path as-is since it's already properly formatted from backend
            window.open(filePath, '_blank');
        } else {
            this.showToast('Certificate file not found', 'error');
        }
    }

    async deleteCertificate(certificateId) {
        if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch(`/api/certificates/${certificateId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                this.showToast('Certificate deleted successfully', 'success');
                await this.loadCertificates();
                this.populateCertificateDropdown();
                
                // Update service manager if it exists
                if (window.serviceManager) {
                    await window.serviceManager.loadApprovedCertificates();
                }
            } else {
                const errorData = await response.json();
                this.showToast(errorData.message || 'Failed to delete certificate', 'error');
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            this.showToast('Error deleting certificate', 'error');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showToast(message, type = 'info') {
        // Use the dashboard's toast system if available
        if (window.providerDashboard && window.providerDashboard.showToast) {
            window.providerDashboard.showToast(message, type);
        } else {
            // Fallback toast system
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }    // Helper method to get approved certificates for service manager
    getApprovedCertificates() {
        return this.certificates.filter(cert => cert.status === 'approved');
    }
}

// Make CertificateManager globally available but don't auto-instantiate
window.CertificateManager = CertificateManager;

// Initialize immediately if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('CertificateManager class is available globally');
    if (!window.certificateManager) {
        console.log('Creating emergency certificate manager instance...');
        // Create instance immediately for debugging
        window.certificateManager = new CertificateManager();
        console.log('Emergency certificate manager created');
    }
});