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
    }    async checkAuthentication() {
        try {
            console.log('Checking authentication...');
            console.log('Token from localStorage:', this.token);
            
            // Check if session is valid by making a request to provider profile endpoint
            const response = await fetch('/api/serviceProvider/profile', {
                method: 'GET',
                credentials: 'include', // Include session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            console.log('Profile response status:', response.status);
            
            if (response.ok) {
                const profileData = await response.json();
                console.log('Profile data received:', profileData);
                return true;
            } else if (response.status === 401) {
                console.log('Authentication failed - 401');
                const errorData = await response.json().catch(() => ({}));
                console.log('Error data:', errorData);
                // Clear any stale localStorage data
                this.clearAuthData();
                return false;
            }
            console.log('Authentication failed - other error');
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
    }    setupEventListeners() {
        // Sidebar navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateToPage(page);
                this.updateActiveNav(item);
            });
        });

        // Profile dropdown navigation
        document.querySelectorAll('.dropdown-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });        // Profile dropdown toggle
        const profileInfo = document.querySelector('.profile-info');
        const profileDropdownToggle = document.querySelector('.profile-dropdown-toggle');
        const profileDropdown = document.getElementById('profileDropdown');
        
        if (profileDropdown) {
            // Toggle dropdown when clicking profile info or toggle button
            [profileInfo, profileDropdownToggle].forEach(element => {
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.stopPropagation();
                        profileDropdown.classList.toggle('show');
                    });
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && 
                    !profileInfo?.contains(e.target) && 
                    !profileDropdownToggle?.contains(e.target)) {
                    profileDropdown.classList.remove('show');
                }
            });

            // Close dropdown when clicking on dropdown items
            profileDropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-item')) {
                    profileDropdown.classList.remove('show');
                }
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('settings');
            });
        }

        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Logout button in top nav
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }    async fetchProviderProfile() {
        try {
            console.log('Fetching provider profile...');
            const response = await fetch('/api/serviceProvider/profile', {
                method: 'GET',
                credentials: 'include', // Include session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            console.log('Profile fetch response status:', response.status);

            if (response.ok) {
                const profileData = await response.json();
                console.log('Profile data fetched successfully:', profileData);
                this.providerData = profileData;
                this.updateProfileDisplay();
                return profileData;
            } else if (response.status === 401) {
                console.log('Authentication required for profile');
                throw new Error('Authentication required');
            } else {
                console.log('Failed to fetch profile, status:', response.status);
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
    }    async fetchProviderServices() {        try {
            // For now, return empty array since endpoint doesn't exist yet
            console.log('Fetching provider services... (using mock data)');
            this.servicesData = [];
            return this.servicesData;
        } catch (error) {
            console.error('Error fetching provider services:', error);
            this.servicesData = [];
            return this.servicesData;
        }
    }    async fetchProviderBookings() {
        try {
            // For now, return empty array since endpoint doesn't exist yet
            console.log('Fetching provider bookings... (using mock data)');
            this.bookingsData = [];
            return this.bookingsData;
        } catch (error) {
            console.error('Error fetching provider bookings:', error);
            this.bookingsData = [];
            return this.bookingsData;
        }
    }    async fetchRecentActivity() {
        try {
            // For now, return empty array since endpoint doesn't exist yet
            console.log('Fetching recent activity... (using mock data)');
            this.activityData = [];
            return [];
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            this.activityData = [];
            return [];        }
    }

    updateProfileDisplay() {
        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl && this.providerData) {
            console.log('Updating profile display with data:', this.providerData);
            
            // Try different possible name combinations
            let displayName = '';
            if (this.providerData.provider_first_name && this.providerData.provider_last_name) {
                displayName = `${this.providerData.provider_first_name} ${this.providerData.provider_last_name}`;
            } else if (this.providerData.provider_userName) {
                displayName = this.providerData.provider_userName;
            } else if (this.providerData.provider_email) {
                displayName = this.providerData.provider_email.split('@')[0];
            } else {
                displayName = 'Provider';
            }
            
            profileNameEl.textContent = displayName;
            console.log('Provider name updated to:', displayName);
        } else {
            console.log('Could not update profile display:', { 
                profileNameEl: !!profileNameEl, 
                providerData: !!this.providerData 
            });
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
    }    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Convert page name to proper ID format
        let pageId;
        if (page === 'manage-services') {
            pageId = 'manageServicesPage';
        } else {
            pageId = `${page}Page`;
        }

        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;

            // Update navigation active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeNavItem = document.querySelector(`[data-page="${page}"]`);
            if (activeNavItem) {
                activeNavItem.classList.add('active');
            }

            // Load page-specific data
            this.loadPageData(page);
        } else {
            console.warn(`Page not found: ${pageId}`);
        }
    }async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'manage-services':
                await this.loadManageServicesPage();
                break;
            case 'bookings':
                await this.loadBookingsPage();
                break;
            case 'profile':
                await this.loadProfilePage();
                break;
            case 'settings':
                await this.loadSettingsPage();
                break;
        }
    }    async loadManageServicesPage() {        console.log('Loading manage services page...');
        try {
            // Initialize the service manager if it exists and hasn't been initialized
            if (typeof ServiceManager !== 'undefined') {
                if (!window.serviceManager) {
                    console.log('Creating new service manager instance...');
                    window.serviceManager = new ServiceManager();
                }
                
                // Initialize or refresh
                console.log('Initializing/refreshing service manager...');
                await window.serviceManager.init();
                console.log('Service manager loaded successfully');
            } else {
                console.error('ServiceManager class not found');
                this.showToast('Service manager not available', 'error');
            }            // Initialize certificate manager
            if (typeof CertificateManager !== 'undefined') {
                if (!window.certificateManager) {
                    console.log('Creating new certificate manager instance...');
                    window.certificateManager = new CertificateManager();
                }
                
                // Initialize or refresh
                console.log('Initializing/refreshing certificate manager...');
                await window.certificateManager.init();
                console.log('Certificate manager loaded successfully');
            } else {
                console.error('CertificateManager class not found');
                this.showToast('Certificate manager not available', 'error');
            }

            // Initialize availability manager
            if (typeof AvailabilityManager !== 'undefined') {
                if (!window.availabilityManager) {
                    console.log('Creating new availability manager instance...');
                    window.availabilityManager = new AvailabilityManager();
                }
                
                // Initialize or refresh
                console.log('Initializing/refreshing availability manager...');
                await window.availabilityManager.init();
                console.log('Availability manager loaded successfully');
            } else {
                console.error('AvailabilityManager class not found');
                this.showToast('Availability manager not available', 'error');
            }
        } catch (error) {
            console.error('Error loading manage services page:', error);
            this.showToast('Error loading services page', 'error');
        }
    }

    async loadBookingsPage() {
        console.log('Loading bookings page...');
        
        try {
            // Initialize BookingManager if not already done
            if (typeof BookingManager !== 'undefined') {
                if (!window.bookingManager) {
                    console.log('Creating new BookingManager instance...');
                    window.bookingManager = new BookingManager();
                } else {
                    console.log('Refreshing existing BookingManager...');
                    await window.bookingManager.refreshBookings();
                }
            } else {
                console.error('BookingManager class not found');
                // Fallback to original booking loading
                await this.loadBookingsPageFallback();
            }
        } catch (error) {
            console.error('Error loading bookings page:', error);
            this.showToast('Error loading bookings page', 'error');
        }
    }

    async loadBookingsPageFallback() {
        const container = document.getElementById('bookingsContainer');
        if (!container) {
            console.warn('Bookings container not found');
            return;
        }

        container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading bookings...</div>';
        
        try {
            // Fetch actual bookings data
            const bookings = await this.fetchProviderBookings();
            
            if (bookings.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <h3>No bookings yet</h3>
                        <p>Your service bookings will appear here when customers book your services.</p>
                    </div>
                `;
                return;
            }

            // Render bookings
            container.innerHTML = bookings.map(booking => `
                <div class="booking-card">
                    <div class="booking-header">
                        <h3>${booking.service_name}</h3>
                        <span class="booking-status status-${booking.status}">${booking.status}</span>
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-user"></i> ${booking.customer_name}</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                        <p><i class="fas fa-clock"></i> ${booking.booking_time}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${booking.location}</p>
                    </div>
                    <div class="booking-actions">
                        <button class="btn-primary" onclick="dashboard.viewBookingDetails(${booking.id})">
                            View Details
                        </button>
                        ${booking.status === 'pending' ? 
                            `<button class="btn-success" onclick="dashboard.acceptBooking(${booking.id})">Accept</button>` : 
                            ''
                        }
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading bookings:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading bookings</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    async loadProfilePage() {
        console.log('Loading profile page...');
        
        // Wait a bit for the page to be shown
        setTimeout(async () => {
            // Initialize ProfileManager if not already done
            if (!window.profileManager) {
                console.log('Creating new ProfileManager instance...');
                window.profileManager = new ProfileManager();
                // Pass the provider data directly
                window.profileManager.currentProvider = this.providerData;
                await window.profileManager.init();
            } else {
                console.log('Updating existing ProfileManager with latest data...');
                // Re-initialize with latest data
                window.profileManager.currentProvider = this.providerData;
                window.profileManager.renderStaticProfile();
            }
        }, 100);
    }

    async loadSettingsPage() {
        const container = document.getElementById('settingsContainer');
        if (!container) {
            console.warn('Settings container not found');
            return;
        }

        container.innerHTML = `
            <div class="settings-form-container">
                <div class="settings-form">
                    <h3>Account Settings</h3>
                    <div class="setting-section">
                        <h4>Notifications</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" checked> Email notifications for new bookings
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" checked> SMS notifications
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox"> Marketing emails
                            </label>
                        </div>
                    </div>
                    
                    <div class="setting-section">
                        <h4>Privacy</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" checked> Show profile in public directory
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" checked> Allow customer reviews
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn-primary">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    async updateProfile() {
        try {
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                userName: document.getElementById('userName').value,
                phone: document.getElementById('phone').value,
                location: document.getElementById('location').value
            };

            const response = await fetch('/auth/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.providerData = { ...this.providerData, ...result.provider };
                this.updateProfileDisplay();
                this.showToast('Profile updated successfully!', 'success');
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showToast('Error updating profile', 'error');
        }
    }

    showSection(sectionName) {
        // Redirect to navigateToPage for consistency
        this.navigateToPage(sectionName);
    }

    updateActiveNav(activeItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        if (activeItem) {
            activeItem.classList.add('active');
        }
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

    // Utility methods for actions
    viewBookingDetails(bookingId) {
        this.showToast(`Viewing details for booking ${bookingId}`, 'info');
        // TODO: Implement booking details modal
    }

    acceptBooking(bookingId) {
        if (confirm('Are you sure you want to accept this booking?')) {
            this.showToast(`Booking ${bookingId} accepted!`, 'success');
            // TODO: Implement booking acceptance logic
        }
    }    showAvailabilityModal() {
        const modal = document.getElementById('availabilityModal');
        if (modal) {
            modal.classList.add('show');
            
            // Initialize availability manager if not already done
            if (!window.availabilityManager) {
                window.availabilityManager = new AvailabilityManager();
                window.availabilityManager.init();
            }
            
            // Load the availability form
            window.availabilityManager.loadAvailabilityForm();
        }
    }    closeAvailabilityModal() {
        const modal = document.getElementById('availabilityModal');
        if (modal) {
            modal.classList.remove('show');
        }
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
