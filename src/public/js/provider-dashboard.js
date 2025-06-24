// Provider Dashboard JavaScript
class ProviderDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.providerData = null;
        this.servicesData = [];
        this.bookingsData = [];
        this.statsData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProviderData();
        this.initializeNavigation();
        this.showLoadingOverlay();
        
        // Load initial data
        Promise.all([
            this.fetchProviderProfile(),
            this.fetchProviderStats(),
            this.fetchProviderServices(),
            this.fetchProviderBookings(),
            this.fetchRecentActivity()
        ]).then(() => {
            this.hideLoadingOverlay();
            this.renderDashboard();
        }).catch(error => {
            console.error('Error loading dashboard data:', error);
            this.hideLoadingOverlay();
            this.showToast('Error loading dashboard data', 'error');
        });
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Profile dropdown
        const profileInfo = document.querySelector('.profile-info');
        const profileDropdown = document.querySelector('.profile-dropdown');
        
        if (profileInfo && profileDropdown) {
            profileInfo.addEventListener('click', () => {
                profileDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileInfo.contains(e.target)) {
                    profileDropdown.classList.remove('show');
                }
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModal(button.closest('.modal'));
            });
        });

        // Add service form
        const addServiceForm = document.getElementById('addServiceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddService();
            });
        }

        // Add service button
        const addServiceBtn = document.getElementById('addServiceBtn');
        if (addServiceBtn) {
            addServiceBtn.addEventListener('click', () => {
                this.showAddServiceModal();
            });
        }

        // Verification button
        const verifyAccountBtn = document.getElementById('verifyAccountBtn');
        if (verifyAccountBtn) {
            verifyAccountBtn.addEventListener('click', () => {
                this.navigateToPage('profile');
            });
        }

        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                this.handleSignOut();
            });
        }

        // Booking filters
        const bookingStatusFilter = document.getElementById('bookingStatusFilter');
        if (bookingStatusFilter) {
            bookingStatusFilter.addEventListener('change', () => {
                this.filterBookings(bookingStatusFilter.value);
            });
        }
    }    loadProviderData() {
        // Get provider data from localStorage or sessionStorage
        const storedProvider = localStorage.getItem('serviceProvider') || sessionStorage.getItem('serviceProvider');
        if (storedProvider) {
            try {
                this.providerData = JSON.parse(storedProvider);
            } catch (error) {
                console.error('Error parsing provider data:', error);
            }
        }
        
        // If no stored provider data, try to get from basic auth data
        if (!this.providerData) {
            const providerId = localStorage.getItem('fixmo_provider_id');
            const providerToken = localStorage.getItem('fixmo_provider_token');
            const providerName = localStorage.getItem('fixmo_provider_name');
            
            if (providerId && providerToken) {
                this.providerData = {
                    provider_id: parseInt(providerId),
                    provider_userName: providerName
                };
                
                // Fetch complete profile data
                this.fetchProviderProfile().then(() => {
                    this.updateProfileDisplay();
                });
            }
        }
    }    async fetchProviderProfile() {
        try {
            if (!this.providerData?.provider_id) {
                throw new Error('No provider ID found');
            }

            const response = await fetch(`/api/serviceProvider/profile/${this.providerData.provider_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const profileData = await response.json();
                this.providerData = { ...this.providerData, ...profileData };
                
                // Store the complete provider data for future use
                localStorage.setItem('serviceProvider', JSON.stringify(this.providerData));
                
                this.updateProfileDisplay();
            }
        } catch (error) {
            console.error('Error fetching provider profile:', error);
            // Use existing provider data if available
            if (this.providerData) {
                this.updateProfileDisplay();
            }
        }
    }

    async fetchProviderStats() {
        try {
            if (!this.providerData?.provider_id) {
                throw new Error('No provider ID found');
            }

            const response = await fetch(`/api/serviceProvider/stats/${this.providerData.provider_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                this.statsData = await response.json();
            } else {
                // Use default stats if endpoint doesn't exist
                this.statsData = {
                    totalEarnings: 0,
                    activeBookings: 0,
                    providerRating: this.providerData?.provider_rating || 0,
                    totalServices: 0,
                    monthlyBookings: 0,
                    monthlyRevenue: 0,
                    completionRate: 0,
                    popularServices: []
                };
            }
        } catch (error) {
            console.error('Error fetching provider stats:', error);
            this.statsData = {
                totalEarnings: 0,
                activeBookings: 0,
                providerRating: this.providerData?.provider_rating || 0,
                totalServices: 0,
                monthlyBookings: 0,
                monthlyRevenue: 0,
                completionRate: 0,
                popularServices: []
            };
        }
    }

    async fetchProviderServices() {
        try {
            if (!this.providerData?.provider_id) {
                throw new Error('No provider ID found');
            }

            const response = await fetch(`/api/serviceProvider/services/${this.providerData.provider_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                this.servicesData = await response.json();
            } else {
                this.servicesData = [];
            }
        } catch (error) {
            console.error('Error fetching provider services:', error);
            this.servicesData = [];
        }
    }

    async fetchProviderBookings() {
        try {
            if (!this.providerData?.provider_id) {
                throw new Error('No provider ID found');
            }

            const response = await fetch(`/api/serviceProvider/bookings/${this.providerData.provider_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                this.bookingsData = await response.json();
            } else {
                this.bookingsData = [];
            }
        } catch (error) {
            console.error('Error fetching provider bookings:', error);
            this.bookingsData = [];
        }
    }

    async fetchRecentActivity() {
        try {
            if (!this.providerData?.provider_id) {
                throw new Error('No provider ID found');
            }

            const response = await fetch(`/api/serviceProvider/activity/${this.providerData.provider_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                this.activityData = await response.json();
            } else {
                this.activityData = [];
            }
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            this.activityData = [];
        }
    }

    updateProfileDisplay() {
        const profileName = document.getElementById('profileName');
        const welcomeName = document.getElementById('welcomeName');
        const profileAvatar = document.getElementById('profileAvatar');
        const verificationText = document.getElementById('verificationText');
        const verificationIcon = document.querySelector('.verification-icon');
        const verificationAlert = document.getElementById('verificationAlert');

        if (this.providerData) {
            const fullName = `${this.providerData.provider_first_name || ''} ${this.providerData.provider_last_name || ''}`.trim();
            
            if (profileName) {
                profileName.textContent = fullName || this.providerData.provider_userName || 'Provider';
            }
            
            if (welcomeName) {
                welcomeName.textContent = this.providerData.provider_first_name || this.providerData.provider_userName || 'Provider';
            }

            // Update profile avatar
            if (profileAvatar) {
                if (this.providerData.provider_profile_photo) {
                    profileAvatar.innerHTML = `<img src="${this.providerData.provider_profile_photo}" alt="Profile Photo">`;
                } else {
                    profileAvatar.innerHTML = '<i class="fas fa-user-tie"></i>';
                }
            }

            // Update verification status
            const isVerified = this.providerData.provider_isVerified;
            if (verificationText) {
                verificationText.textContent = isVerified ? 'Verified' : 'Unverified';
            }
            
            if (verificationIcon) {
                verificationIcon.className = `fas fa-shield-alt verification-icon ${isVerified ? 'verified' : 'unverified'}`;
            }

            // Show/hide verification alert
            if (verificationAlert) {
                verificationAlert.style.display = isVerified ? 'none' : 'block';
            }
        }
    }

    renderDashboard() {
        this.renderStats();
        this.renderRecentActivity();
        this.renderPerformanceOverview();
    }

    renderStats() {
        // Update stats cards
        const elements = {
            totalEarnings: document.getElementById('totalEarnings'),
            activeBookings: document.getElementById('activeBookings'),
            providerRating: document.getElementById('providerRating'),
            totalServices: document.getElementById('totalServices'),
            earningsTrend: document.getElementById('earningsTrend'),
            bookingsTrend: document.getElementById('bookingsTrend'),
            ratingTrend: document.getElementById('ratingTrend'),
            servicesTrend: document.getElementById('servicesTrend')
        };

        if (elements.totalEarnings) {
            elements.totalEarnings.textContent = `₱${this.statsData.totalEarnings?.toLocaleString() || '0'}`;
        }
        
        if (elements.activeBookings) {
            elements.activeBookings.textContent = this.statsData.activeBookings || '0';
        }
        
        if (elements.providerRating) {
            elements.providerRating.textContent = (this.statsData.providerRating || 0).toFixed(1);
        }
        
        if (elements.totalServices) {
            elements.totalServices.textContent = this.servicesData.length || '0';
        }

        // Update trends
        if (elements.earningsTrend) {
            elements.earningsTrend.textContent = '+0% this month'; // TODO: Calculate actual trend
        }
        
        if (elements.bookingsTrend) {
            const pendingBookings = this.bookingsData.filter(b => b.appointment_status === 'pending').length;
            elements.bookingsTrend.textContent = `${pendingBookings} pending approval`;
        }
        
        if (elements.ratingTrend) {
            const totalRatings = this.statsData.totalRatings || 0;
            elements.ratingTrend.textContent = `Based on ${totalRatings} reviews`;
        }
        
        if (elements.servicesTrend) {
            elements.servicesTrend.textContent = '0 draft services'; // TODO: Count draft services
        }
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!this.activityData || this.activityData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activity to show</p>
                </div>
            `;
            return;
        }

        const activityHTML = this.activityData.slice(0, 5).map(activity => {
            const iconClass = this.getActivityIconClass(activity.type);
            const timeAgo = this.getTimeAgo(new Date(activity.created_at));
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-description">${activity.description}</div>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = activityHTML;
    }

    renderPerformanceOverview() {
        // Update monthly performance
        const monthlyBookings = document.getElementById('monthlyBookings');
        const monthlyRevenue = document.getElementById('monthlyRevenue');
        const completionRate = document.getElementById('completionRate');

        if (monthlyBookings) {
            monthlyBookings.textContent = this.statsData.monthlyBookings || '0';
        }
        
        if (monthlyRevenue) {
            monthlyRevenue.textContent = `₱${this.statsData.monthlyRevenue?.toLocaleString() || '0'}`;
        }
        
        if (completionRate) {
            completionRate.textContent = `${this.statsData.completionRate || 0}%`;
        }

        // Update popular services
        this.renderPopularServices();
    }

    renderPopularServices() {
        const container = document.getElementById('popularServices');
        if (!container) return;

        if (!this.statsData.popularServices || this.statsData.popularServices.length === 0) {
            container.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">No services data available</p>';
            return;
        }

        const servicesHTML = this.statsData.popularServices.slice(0, 5).map(service => `
            <div class="popular-service-item">
                <span class="service-name">${service.name}</span>
                <span class="service-bookings">${service.bookings} bookings</span>
            </div>
        `).join('');

        container.innerHTML = servicesHTML;
    }

    navigateToPage(pageName) {
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;

            // Load page-specific content
            this.loadPageContent(pageName);
        }
    }

    loadPageContent(pageName) {
        switch (pageName) {
            case 'manage-services':
                this.renderServicesPage();
                break;
            case 'bookings':
                this.renderBookingsPage();
                break;
            case 'profile':
                this.renderProfilePage();
                break;
            default:
                break;
        }
    }

    renderServicesPage() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;

        if (this.servicesData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>No services created yet</p>
                    <button class="btn-primary" onclick="providerDashboard.showAddServiceModal()">
                        <i class="fas fa-plus"></i> Add Your First Service
                    </button>
                </div>
            `;
            return;
        }

        const servicesHTML = this.servicesData.map(service => `
            <div class="service-card">
                <div class="service-header">
                    <div>
                        <h3 class="service-title">${service.service_title}</h3>
                        <div class="service-price">₱${service.service_startingprice.toLocaleString()}</div>
                    </div>
                </div>
                <p class="service-description">${service.service_description}</p>
                <div class="service-actions">
                    <button class="btn-secondary btn-sm btn-edit" onclick="providerDashboard.editService(${service.service_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-secondary btn-sm btn-delete" onclick="providerDashboard.deleteService(${service.service_id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = servicesHTML;
    }

    renderBookingsPage() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        if (this.bookingsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>No bookings yet</p>
                    <p style="font-size: 0.9rem; color: var(--text-tertiary);">Bookings will appear here once customers start booking your services</p>
                </div>
            `;
            return;
        }

        const bookingsHTML = this.bookingsData.map(booking => `
            <div class="booking-card">
                <div class="booking-header">
                    <div class="booking-id">Booking #${booking.appointment_id}</div>
                    <span class="booking-status ${booking.appointment_status}">${this.formatStatus(booking.appointment_status)}</span>
                </div>
                <div class="booking-details">
                    <div class="booking-detail">
                        <span class="label">Customer</span>
                        <span class="value">${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="label">Service</span>
                        <span class="value">${booking.service?.service_title || 'N/A'}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="label">Scheduled Date</span>
                        <span class="value">${this.formatDate(booking.scheduled_date)}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="label">Price</span>
                        <span class="value">₱${booking.actual_price?.toLocaleString() || 'TBD'}</span>
                    </div>
                </div>
                <div class="booking-actions">
                    ${this.getBookingActions(booking)}
                </div>
            </div>
        `).join('');

        container.innerHTML = bookingsHTML;
    }

    renderProfilePage() {
        const container = document.getElementById('profileContainer');
        if (!container || !this.providerData) return;

        const profileHTML = `
            <form id="profileForm">
                <div class="profile-section">
                    <h3>Basic Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="firstName">First Name</label>
                            <input type="text" id="firstName" name="firstName" class="form-control" 
                                   value="${this.providerData.provider_first_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName" name="lastName" class="form-control" 
                                   value="${this.providerData.provider_last_name || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" class="form-control" 
                                   value="${this.providerData.provider_email || ''}" disabled>
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" class="form-control" 
                                   value="${this.providerData.provider_phone_number || ''}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="location">Location</label>
                        <input type="text" id="location" name="location" class="form-control" 
                               value="${this.providerData.provider_location || ''}" required>
                    </div>
                </div>

                <div class="profile-section">
                    <h3>Professional Information</h3>
                    <div class="form-group">
                        <label for="uli">ULI Number</label>
                        <input type="text" id="uli" name="uli" class="form-control" 
                               value="${this.providerData.provider_uli || ''}" required>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary">Cancel Changes</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        `;

        container.innerHTML = profileHTML;

        // Add form submit handler
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }
    }

    showAddServiceModal() {
        const modal = document.getElementById('addServiceModal');
        if (modal) {
            modal.classList.add('show');
            this.loadServiceCategories();
        }
    }

    async loadServiceCategories() {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const categories = await response.json();
                const categorySelect = document.getElementById('serviceCategory');
                
                if (categorySelect) {
                    categorySelect.innerHTML = '<option value="">Select Category</option>';
                    categories.forEach(category => {
                        categorySelect.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async handleAddService() {
        const form = document.getElementById('addServiceForm');
        const formData = new FormData(form);
        
        try {
            this.showLoadingOverlay();
            
            const serviceData = {
                service_title: formData.get('serviceTitle'),
                service_description: formData.get('serviceDescription'),
                service_startingprice: parseFloat(formData.get('servicePrice')),
                provider_id: this.providerData.provider_id,
                category_id: formData.get('serviceCategory')
            };

            const response = await fetch('/api/serviceProvider/addListing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serviceData),
            });

            if (response.ok) {
                this.showToast('Service added successfully!', 'success');
                this.closeModal(document.getElementById('addServiceModal'));
                form.reset();
                await this.fetchProviderServices();
                this.renderServicesPage();
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to add service', 'error');
            }
        } catch (error) {
            console.error('Error adding service:', error);
            this.showToast('Failed to add service', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async handleProfileUpdate() {
        const form = document.getElementById('profileForm');
        const formData = new FormData(form);
        
        try {
            this.showLoadingOverlay();
            
            const profileData = {
                provider_first_name: formData.get('firstName'),
                provider_last_name: formData.get('lastName'),
                provider_phone_number: formData.get('phone'),
                provider_location: formData.get('location'),
                provider_uli: formData.get('uli'),
            };

            const response = await fetch(`/api/serviceProvider/profile/${this.providerData.provider_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            });

            if (response.ok) {
                this.showToast('Profile updated successfully!', 'success');
                // Update local provider data
                Object.assign(this.providerData, profileData);
                this.updateProfileDisplay();
                
                // Update stored provider data
                localStorage.setItem('serviceProvider', JSON.stringify(this.providerData));
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showToast('Failed to update profile', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    filterBookings(status) {
        if (status) {
            this.filteredBookings = this.bookingsData.filter(booking => booking.appointment_status === status);
        } else {
            this.filteredBookings = this.bookingsData;
        }
        
        // Re-render bookings with filtered data
        const originalBookingsData = this.bookingsData;
        this.bookingsData = this.filteredBookings;
        this.renderBookingsPage();
        this.bookingsData = originalBookingsData;
    }

    handleSignOut() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('serviceProvider');
            sessionStorage.removeItem('serviceProvider');
            window.location.href = 'fixmo_login.html';
        }
    }

    // Utility methods
    getActivityIconClass(type) {
        const icons = {
            booking: 'fas fa-calendar-check',
            payment: 'fas fa-dollar-sign',
            review: 'fas fa-star',
            service: 'fas fa-tools',
            profile: 'fas fa-user-edit'
        };
        return icons[type] || 'fas fa-info-circle';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMs = now - date;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else if (diffInMinutes > 0) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatStatus(status) {
        const statusMap = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return statusMap[status] || status;
    }

    getBookingActions(booking) {
        const actions = [];
        
        switch (booking.appointment_status) {
            case 'pending':
                actions.push(`<button class="btn-primary btn-sm" onclick="providerDashboard.confirmBooking(${booking.appointment_id})">Confirm</button>`);
                actions.push(`<button class="btn-secondary btn-sm" onclick="providerDashboard.rejectBooking(${booking.appointment_id})">Reject</button>`);
                break;
            case 'confirmed':
                actions.push(`<button class="btn-primary btn-sm" onclick="providerDashboard.startService(${booking.appointment_id})">Start Service</button>`);
                break;
            case 'in_progress':
                actions.push(`<button class="btn-primary btn-sm" onclick="providerDashboard.completeService(${booking.appointment_id})">Complete</button>`);
                break;
            case 'completed':
                actions.push(`<button class="btn-secondary btn-sm" onclick="providerDashboard.viewBooking(${booking.appointment_id})">View Details</button>`);
                break;
        }
        
        return actions.join('');
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

    showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    initializeNavigation() {
        // Set dashboard as active by default
        this.navigateToPage('dashboard');
    }

    showAvailabilityModal() {
        // TODO: Implement availability modal
        this.showToast('Availability management coming soon!', 'info');
    }

    editService(serviceId) {
        // TODO: Implement service editing
        this.showToast('Service editing coming soon!', 'info');
    }

    deleteService(serviceId) {
        if (confirm('Are you sure you want to delete this service?')) {
            // TODO: Implement service deletion
            this.showToast('Service deletion coming soon!', 'info');
        }
    }

    confirmBooking(bookingId) {
        // TODO: Implement booking confirmation
        this.showToast('Booking confirmation coming soon!', 'info');
    }

    rejectBooking(bookingId) {
        if (confirm('Are you sure you want to reject this booking?')) {
            // TODO: Implement booking rejection
            this.showToast('Booking rejection coming soon!', 'info');
        }
    }

    startService(bookingId) {
        // TODO: Implement service start
        this.showToast('Service start coming soon!', 'info');
    }

    completeService(bookingId) {
        // TODO: Implement service completion
        this.showToast('Service completion coming soon!', 'info');
    }

    viewBooking(bookingId) {
        // TODO: Implement booking details view
        this.showToast('Booking details view coming soon!', 'info');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.providerDashboard = new ProviderDashboard();
});

// Expose dashboard instance globally for onclick handlers
window.providerDashboard = null;
