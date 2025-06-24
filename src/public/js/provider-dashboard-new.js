// Provider Dashboard JavaScript with Session Authentication
class ProviderDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.providerData = null;
        this.servicesData = [];
        this.bookingsData = [];
        this.statsData = {};
        this.token = localStorage.getItem('fixmo_provider_token'); // Fallback for API calls
        this.init();
    }

    async init() {
        // Check authentication - session takes priority over localStorage
        const isAuthenticated = await this.checkAuthentication();
        
        if (!isAuthenticated) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
        this.showLoadingOverlay();
        
        // Load initial data
        try {
            await Promise.all([
                this.fetchProviderProfile(),
                this.fetchProviderStats(),
                this.fetchProviderServices(),
                this.fetchProviderBookings(),
                this.fetchRecentActivity()
            ]);
            
            this.hideLoadingOverlay();
            this.renderDashboard();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.hideLoadingOverlay();
            if (error.message === 'Authentication required') {
                this.redirectToLogin();
            } else {
                this.showToast('Error loading dashboard data', 'error');
            }
        }
    }

    async checkAuthentication() {
        try {
            // Check if session is valid by making a request to profile endpoint
            const response = await fetch('/auth/profile', {
                method: 'GET',
                credentials: 'include', // Include session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                return true;
            } else if (response.status === 401) {
                // Clear any stale localStorage data
                this.clearAuthData();
                return false;
            }
            return false;
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    clearAuthData() {
        localStorage.removeItem('fixmo_provider_token');
        localStorage.removeItem('fixmo_provider_id');
        localStorage.removeItem('fixmo_provider_name');
        localStorage.removeItem('fixmo_user_type');
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                this.updateActiveNav(link);
            });
        });

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async fetchProviderProfile() {
        try {
            const response = await fetch('/auth/profile', {
                method: 'GET',
                credentials: 'include', // Include session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                this.providerData = profileData;
                this.updateProfileDisplay();
                return profileData;
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (error) {
            console.error('Error fetching provider profile:', error);
            throw error;
        }
    }

    async fetchProviderStats() {
        try {
            const response = await fetch('/auth/stats', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const statsData = await response.json();
                this.statsData = statsData;
                return statsData;
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                // Use default stats if endpoint doesn't exist
                this.statsData = {
                    totalEarnings: 0,
                    activeBookings: 0,
                    providerRating: 0,
                    totalServices: 0,
                    monthlyBookings: 0,
                    monthlyRevenue: 0,
                    completionRate: 0,
                    popularServices: []
                };
                return this.statsData;
            }
        } catch (error) {
            console.error('Error fetching provider stats:', error);
            // Use default stats if fetch fails
            this.statsData = {
                totalEarnings: 0,
                activeBookings: 0,
                providerRating: 0,
                totalServices: 0,
                monthlyBookings: 0,
                monthlyRevenue: 0,
                completionRate: 0,
                popularServices: []
            };
            return this.statsData;
        }
    }

    async fetchProviderServices() {
        try {
            const response = await fetch('/auth/my-services', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const servicesData = await response.json();
                this.servicesData = servicesData || [];
                return servicesData;
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                this.servicesData = [];
                return [];
            }
        } catch (error) {
            console.error('Error fetching provider services:', error);
            this.servicesData = [];
            return [];
        }
    }

    async fetchProviderBookings() {
        try {
            const response = await fetch('/auth/my-bookings', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const bookingsData = await response.json();
                this.bookingsData = bookingsData || [];
                return bookingsData;
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                this.bookingsData = [];
                return [];
            }
        } catch (error) {
            console.error('Error fetching provider bookings:', error);
            this.bookingsData = [];
            return [];
        }
    }

    async fetchRecentActivity() {
        try {
            const response = await fetch('/auth/activity', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const activityData = await response.json();
                this.activityData = activityData || [];
                return activityData;
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                this.activityData = [];
                return [];
            }
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            this.activityData = [];
            return [];
        }
    }

    updateProfileDisplay() {
        const providerNameEl = document.getElementById('providerName');
        if (providerNameEl && this.providerData) {
            providerNameEl.textContent = `${this.providerData.provider_first_name || ''} ${this.providerData.provider_last_name || ''}`.trim();
        }
    }

    renderDashboard() {
        this.renderStats();
        this.renderRecentServices();
        this.renderRecentBookings();
        this.renderRecentActivity();
    }

    renderStats() {
        // Update stat cards
        const statElements = {
            totalServices: document.getElementById('totalServices'),
            activeBookings: document.getElementById('activeBookings'),
            totalEarnings: document.getElementById('totalEarnings'),
            providerRating: document.getElementById('providerRating')
        };

        Object.keys(statElements).forEach(key => {
            if (statElements[key] && this.statsData[key] !== undefined) {
                if (key === 'totalEarnings') {
                    statElements[key].textContent = `₱${this.statsData[key].toLocaleString()}`;
                } else if (key === 'providerRating') {
                    statElements[key].textContent = this.statsData[key].toFixed(1);
                } else {
                    statElements[key].textContent = this.statsData[key];
                }
            }
        });
    }

    renderRecentServices() {
        const container = document.getElementById('recentServices');
        if (!container) return;

        if (this.servicesData.length === 0) {
            container.innerHTML = '<p class="no-data">No services found. <a href="#" onclick="dashboard.showSection(\'manage-services\')">Add your first service</a></p>';
            return;
        }

        const recentServices = this.servicesData.slice(0, 3);
        container.innerHTML = recentServices.map(service => `
            <div class="service-item">
                <h4>${service.service_name}</h4>
                <p class="service-price">₱${service.price_per_hour}/hour</p>
                <p class="service-category">${service.category?.category_name || 'General'}</p>
            </div>
        `).join('');
    }

    renderRecentBookings() {
        const container = document.getElementById('recentBookings');
        if (!container) return;

        if (this.bookingsData.length === 0) {
            container.innerHTML = '<p class="no-data">No recent bookings</p>';
            return;
        }

        const recentBookings = this.bookingsData.slice(0, 3);
        container.innerHTML = recentBookings.map(booking => `
            <div class="booking-item">
                <h4>${booking.service_name || 'Service'}</h4>
                <p class="booking-date">${new Date(booking.booking_date).toLocaleDateString()}</p>
                <span class="booking-status status-${booking.booking_status}">${booking.booking_status}</span>
            </div>
        `).join('');
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!this.activityData || this.activityData.length === 0) {
            container.innerHTML = '<p class="no-data">No recent activity</p>';
            return;
        }

        const recentActivity = this.activityData.slice(0, 5);
        container.innerHTML = recentActivity.map(activity => `
            <div class="activity-item">
                <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <span class="activity-time">${this.formatTimeAgo(activity.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'booking': 'calendar-check',
            'service': 'cogs',
            'payment': 'money-bill',
            'review': 'star',
            'default': 'circle'
        };
        return icons[type] || icons.default;
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    }

    showSection(sectionName) {
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

    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'services':
                this.renderServicesSection();
                break;
            case 'bookings':
                this.renderBookingsSection();
                break;
            case 'analytics':
                this.renderAnalyticsSection();
                break;
        }
    }

    renderServicesSection() {
        // Implementation for services section
        console.log('Rendering services section with', this.servicesData.length, 'services');
    }

    renderBookingsSection() {
        // Implementation for bookings section
        console.log('Rendering bookings section with', this.bookingsData.length, 'bookings');
    }

    renderAnalyticsSection() {
        // Implementation for analytics section
        console.log('Rendering analytics section');
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async logout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Clear localStorage regardless of response
            this.clearAuthData();
            
            if (response.ok) {
                this.showToast('Logged out successfully', 'success');
            }
            
            // Redirect to login after a short delay
            setTimeout(() => {
                this.redirectToLogin();
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            // Still redirect even if logout request failed
            this.clearAuthData();
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        this.clearAuthData();
        window.location.href = '/fixmo-login';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ProviderDashboard();
});

// Global functions for backwards compatibility
function showProfile() {
    if (window.dashboard) {
        window.dashboard.showSection('profile');
    }
}

function logout() {
    if (window.dashboard) {
        window.dashboard.logout();
    }
}
