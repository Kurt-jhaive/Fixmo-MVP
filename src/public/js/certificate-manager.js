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

        // Certificate filters
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = btn.getAttribute('data-filter');
                
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update current filter and refresh display
                this.currentFilter = filter;
                this.filterAndDisplayCertificates();
            });
        });

        // Search input
        const searchInput = document.getElementById('certificatesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.filterAndDisplayCertificates();
            });
        }        // Add certificate form submission
        const addCertificateForm = document.getElementById('addCertificateForm');
        if (addCertificateForm) {
            addCertificateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCertificate();
            });
        }

        // Handle certificate view button clicks using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.certificate-view-btn')) {
                const button = e.target.closest('.certificate-view-btn');
                const filePath = button.getAttribute('data-file-path');
                console.log('Certificate view button clicked with file path:', filePath);
                this.viewCertificate(filePath);
            }
        });
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
                    console.log('Loaded certificates with file paths:');
                    this.certificates.forEach(cert => {
                        console.log(`- ${cert.certificate_name}: ${cert.certificate_file_path}`);
                    });
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
            
            const response = await fetch('/api/services/categories', {
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

        // Update the file upload label
        const fileLabel = document.querySelector('.file-upload-label');
        if (fileLabel) {
            const fileText = fileLabel.querySelector('.file-text');
            const fileHelp = fileLabel.querySelector('.file-help');
            if (fileText) fileText.textContent = 'Change File';
            if (fileHelp) fileHelp.textContent = file.name;
        }

        // Show file info
        const fileInfo = document.getElementById('selectedFileInfo');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div class="selected-file">
                    <i class="fas fa-file-image"></i>
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
    }    removeSelectedFile() {
        const fileInput = document.getElementById('certificateFile');
        const fileInfo = document.getElementById('selectedFileInfo');
        const fileLabel = document.querySelector('.file-upload-label');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) {
            fileInfo.innerHTML = '';
            fileInfo.style.display = 'none';
        }
        
        // Reset the file upload label
        if (fileLabel) {
            const fileText = fileLabel.querySelector('.file-text');
            const fileHelp = fileLabel.querySelector('.file-help');
            if (fileText) fileText.textContent = 'Choose File';
            if (fileHelp) fileHelp.textContent = 'No file chosen';
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
                const result = await response.json();                this.showToast('Certificate uploaded successfully! It will be reviewed shortly.', 'success');
                this.hideModals();
                this.resetAddCertificateForm();
                await this.loadCertificates();
                this.updateCertificateStats();
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

    updateCertificateStats() {
        console.log('Updating certificate stats...');
        
        const total = this.certificates.length;
        const approved = this.certificates.filter(cert => 
            cert.certificate_status && cert.certificate_status.toLowerCase() === 'approved'
        ).length;
        const pending = this.certificates.filter(cert => 
            cert.certificate_status && cert.certificate_status.toLowerCase() === 'pending'
        ).length;
        const rejected = this.certificates.filter(cert => 
            cert.certificate_status && cert.certificate_status.toLowerCase() === 'rejected'
        ).length;

        // Update the count elements
        const totalElement = document.getElementById('totalCertificatesCount');
        const approvedElement = document.getElementById('approvedCertificatesCount');
        const pendingElement = document.getElementById('pendingCertificatesCount');
        const rejectedElement = document.getElementById('rejectedCertificatesCount');

        if (totalElement) totalElement.textContent = total;
        if (approvedElement) approvedElement.textContent = approved;
        if (pendingElement) pendingElement.textContent = pending;
        if (rejectedElement) rejectedElement.textContent = rejected;

        console.log('Certificate stats updated:', { total, approved, pending, rejected });
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
        this.updateCertificateStats();
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
        }        container.innerHTML = certificates.map(cert => {
            const statusIcon = cert.certificate_status === 'Approved' ? 'check-circle' : 
                              cert.certificate_status === 'Rejected' ? 'times-circle' : 'clock';
            const statusColor = cert.certificate_status === 'Approved' ? 'success' : 
                               cert.certificate_status === 'Rejected' ? 'error' : 'warning';
            
            return `
                <div class="certificate-card ${cert.certificate_status?.toLowerCase() || 'pending'}">
                    <div class="certificate-card-header">
                        <div class="certificate-icon">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="certificate-main-info">
                            <h4 class="certificate-title">${cert.certificate_name || 'Unknown Certificate'}</h4>
                            <div class="certificate-status-badge ${statusColor}">
                                <i class="fas fa-${statusIcon}"></i>
                                <span>${(cert.certificate_status || 'Pending')}</span>
                            </div>
                        </div>                        <div class="certificate-actions">
                            <button class="btn-view certificate-view-btn" data-file-path="${cert.certificate_file_path || ''}" title="View Certificate">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="certificate-details">
                        <div class="detail-row">
                            <span class="detail-label">Certificate Number:</span>
                            <span class="detail-value">${cert.certificate_number || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Uploaded:</span>
                            <span class="detail-value">${cert.created_at ? new Date(cert.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        ${cert.expiry_date ? `
                            <div class="detail-row">
                                <span class="detail-label">Expires:</span>
                                <span class="detail-value">${new Date(cert.expiry_date).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');    }

    viewCertificate(filePath) {
        console.log('viewCertificate called with filePath:', filePath);
        if (filePath) {
            console.log('Opening certificate file:', filePath);
            // Use the simple certificate viewer
            if (window.showCertificateViewer) {
                window.showCertificateViewer(filePath);
            } else {
                // Fallback to simple window open
                window.open(filePath, '_blank');
            }
        } else {
            console.log('No file path provided');
            this.showToast('Certificate file not found', 'error');
        }
    }

    showCertificateModal(filePath) {
        console.log('showCertificateModal called with filePath:', filePath);
        
        // Clean up the file path to ensure proper formatting
        let cleanPath = filePath;
        if (filePath.startsWith('/uploads/')) {
            cleanPath = filePath;
        } else if (filePath.startsWith('uploads/')) {
            cleanPath = '/' + filePath;
        } else {
            // Handle malformed paths like "/uploadscertificatescertificateFile-..."
            if (filePath.includes('uploads') && !filePath.includes('/uploads/')) {
                cleanPath = filePath.replace(/uploads([^\/])/, '/uploads/$1');
            }
        }
        
        console.log('Cleaned path:', cleanPath);

        // Get or create the certificate viewer modal
        let modal = document.getElementById('certificateViewerModal');
        if (!modal) {
            console.log('Creating new certificate viewer modal');
            modal = this.createCertificateViewerModal();
            document.body.appendChild(modal);
        } else {
            console.log('Using existing certificate viewer modal');
        }

        // Determine file type
        const fileExtension = cleanPath.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
        const isPDF = fileExtension === 'pdf';

        // Update modal content
        const modalContent = modal.querySelector('.certificate-viewer-content');
        const modalTitle = modal.querySelector('.certificate-viewer-title');
        
        modalTitle.textContent = `Certificate Viewer - ${fileExtension.toUpperCase()}`;

        if (isImage) {
            modalContent.innerHTML = `
                <div class="certificate-image-container">
                    <img src="${cleanPath}" alt="Certificate" class="certificate-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="certificate-error" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Unable to load certificate image</p>
                        <a href="${cleanPath}" target="_blank" class="btn-download">
                            <i class="fas fa-download"></i> Download File
                        </a>
                    </div>
                </div>
            `;
        } else if (isPDF) {
            modalContent.innerHTML = `
                <div class="certificate-pdf-container">
                    <iframe src="${cleanPath}" class="certificate-pdf" frameborder="0">
                        <div class="certificate-error">
                            <i class="fas fa-file-pdf"></i>
                            <p>Unable to display PDF in browser</p>
                            <a href="${cleanPath}" target="_blank" class="btn-download">
                                <i class="fas fa-download"></i> Open PDF
                            </a>
                        </div>
                    </iframe>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="certificate-download-container">
                    <div class="certificate-info">
                        <i class="fas fa-file"></i>
                        <h3>Document File</h3>
                        <p>This file cannot be previewed in the browser.</p>
                        <a href="${cleanPath}" target="_blank" class="btn-download">
                            <i class="fas fa-download"></i> Download File
                        </a>
                    </div>
                </div>
            `;        }

        // Show the modal
        console.log('Showing modal...');
        modal.classList.add('show');
        
        // Force reflow and ensure modal is visible
        setTimeout(() => {
            console.log('Modal should now be visible');
            console.log('Modal classes:', modal.className);
            console.log('Modal display style:', window.getComputedStyle(modal).display);
        }, 100);
    }    createCertificateViewerModal() {
        console.log('Creating certificate viewer modal');
        const modal = document.createElement('div');
        modal.id = 'certificateViewerModal';
        modal.className = 'modal certificate-viewer-modal';
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title certificate-viewer-title">Certificate Viewer</h5>
                        <button type="button" class="modal-close-btn" onclick="window.certificateManager.closeCertificateModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="certificate-viewer-content">
                            <!-- Content will be dynamically inserted -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="window.certificateManager.closeCertificateModal()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCertificateModal();
            }
        });

        console.log('Certificate viewer modal created successfully');
        return modal;
    }

    closeCertificateModal() {
        const modal = document.getElementById('certificateViewerModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }    hideModals() {
        const modals = document.querySelectorAll('#addCertificateModal, #viewCertificatesModal, #certificateViewerModal');
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

    // Test function to manually show certificate modal
    testCertificateModal() {
        console.log('Testing certificate modal...');
        const testFilePath = '/uploads/certificates/certificateFile-1750832283633-397345785.png';
        this.showCertificateModal(testFilePath);
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
