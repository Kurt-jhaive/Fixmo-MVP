class AdminDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentImageUrl = null;
        this.pendingAction = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Profile dropdown
        const profileInfo = document.querySelector('.profile-info');
        const profileDropdown = document.querySelector('#adminDropdown');
        
        if (profileInfo && profileDropdown) {
            profileInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                profileDropdown.classList.remove('show');
            });
        }

        // Sign out
        const signOutBtn = document.querySelector('#adminSignOut');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signOut();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModal(button.closest('.modal'));
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Confirmation modal
        const confirmationConfirm = document.querySelector('#confirmationConfirm');
        const confirmationCancel = document.querySelector('#confirmationCancel');
        
        if (confirmationConfirm) {
            confirmationConfirm.addEventListener('click', () => {
                this.executeConfirmedAction();
            });
        }
        
        if (confirmationCancel) {
            confirmationCancel.addEventListener('click', () => {
                this.closeModal(document.querySelector('#confirmationModal'));
            });
        }
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.querySelector(`#${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-page="${page}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentPage = page;

        // Load page-specific data
        this.loadPageData(page);
    }

    loadPageData(page) {
        switch (page) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                if (window.adminUsers) {
                    window.adminUsers.loadUsers();
                }
                break;
            case 'providers':
                if (window.adminProviders) {
                    window.adminProviders.loadProviders();
                }
                break;
            case 'certificates':
                if (window.adminCertificates) {
                    window.adminCertificates.loadCertificates();
                }
                break;
            case 'bookings':
                this.loadBookings();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading();
            
            // Load dashboard statistics
            const response = await fetch('/api/admin/dashboard-stats');
            const data = await response.json();
            
            if (response.ok) {
                this.updateDashboardStats(data);
                this.loadRecentActivity();
            } else {
                this.showToast('error', 'Error', data.message || 'Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('error', 'Error', 'Failed to load dashboard data');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(data) {
        // Update main stats
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('totalProviders').textContent = data.totalProviders || 0;
        document.getElementById('totalCertificates').textContent = data.totalCertificates || 0;
        document.getElementById('totalBookings').textContent = data.totalBookings || 0;

        // Update pending counts
        document.getElementById('pendingUsers').textContent = data.pendingUsers || 0;
        document.getElementById('pendingProviders').textContent = data.pendingProviders || 0;
        document.getElementById('pendingCertificates').textContent = data.pendingCertificates || 0;
        document.getElementById('activeBookings').textContent = data.activeBookings || 0;
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/admin/recent-activity');
            const data = await response.json();
            
            if (response.ok) {
                this.displayRecentActivity(data.activities || []);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    displayRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        
        if (activities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--admin-text-light); padding: 2rem;">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${this.formatDate(activity.created_at)}</div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'user': 'fa-user',
            'provider': 'fa-user-tie',
            'certificate': 'fa-certificate',
            'booking': 'fa-calendar-check'
        };
        return icons[type] || 'fa-circle';
    }

    async loadBookings() {
        try {
            const response = await fetch('/api/admin/bookings');
            const data = await response.json();
            
            if (response.ok) {
                this.updateBookingStats(data);
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    updateBookingStats(data) {
        document.getElementById('bookingsTotal').textContent = data.total || 0;
        document.getElementById('bookingsPending').textContent = data.pending || 0;
        document.getElementById('bookingsCompleted').textContent = data.completed || 0;
        document.getElementById('bookingsCancelled').textContent = data.cancelled || 0;
    }

    loadReports() {
        // Reports functionality to be implemented
        console.log('Loading reports...');
    }

    // Modal functions
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    }

    showImageViewer(imageUrl, title = 'Image Viewer') {
        this.currentImageUrl = imageUrl;
        document.getElementById('imageViewerTitle').textContent = title;
        document.getElementById('imageViewerImg').src = imageUrl;
        this.showModal('imageViewerModal');
    }

    downloadImage() {
        if (this.currentImageUrl) {
            const link = document.createElement('a');
            link.href = this.currentImageUrl;
            link.download = 'document.jpg';
            link.click();
        }
    }

    openImageInNewTab() {
        if (this.currentImageUrl) {
            window.open(this.currentImageUrl, '_blank');
        }
    }

    showConfirmation(title, message, description, callback, showReason = false) {
        this.pendingAction = callback;
        
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = message;
        document.getElementById('confirmationDescription').textContent = description;
        
        const reasonGroup = document.getElementById('reasonGroup');
        if (showReason) {
            reasonGroup.style.display = 'block';
        } else {
            reasonGroup.style.display = 'none';
        }
        
        this.showModal('confirmationModal');
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            const reason = document.getElementById('actionReason').value;
            this.pendingAction(reason);
            this.pendingAction = null;
            document.getElementById('actionReason').value = '';
        }
        this.closeModal(document.querySelector('#confirmationModal'));
    }

    // Utility functions
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-times-circle' : 'fa-exclamation-triangle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400000) { // Less than 24 hours
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    signOut() {
        this.showConfirmation(
            'Sign Out',
            'Are you sure you want to sign out?',
            'You will be redirected to the login page.',
            async () => {
                try {
                    const response = await fetch('/api/admin/logout', {
                        method: 'POST'
                    });
                    
                    if (response.ok) {
                        window.location.href = '/admin-login.html';
                    } else {
                        this.showToast('error', 'Error', 'Failed to sign out');
                    }
                } catch (error) {
                    console.error('Error signing out:', error);
                    this.showToast('error', 'Error', 'Failed to sign out');
                }
            }
        );
    }
}

// Initialize admin dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
