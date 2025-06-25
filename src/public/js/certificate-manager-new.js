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
        const certificateSelect = document.getElementById('certificateSelect');
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

        // Modal close buttons
        const modalCloses = document.querySelectorAll('#addCertificateModalClose, #viewCertificatesModalClose, #cancelAddCertificate');
        modalCloses.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.hideModals();
                });
            }
        });

        // Add certificate form submission
        const addCertificateForm = document.getElementById('addCertificateForm');
        if (addCertificateForm) {
            addCertificateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCertificate();
            });
        }
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
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log('Raw certificates response:', responseData);
                
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
                    console.log('Certificates processed:', this.certificates.length);
                    console.log('Sample certificate:', this.certificates[0]);
                } else if (Array.isArray(responseData)) {
                    this.certificates = responseData;
                } else {
                    console.warn('Unexpected response format for certificates:', responseData);
                    this.certificates = [];
                }
                
                console.log('Processed certificates:', this.certificates);
                this.filterAndDisplayCertificates();
            } else {
                console.error('Failed to load certificates:', response.status);
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
            
            const response = await fetch('/api/service-categories', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const categories = await response.json();
                this.serviceCategories = categories.categories || [];
                console.log('Service categories loaded:', this.serviceCategories.length);
            } else {
                console.error('Failed to load service categories');
                this.serviceCategories = [];
            }
        } catch (error) {
            console.error('Error loading service categories:', error);
            this.serviceCategories = [];
        }
    }

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
                console.log('Certificate types loaded:', certificateTypes);
                
                certificateSelect.innerHTML = '<option value="">Choose a certificate...</option>';
                
                certificateTypes.forEach(certType => {
                    const option = document.createElement('option');
                    option.value = certType;
                    option.textContent = certType;
                    certificateSelect.appendChild(option);
                });
            } else {
                console.error('Failed to load certificate types');
                this.populateFallbackCertificateTypes(certificateSelect);
            }
        } catch (error) {
            console.error('Error loading certificate types:', error);
            this.populateFallbackCertificateTypes(certificateSelect);
        }
    }

    populateFallbackCertificateTypes(certificateSelect) {
        certificateSelect.innerHTML = '<option value="">Choose a certificate...</option>';
        
        const certificateTypes = [
            'Electrical Technician Certificate',
            'Plumbing License',
            'HVAC Technician Certificate',
            'Carpentry Skills Certificate',
            'Electronics Repair Certificate',
            'Computer Systems Servicing NC II',
            'Automotive Servicing NC I',
            'Welding NC I',
            'Food and Beverage Services NC II',
            'Housekeeping NC II',
            'Massage Therapy Certificate',
            'Hair Care Services NC II',
            'Nail Care Services NC II',
            'Beauty Care NC II'
        ];
        
        certificateTypes.forEach(certType => {
            const option = document.createElement('option');
            option.value = certType;
            option.textContent = certType;
            certificateSelect.appendChild(option);
        });
    }

    onCertificateSelected(certificateName) {
        if (certificateName) {
            this.displayCertificateInfo(certificateName);
        } else {
            this.clearCertificateInfo();
        }
    }

    displayCertificateInfo(certificateName) {
        // Find if user already has this certificate
        const existingCert = this.certificates.find(cert => 
            cert.certificate_name === certificateName
        );

        const infoContainer = document.getElementById('certificateInfo');
        if (!infoContainer) return;

        if (existingCert) {
            infoContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    You already have this certificate with status: <strong>${existingCert.certificate_status}</strong>
                </div>
            `;
        } else {
            infoContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    This certificate will allow you to offer services in related categories.
                </div>
            `;
        }
        
        infoContainer.style.display = 'block';
    }

    clearCertificateInfo() {
        const infoContainer = document.getElementById('certificateInfo');
        if (infoContainer) {
            infoContainer.innerHTML = '';
            infoContainer.style.display = 'none';
        }
    }

    handleFileSelect(file) {
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
        const form = document.getElementById('addCertificateForm');
        const formData = new FormData(form);

        const certificateName = formData.get('certificateSelect');
        const certificateNumber = formData.get('certificateNumber');
        const certificateFile = formData.get('certificateFile');
        const expiryDate = formData.get('expiryDate');

        if (!certificateName || !certificateNumber || !certificateFile) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/certificates', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('Certificate uploaded successfully! It will be reviewed shortly.', 'success');
                this.hideModals();
                this.resetAddCertificateForm();
                await this.loadCertificates();
                this.populateCertificateDropdown();
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Error uploading certificate', 'error');
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
    }

    showAddCertificateModal() {
        console.log('Showing add certificate modal...');
        this.populateCertificateDropdown();
        const modal = document.getElementById('addCertificateModal');
        if (modal) {
            modal.classList.add('show');
        } else {
            console.error('Add certificate modal not found');
        }
    }

    showViewCertificatesModal() {
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
        let filteredCertificates = [...this.certificates];

        // Apply status filter
        if (this.currentFilter !== 'all') {
            filteredCertificates = filteredCertificates.filter(cert => 
                cert.certificate_status && cert.certificate_status.toLowerCase() === this.currentFilter.toLowerCase()
            );
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
        }

        container.innerHTML = certificates.map(cert => `
            <div class="certificate-item ${cert.certificate_status || 'unknown'}">
                <div class="certificate-header">
                    <div class="certificate-icon">
                        <i class="fas fa-certificate"></i>
                    </div>
                    <div class="certificate-info">
                        <h4 class="certificate-name">${cert.certificate_name || 'Unknown Certificate'}</h4>
                        <span class="certificate-status status-${(cert.certificate_status || 'unknown').toLowerCase()}">${(cert.certificate_status || 'Unknown').charAt(0).toUpperCase() + (cert.certificate_status || 'unknown').slice(1)}</span>
                    </div>
                    <div class="certificate-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.certificateManager.viewCertificate('${cert.certificate_file_path || ''}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.certificateManager.deleteCertificate(${cert.certificate_id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="certificate-details">
                    <p><strong>Certificate Number:</strong> ${cert.certificate_number || 'N/A'}</p>
                    <p><strong>Uploaded:</strong> ${cert.created_at ? new Date(cert.created_at).toLocaleDateString() : 'N/A'}</p>
                    ${cert.expiry_date ? `<p><strong>Expires:</strong> ${new Date(cert.expiry_date).toLocaleDateString()}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    viewCertificate(filePath) {
        if (filePath) {
            console.log('Opening certificate file:', filePath);
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
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Error deleting certificate', 'error');
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            this.showToast('Error deleting certificate', 'error');
        }
    }

    hideModals() {
        const modals = document.querySelectorAll('#addCertificateModal, #viewCertificatesModal');
        modals.forEach(modal => {
            if (modal) {
                modal.classList.remove('show');
            }
        });
    }

    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
                <span>${message}</span>
            </div>
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

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Ensure global availability
window.CertificateManager = CertificateManager;

// Initialize immediately if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('CertificateManager class is available globally');
    if (!window.certificateManager) {
        console.log('CertificateManager instance will be created by dashboard');
    }
});
