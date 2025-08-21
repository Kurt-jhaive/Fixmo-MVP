class AdminProviders {
    constructor() {
        this.providers = [];
        this.filteredProviders = [];
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
        const searchInput = document.getElementById('providersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterAndDisplayProviders();
            });
        }

        // Sort
        const sortSelect = document.getElementById('providersSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.filterAndDisplayProviders();
            });
        }

        // Filter buttons
        document.querySelectorAll('#providersPage .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#providersPage .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.filterAndDisplayProviders();
            });
        });
    }

    async loadProviders() {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch('/api/admin/providers');
            const data = await response.json();
            
            if (response.ok) {
                this.providers = data.providers || [];
                this.updateProviderStats();
                this.filterAndDisplayProviders();
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load providers');
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load providers');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    updateProviderStats() {
        const total = this.providers.length;
        const verified = this.providers.filter(provider => provider.provider_isVerified).length;
        const pending = this.providers.filter(provider => !provider.provider_isVerified).length;
        const avgRating = this.providers.length > 0 ? 
            (this.providers.reduce((sum, provider) => sum + provider.provider_rating, 0) / this.providers.length).toFixed(1) : '0.0';

        document.getElementById('providersTotal').textContent = total;
        document.getElementById('providersVerified').textContent = verified;
        document.getElementById('providersPending').textContent = pending;
        document.getElementById('providersAvgRating').textContent = avgRating;
    }

    filterAndDisplayProviders() {
        let filtered = [...this.providers];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(provider => 
                provider.provider_first_name.toLowerCase().includes(term) ||
                provider.provider_last_name.toLowerCase().includes(term) ||
                provider.provider_email.toLowerCase().includes(term) ||
                provider.provider_userName.toLowerCase().includes(term) ||
                provider.provider_phone_number.includes(term)
            );
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            switch (this.currentFilter) {
                case 'verified':
                    filtered = filtered.filter(provider => provider.provider_isVerified);
                    break;
                case 'pending':
                    filtered = filtered.filter(provider => !provider.provider_isVerified);
                    break;
                case 'active':
                    filtered = filtered.filter(provider => provider.provider_isActivated);
                    break;
                case 'inactive':
                    filtered = filtered.filter(provider => !provider.provider_isActivated);
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
                case 'name':
                    return `${a.provider_first_name} ${a.provider_last_name}`.localeCompare(`${b.provider_first_name} ${b.provider_last_name}`);
                case 'rating':
                    return b.provider_rating - a.provider_rating;
                default:
                    return 0;
            }
        });

        this.filteredProviders = filtered;
        this.displayProviders();
    }

    displayProviders() {
        const tbody = document.getElementById('providersTableBody');
        
        if (this.filteredProviders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--admin-text-light);">
                        No providers found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredProviders.map(provider => `
            <tr>
                <td>
                    <div class="provider-info">
                        <div class="provider-avatar">
                            ${provider.provider_profile_photo ? 
                                `<img src="${provider.provider_profile_photo}" alt="${provider.provider_first_name}">` : 
                                `${provider.provider_first_name.charAt(0)}${provider.provider_last_name.charAt(0)}`
                            }
                        </div>
                        <div class="provider-details">
                            <div class="provider-name">${provider.provider_first_name} ${provider.provider_last_name}</div>
                            <div class="provider-username">@${provider.provider_userName}</div>
                        </div>
                    </div>
                </td>
                <td>${provider.provider_email}</td>
                <td>${provider.provider_phone_number}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${provider.provider_rating.toFixed(1)}</span>
                        <div class="rating-stars">
                            ${this.generateStars(provider.provider_rating)}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${provider.provider_isVerified ? 'verified' : 'pending'}">
                        <i class="fas ${provider.provider_isVerified ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${provider.provider_isVerified ? 'Verified' : 'Pending'}
                    </span>
                    ${!provider.provider_isActivated ? '<span class="status-badge inactive" style="margin-left: 0.5rem;"><i class="fas fa-ban"></i> Inactive</span>' : ''}
                </td>
                <td>${this.formatDate(provider.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="adminProviders.viewProvider(${provider.provider_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!provider.provider_isVerified ? `
                            <button class="btn btn-success btn-sm" onclick="adminProviders.verifyProvider(${provider.provider_id})">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${provider.provider_isActivated ? `
                            <button class="btn btn-warning btn-sm" onclick="adminProviders.deactivateProvider(${provider.provider_id})">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : `
                            <button class="btn btn-success btn-sm" onclick="adminProviders.activateProvider(${provider.provider_id})">
                                <i class="fas fa-check"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        return `
            ${'<i class="fas fa-star" style="color: #fbbf24;"></i>'.repeat(fullStars)}
            ${halfStar ? '<i class="fas fa-star-half-alt" style="color: #fbbf24;"></i>' : ''}
            ${'<i class="far fa-star" style="color: #e5e7eb;"></i>'.repeat(emptyStars)}
        `;
    }

    async viewProvider(providerId) {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch(`/api/admin/providers/${providerId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showProviderDetails(data.provider);
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load provider details');
            }
        } catch (error) {
            console.error('Error loading provider details:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load provider details');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    showProviderDetails(provider) {
        const modalBody = document.getElementById('providerDetailsBody');
        
        modalBody.innerHTML = `
            <div class="profile-image-container">
                ${provider.provider_profile_photo ? 
                    `<img src="${provider.provider_profile_photo}" alt="Profile Photo" class="profile-image" onclick="adminDashboard.showImageViewer('${provider.provider_profile_photo}', 'Profile Photo')">` : 
                    `<div class="profile-placeholder">
                        <i class="fas fa-user-tie"></i>
                    </div>`
                }
            </div>
            
            <div class="details-section">
                <h4>Personal Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">First Name</span>
                        <span class="detail-value">${provider.provider_first_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Name</span>
                        <span class="detail-value">${provider.provider_last_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${provider.provider_userName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${provider.provider_email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone Number</span>
                        <span class="detail-value">${provider.provider_phone_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Birthday</span>
                        <span class="detail-value">${provider.provider_birthday ? this.formatDate(provider.provider_birthday) : 'Not provided'}</span>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h4>Provider Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Provider Rating</span>
                        <span class="detail-value">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span>${provider.provider_rating.toFixed(1)}</span>
                                <div class="rating-stars">
                                    ${this.generateStars(provider.provider_rating)}
                                </div>
                            </div>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">ULI Number</span>
                        <span class="detail-value">${provider.provider_uli}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location</span>
                        <span class="detail-value">${provider.provider_location || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Exact Location</span>
                        <span class="detail-value">${provider.provider_exact_location || 'Not provided'}</span>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h4>Account Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Account Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${provider.provider_isActivated ? 'active' : 'inactive'}">
                                <i class="fas ${provider.provider_isActivated ? 'fa-check-circle' : 'fa-ban'}"></i>
                                ${provider.provider_isActivated ? 'Active' : 'Inactive'}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Verification Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${provider.provider_isVerified ? 'verified' : 'pending'}">
                                <i class="fas ${provider.provider_isVerified ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${provider.provider_isVerified ? 'Verified' : 'Pending'}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Joined Date</span>
                        <span class="detail-value">${this.formatDate(provider.created_at)}</span>
                    </div>
                </div>
            </div>
            
            ${provider.provider_valid_id ? `
                <div class="details-section">
                    <h4>Valid ID Document</h4>
                    <div style="text-align: center;">
                        <img src="${provider.provider_valid_id}" alt="Valid ID" class="id-document" onclick="adminDashboard.showImageViewer('${provider.provider_valid_id}', 'Valid ID Document')">
                    </div>
                </div>
            ` : ''}
            
            ${provider.certificates && provider.certificates.length > 0 ? `
                <div class="details-section">
                    <h4>Certificates (${provider.certificates.length})</h4>
                    <div class="certificates-list">
                        ${provider.certificates.map(cert => `
                            <div class="certificate-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); margin-bottom: 1rem;">
                                <div class="certificate-icon" style="width: 40px; height: 40px; background: var(--admin-warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-certificate"></i>
                                </div>
                                <div class="certificate-info" style="flex: 1;">
                                    <div style="font-weight: 600;">${cert.certificate_name}</div>
                                    <div style="font-size: 0.875rem; color: var(--admin-text-light);">${cert.certificate_number}</div>
                                    <div style="font-size: 0.875rem;">
                                        <span class="status-badge ${cert.certificate_status.toLowerCase()}">
                                            ${cert.certificate_status}
                                        </span>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm" onclick="adminCertificates.viewCertificate(${cert.certificate_id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="adminDashboard.closeModal(document.getElementById('providerDetailsModal'))">
                    Close
                </button>
                ${!provider.provider_isVerified ? `
                    <button class="btn btn-success" onclick="adminProviders.verifyProvider(${provider.provider_id})">
                        <i class="fas fa-check"></i> Verify Provider
                    </button>
                ` : ''}
                ${provider.provider_isActivated ? `
                    <button class="btn btn-warning" onclick="adminProviders.deactivateProvider(${provider.provider_id})">
                        <i class="fas fa-ban"></i> Deactivate
                    </button>
                ` : `
                    <button class="btn btn-success" onclick="adminProviders.activateProvider(${provider.provider_id})">
                        <i class="fas fa-check"></i> Activate
                    </button>
                `}
            </div>
        `;
        
        window.adminDashboard.showModal('providerDetailsModal');
    }

    verifyProvider(providerId) {
        const provider = this.providers.find(p => p.provider_id === providerId);
        if (!provider) return;

        window.adminDashboard.showConfirmation(
            'Verify Provider',
            `Verify ${provider.provider_first_name} ${provider.provider_last_name}?`,
            'This will mark the provider as verified and allow them to receive bookings.',
            async () => {
                try {
                    const response = await fetch(`/api/admin/providers/${providerId}/verify`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'Provider verified successfully');
                        this.loadProviders();
                        window.adminDashboard.closeModal(document.getElementById('providerDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to verify provider');
                    }
                } catch (error) {
                    console.error('Error verifying provider:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to verify provider');
                }
            }
        );
    }

    deactivateProvider(providerId) {
        const provider = this.providers.find(p => p.provider_id === providerId);
        if (!provider) return;

        window.adminDashboard.showConfirmation(
            'Deactivate Provider',
            `Deactivate ${provider.provider_first_name} ${provider.provider_last_name}?`,
            'This will prevent the provider from receiving new bookings.',
            async (reason) => {
                try {
                    const response = await fetch(`/api/admin/providers/${providerId}/deactivate`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'Provider deactivated successfully');
                        this.loadProviders();
                        window.adminDashboard.closeModal(document.getElementById('providerDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to deactivate provider');
                    }
                } catch (error) {
                    console.error('Error deactivating provider:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to deactivate provider');
                }
            },
            true // Show reason field
        );
    }

    activateProvider(providerId) {
        const provider = this.providers.find(p => p.provider_id === providerId);
        if (!provider) return;

        window.adminDashboard.showConfirmation(
            'Activate Provider',
            `Activate ${provider.provider_first_name} ${provider.provider_last_name}?`,
            'This will allow the provider to receive bookings.',
            async () => {
                try {
                    const response = await fetch(`/api/admin/providers/${providerId}/activate`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'Provider activated successfully');
                        this.loadProviders();
                        window.adminDashboard.closeModal(document.getElementById('providerDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to activate provider');
                    }
                } catch (error) {
                    console.error('Error activating provider:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to activate provider');
                }
            }
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
    window.adminProviders = new AdminProviders();
});
