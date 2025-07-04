class AdminCertificates {
    constructor() {
        this.certificates = [];
        this.filteredCertificates = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('certificatesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterAndDisplayCertificates();
            });
        }

        // Sort
        const sortSelect = document.getElementById('certificatesSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.filterAndDisplayCertificates();
            });
        }

        // Filter buttons
        document.querySelectorAll('#certificatesPage .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#certificatesPage .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.filterAndDisplayCertificates();
            });
        });
    }

    async loadCertificates() {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch('/api/admin/certificates');
            const data = await response.json();
            
            if (response.ok) {
                this.certificates = data.certificates || [];
                this.updateCertificateStats();
                this.filterAndDisplayCertificates();
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load certificates');
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load certificates');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    updateCertificateStats() {
        const total = this.certificates.length;
        const pending = this.certificates.filter(cert => cert.certificate_status === 'Pending').length;
        const approved = this.certificates.filter(cert => cert.certificate_status === 'Approved').length;
        const rejected = this.certificates.filter(cert => cert.certificate_status === 'Rejected').length;

        document.getElementById('certificatesTotal').textContent = total;
        document.getElementById('certificatesPending').textContent = pending;
        document.getElementById('certificatesApproved').textContent = approved;
        document.getElementById('certificatesRejected').textContent = rejected;
    }

    filterAndDisplayCertificates() {
        let filtered = [...this.certificates];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(cert => 
                cert.certificate_name.toLowerCase().includes(term) ||
                cert.certificate_number.toLowerCase().includes(term) ||
                cert.provider_name.toLowerCase().includes(term) ||
                cert.provider_email.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            switch (this.currentFilter) {
                case 'pending':
                    filtered = filtered.filter(cert => cert.certificate_status === 'Pending');
                    break;
                case 'approved':
                    filtered = filtered.filter(cert => cert.certificate_status === 'Approved');
                    break;
                case 'rejected':
                    filtered = filtered.filter(cert => cert.certificate_status === 'Rejected');
                    break;
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'provider':
                    return a.provider_name.localeCompare(b.provider_name);
                case 'certificate':
                    return a.certificate_name.localeCompare(b.certificate_name);
                default:
                    return 0;
            }
        });

        this.filteredCertificates = filtered;
        this.displayCertificates();
    }

    displayCertificates() {
        const tbody = document.getElementById('certificatesTableBody');
        
        if (this.filteredCertificates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--admin-text-light);">
                        No certificates found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredCertificates.map(cert => `
            <tr>
                <td>
                    <div class="certificate-info">
                        <div class="certificate-icon" style="width: 40px; height: 40px; background: var(--admin-warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="certificate-details">
                            <div class="certificate-name">${cert.certificate_name}</div>
                            <div class="certificate-number" style="font-size: 0.875rem; color: var(--admin-text-light);">${cert.certificate_number}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="provider-info">
                        <div class="provider-name">${cert.provider_name}</div>
                        <div class="provider-email" style="font-size: 0.875rem; color: var(--admin-text-light);">${cert.provider_email}</div>
                    </div>
                </td>
                <td>${cert.certificate_number}</td>
                <td>
                    <span class="status-badge ${cert.certificate_status.toLowerCase()}">
                        <i class="fas ${this.getStatusIcon(cert.certificate_status)}"></i>
                        ${cert.certificate_status}
                    </span>
                </td>
                <td>${this.formatDate(cert.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="adminCertificates.viewCertificate(${cert.certificate_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${cert.certificate_status === 'Pending' ? `
                            <button class="btn btn-success btn-sm" onclick="adminCertificates.approveCertificate(${cert.certificate_id})">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="adminCertificates.rejectCertificate(${cert.certificate_id})">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusIcon(status) {
        const icons = {
            'Pending': 'fa-clock',
            'Approved': 'fa-check-circle',
            'Rejected': 'fa-times-circle'
        };
        return icons[status] || 'fa-circle';
    }

    async viewCertificate(certificateId) {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch(`/api/admin/certificates/${certificateId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showCertificateDetails(data.certificate);
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load certificate details');
            }
        } catch (error) {
            console.error('Error loading certificate details:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load certificate details');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    showCertificateDetails(certificate) {
        const modalBody = document.getElementById('certificateDetailsBody');
        
        modalBody.innerHTML = `
            <div class="details-section">
                <h4>Certificate Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Certificate Name</span>
                        <span class="detail-value">${certificate.certificate_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Certificate Number</span>
                        <span class="detail-value">${certificate.certificate_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${certificate.certificate_status.toLowerCase()}">
                                <i class="fas ${this.getStatusIcon(certificate.certificate_status)}"></i>
                                ${certificate.certificate_status}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Submitted Date</span>
                        <span class="detail-value">${this.formatDate(certificate.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Expiry Date</span>
                        <span class="detail-value">${certificate.expiry_date ? this.formatDate(certificate.expiry_date) : 'No expiry'}</span>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h4>Provider Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Provider Name</span>
                        <span class="detail-value">${certificate.provider_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Provider Email</span>
                        <span class="detail-value">${certificate.provider_email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Provider Phone</span>
                        <span class="detail-value">${certificate.provider_phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Provider Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${certificate.provider_verified ? 'verified' : 'pending'}">
                                <i class="fas ${certificate.provider_verified ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${certificate.provider_verified ? 'Verified' : 'Pending'}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h4>Certificate Document</h4>
                <div class="certificate-image-container">
                    <img src="${certificate.certificate_file_path}" alt="Certificate" class="certificate-image" 
                         onclick="adminDashboard.showImageViewer('${certificate.certificate_file_path}', 'Certificate Document')">
                </div>
            </div>
            
            ${certificate.covered_services && certificate.covered_services.length > 0 ? `
                <div class="details-section">
                    <h4>Covered Services</h4>
                    <div class="services-list">
                        ${certificate.covered_services.map(service => `
                            <div class="service-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); margin-bottom: 0.5rem;">
                                <div class="service-icon" style="width: 30px; height: 30px; background: var(--admin-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-tools"></i>
                                </div>
                                <div class="service-info">
                                    <div style="font-weight: 600;">${service.service_title}</div>
                                    <div style="font-size: 0.875rem; color: var(--admin-text-light);">${service.service_description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="adminDashboard.closeModal(document.getElementById('certificateDetailsModal'))">
                    Close
                </button>
                <button class="btn btn-secondary" onclick="adminProviders.viewProvider(${certificate.provider_id})">
                    <i class="fas fa-user-tie"></i> View Provider
                </button>
                ${certificate.certificate_status === 'Pending' ? `
                    <button class="btn btn-success" onclick="adminCertificates.approveCertificate(${certificate.certificate_id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger" onclick="adminCertificates.rejectCertificate(${certificate.certificate_id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
            </div>
        `;
        
        window.adminDashboard.showModal('certificateDetailsModal');
    }

    approveCertificate(certificateId) {
        const certificate = this.certificates.find(c => c.certificate_id === certificateId);
        if (!certificate) return;

        window.adminDashboard.showConfirmation(
            'Approve Certificate',
            `Approve ${certificate.certificate_name}?`,
            'This will approve the certificate and allow the provider to offer related services.',
            async () => {
                try {
                    const response = await fetch(`/api/admin/certificates/${certificateId}/approve`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'Certificate approved successfully');
                        this.loadCertificates();
                        window.adminDashboard.closeModal(document.getElementById('certificateDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to approve certificate');
                    }
                } catch (error) {
                    console.error('Error approving certificate:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to approve certificate');
                }
            }
        );
    }

    rejectCertificate(certificateId) {
        const certificate = this.certificates.find(c => c.certificate_id === certificateId);
        if (!certificate) return;

        window.adminDashboard.showConfirmation(
            'Reject Certificate',
            `Reject ${certificate.certificate_name}?`,
            'This will reject the certificate. The provider will need to resubmit.',
            async (reason) => {
                try {
                    const response = await fetch(`/api/admin/certificates/${certificateId}/reject`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'Certificate rejected successfully');
                        this.loadCertificates();
                        window.adminDashboard.closeModal(document.getElementById('certificateDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to reject certificate');
                    }
                } catch (error) {
                    console.error('Error rejecting certificate:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to reject certificate');
                }
            },
            true // Show reason field
        );
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminCertificates = new AdminCertificates();
});
