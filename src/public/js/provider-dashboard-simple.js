// Simple Provider Dashboard JavaScript with Session Authentication
class ProviderDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.providerData = null;
        this.servicesData = [];
        this.bookingsData = [];
        this.statsData = {};
        this.token = localStorage.getItem('fixmo_provider_token');
        this.init();
    }

    async init() {
        console.log('Initializing provider dashboard...');
        
        // Check authentication
        const isAuthenticated = await this.checkAuthentication();
        
        if (!isAuthenticated) {
            this.redirectToLogin();
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadData();
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/auth/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                this.providerData = profileData;
                this.updateUI();
                return true;
            } else if (response.status === 401) {
                console.log('Authentication failed - unauthorized');
                this.clearAuthData();
                return false;
            }
            return false;
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    updateUI() {
        // Update provider name
        const profileName = document.getElementById('profileName');
        if (profileName && this.providerData) {
            const fullName = `${this.providerData.provider_first_name || ''} ${this.providerData.provider_last_name || ''}`.trim();
            profileName.textContent = fullName || this.providerData.provider_userName || 'Provider';
        }

        // Update verification status
        const verificationText = document.getElementById('verificationText');
        const verificationIcon = document.querySelector('.verification-icon');
        if (this.providerData.provider_isVerified) {
            if (verificationText) verificationText.textContent = 'Verified';
            if (verificationIcon) verificationIcon.classList.add('verified');
        } else {
            if (verificationText) verificationText.textContent = 'Unverified';
            if (verificationIcon) verificationIcon.classList.add('unverified');
        }
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigateToPage(page);
                    this.setActiveNav(item);
                }
            });
        });

        // Profile dropdown
        const profileInfo = document.querySelector('.profile-info');
        const profileDropdown = document.getElementById('profileDropdown');
        
        if (profileInfo && profileDropdown) {
            profileInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                profileDropdown.classList.remove('active');
            });
        }

        // Dropdown items
        document.querySelectorAll('.dropdown-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

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
    }

    navigateToPage(page) {
        console.log('Navigating to page:', page);

        // Special case for manage-services
        if (page === 'manage-services') {
            window.location.href = '/provider-manage-services';
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
            this.loadPageContent(page);
        } else {
            console.warn(`Page not found: ${page}Page`);
        }
    }

    setActiveNav(activeItem) {
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active to clicked item
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    async loadData() {
        try {
            // Load stats
            await this.loadStats();
            
            // Load services
            await this.loadServices();
            
            // Load bookings
            await this.loadBookings();
            
            // Render dashboard
            this.renderDashboard();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadStats() {
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
                this.statsData = await response.json();
            } else {
                this.statsData = {
                    totalEarnings: 0,
                    activeBookings: 0,
                    providerRating: 0,
                    totalServices: 1
                };
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.statsData = {
                totalEarnings: 0,
                activeBookings: 0,
                providerRating: 0,
                totalServices: 1
            };
        }
    }

    async loadServices() {
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
                this.servicesData = await response.json();
            } else {
                this.servicesData = [];
            }
        } catch (error) {
            console.error('Error loading services:', error);
            this.servicesData = [];
        }
    }

    async loadBookings() {
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
                this.bookingsData = await response.json();
            } else {
                this.bookingsData = [];
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookingsData = [];
        }
    }

    renderDashboard() {
        // Update stats
        this.updateStatCards();
        
        // Update recent services
        this.updateRecentServices();
        
        // Update recent bookings
        this.updateRecentBookings();
    }

    updateStatCards() {
        const elements = {
            'totalEarnings': document.getElementById('totalEarnings'),
            'activeBookings': document.getElementById('activeBookings'),
            'providerRating': document.getElementById('providerRating'),
            'totalServices': document.getElementById('totalServices')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                let value = this.statsData[key] || 0;
                if (key === 'totalEarnings') {
                    elements[key].textContent = `₱${value.toLocaleString()}`;
                } else if (key === 'providerRating') {
                    elements[key].textContent = value.toFixed(1);
                } else {
                    elements[key].textContent = value;
                }
            }
        });
    }

    updateRecentServices() {
        const container = document.getElementById('recentServices');
        if (!container) return;

        if (this.servicesData.length === 0) {
            container.innerHTML = '<p class="no-data">No services found.</p>';
            return;
        }

        const recent = this.servicesData.slice(0, 3);
        container.innerHTML = recent.map(service => `
            <div class="service-item">
                <h4>${service.service_name || 'Unnamed Service'}</h4>
                <p>₱${service.price_per_hour || 0}/hour</p>
            </div>
        `).join('');
    }

    updateRecentBookings() {
        const container = document.getElementById('recentBookings');
        if (!container) return;

        if (this.bookingsData.length === 0) {
            container.innerHTML = '<p class="no-data">No recent bookings.</p>';
            return;
        }

        const recent = this.bookingsData.slice(0, 3);
        container.innerHTML = recent.map(booking => `
            <div class="booking-item">
                <h4>${booking.service_name || 'Service'}</h4>
                <p>${new Date(booking.booking_date).toLocaleDateString()}</p>
                <span class="status-${booking.status}">${booking.status}</span>
            </div>
        `).join('');
    }

    loadPageContent(page) {
        switch(page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'bookings':
                this.loadBookingsPage();
                break;
            case 'profile':
                this.loadProfilePage();
                break;
            case 'settings':
                this.loadSettingsPage();
                break;
        }
    }

    loadBookingsPage() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        if (this.bookingsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h3>No bookings yet</h3>
                    <p>Your bookings will appear here when customers book your services.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.bookingsData.map(booking => `
            <div class="booking-card">
                <h3>${booking.service_name || 'Service'}</h3>
                <p>Customer: ${booking.customer_name || 'Unknown'}</p>
                <p>Date: ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p>Status: <span class="status-${booking.status}">${booking.status}</span></p>
            </div>
        `).join('');
    }

    loadProfilePage() {
        const container = document.getElementById('profileContainer');
        if (!container) return;

        const provider = this.providerData;
        container.innerHTML = `
            <div class="profile-form">
                <h3>Provider Information</h3>
                <form id="profileForm">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" value="${provider.provider_first_name || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" value="${provider.provider_last_name || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${provider.provider_email || ''}" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" value="${provider.provider_phone_number || ''}" class="form-control">
                    </div>
                    <button type="submit" class="btn-primary">Update Profile</button>
                </form>
            </div>
        `;
    }

    loadSettingsPage() {
        const container = document.getElementById('settingsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-form">
                <h3>Account Settings</h3>
                <div class="setting-item">
                    <label>
                        <input type="checkbox" checked> Email notifications
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
                <button class="btn-primary">Save Settings</button>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        console.log(`Toast: ${message} (${type})`);
        // Simple alert for now
        alert(message);
    }

    async logout() {
        if (confirm('Are you sure you want to sign out?')) {
            try {
                await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            this.clearAuthData();
            window.location.href = '/fixmo-login';
        }
    }

    clearAuthData() {
        localStorage.removeItem('fixmo_provider_token');
        localStorage.removeItem('fixmo_provider_id');
        localStorage.removeItem('fixmo_provider_name');
        localStorage.removeItem('fixmo_user_type');
    }

    redirectToLogin() {
        this.clearAuthData();
        window.location.href = '/fixmo-login';
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    window.dashboard = new ProviderDashboard();
});

// Global functions for backwards compatibility
function showProfile() {
    if (window.dashboard) {
        window.dashboard.navigateToPage('profile');
    }
}

function logout() {
    if (window.dashboard) {
        window.dashboard.logout();
    }
}
