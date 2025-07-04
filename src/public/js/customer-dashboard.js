// Customer Dashboard Main JavaScript
class CustomerDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.userData = null;
        this.isVerified = false;
        this.services = [];
        this.filteredServices = [];
        this.currentSearchQuery = '';
        this.currentFilters = {
            category: '',
            location: '',
            sort: 'rating'
        };
        this.servicesLoaded = 0;
        this.servicesPerPage = 12;
        this.isSubmittingBooking = false; // Prevent duplicate submissions
        this.eventListenersSetup = false; // Prevent duplicate event listeners
        
        // Booking filter properties
        this.allBookings = [];
        this.filteredBookings = [];
        this.currentBookingFilters = {
            status: '',
            dateRange: '',
            serviceType: '',
            search: '',
            sort: 'date-desc'
        };
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!DashboardUtils.isAuthenticated()) {
            DashboardUtils.logout();
            return;
        }

        // Show loading
        DashboardUtils.showLoading();

        try {
            // Load user data and verification status
            await this.loadUserData();
            await this.checkVerificationStatus();
            
            // Setup event listeners
            this.setupEventListeners();
            this.setupBookingEventListeners();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Hide loading
            DashboardUtils.hideLoading();
            
            DashboardUtils.showToast('Welcome to your dashboard!', 'success');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            DashboardUtils.hideLoading();
            DashboardUtils.showToast('Error loading dashboard', 'error');
        }
    }    async loadUserData() {
        this.userData = DashboardUtils.getUserData();
        
        try {
            // Fetch full user profile from database
            const response = await DashboardUtils.makeRequest(`/auth/user-profile/${this.userData.userId}`);
            const userProfile = response.user;
            
            // Update profile display with real data
            const profileName = document.getElementById('profileName');
            const welcomeName = document.getElementById('welcomeName');
            const profileAvatar = document.getElementById('profileAvatar');
            
            const displayName = userProfile.userName || 'Customer';
            
            if (profileName) profileName.textContent = displayName;
            if (welcomeName) welcomeName.textContent = displayName;
            
            // Update profile avatar with actual photo or initials
            if (profileAvatar) {
                if (userProfile.profile_photo) {
                    // Display actual profile photo
                    profileAvatar.innerHTML = `<img src="${userProfile.profile_photo}" alt="Profile Photo" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-user\\"></i>';">`;
                } else {
                    // Display initials if no photo
                    const initials = this.getInitials(userProfile.first_name, userProfile.last_name, userProfile.userName);
                    profileAvatar.innerHTML = `<span style="font-weight: 600; font-size: 1rem;">${initials}</span>`;
                }
            }
            
            // Store the full user profile for later use
            this.userProfile = userProfile;
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Fallback to localStorage data
            const profileName = document.getElementById('profileName');
            const welcomeName = document.getElementById('welcomeName');
            
            if (profileName) profileName.textContent = this.userData.userName || 'Customer';
            if (welcomeName) welcomeName.textContent = this.userData.userName || 'Customer';
        }
    }

    getInitials(firstName, lastName, userName) {
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        } else if (userName) {
            return userName.substring(0, 2).toUpperCase();
        } else {
            return 'CU'; // Default to 'Customer User'
        }
    }    async checkVerificationStatus() {
        try {
            // Use the user profile data we already loaded
            if (this.userProfile) {
                this.isVerified = this.userProfile.is_verified || false;
            } else {
                this.isVerified = await DashboardUtils.checkVerificationStatus();
            }
            this.updateVerificationStatus();
        } catch (error) {
            console.error('Error checking verification:', error);
            this.isVerified = false;
            this.updateVerificationStatus();
        }
    }

    updateVerificationStatus() {
        const profileStatus = document.getElementById('profileStatus');
        const verificationText = document.getElementById('verificationText');
        const verificationIcon = document.querySelector('.verification-icon');
        const verificationAlert = document.getElementById('verificationAlert');

        if (this.isVerified) {
            if (verificationText) verificationText.textContent = 'Verified';
            if (verificationIcon) {
                verificationIcon.classList.remove('unverified');
                verificationIcon.classList.add('verified');
            }
            if (verificationAlert) verificationAlert.style.display = 'none';
        } else {
            if (verificationText) verificationText.textContent = 'Unverified';
            if (verificationIcon) {
                verificationIcon.classList.remove('verified');
                verificationIcon.classList.add('unverified');
            }
            if (verificationAlert) verificationAlert.style.display = 'block';
        }
    }

    setupEventListeners() {
        // Navigation dropdown
        const profileInfo = document.querySelector('.profile-info');
        if (profileInfo) {
            profileInfo.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Navigation items
        document.querySelectorAll('.dropdown-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Sign out
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signOut();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            const debouncedSearch = DashboardUtils.debounce(() => {
                this.performSearch();
            }, 500);
            
            searchInput.addEventListener('input', debouncedSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Filter controls
        const categorySelect = document.getElementById('categorySelect');
        const locationSelect = document.getElementById('locationSelect');
        const sortSelect = document.getElementById('sortSelect');

        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                this.currentFilters.category = categorySelect.value;
                this.applyFilters();
            });
        }

        if (locationSelect) {
            locationSelect.addEventListener('change', () => {
                this.currentFilters.location = locationSelect.value;
                this.applyFilters();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentFilters.sort = sortSelect.value;
                this.applyFilters();
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreServices();
            });
        }

        // Verification modal
        this.setupVerificationModal();

        // Verification alert button
        const verifyAccountBtn = document.getElementById('verifyAccountBtn');
        if (verifyAccountBtn) {
            verifyAccountBtn.addEventListener('click', () => {
                this.showVerificationModal();
            });
        }

        // Booking modal events
        this.setupBookingEventListeners();
    }

    setupVerificationModal() {
        const modal = document.getElementById('verificationModal');
        const modalClose = document.getElementById('modalClose');
        const cancelBtn = document.getElementById('cancelVerification');
        const verificationForm = document.getElementById('verificationForm');

        // Close modal events
        [modalClose, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.hideVerificationModal();
                });
            }
        });

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideVerificationModal();
                }
            });
        }

        // File upload handlers
        this.setupFileUpload('profilePicture', 'profilePictureArea', 'profilePreview', 'profilePreviewImg');
        this.setupFileUpload('validId', 'validIdArea', 'validIdPreview', 'validIdPreviewImg');

        // Form submission
        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitVerification();
            });
        }
    }

    setupFileUpload(inputId, areaId, previewId, previewImgId) {
        const input = document.getElementById(inputId);
        const area = document.getElementById(areaId);
        const preview = document.getElementById(previewId);
        const previewImg = document.getElementById(previewImgId);

        if (!input || !area) return;

        // Click to upload
        area.addEventListener('click', () => {
            input.click();
        });

        // File selection
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file, preview, previewImg);
            }
        });

        // Drag and drop
        DashboardUtils.setupDragAndDrop(area, (file) => {
            input.files = this.createFileList(file);
            this.handleFileSelection(file, preview, previewImg);
        });
    }

    handleFileSelection(file, preview, previewImg) {
        // Validate file
        const validation = DashboardUtils.validateFile(file);
        if (!validation.valid) {
            DashboardUtils.showToast(validation.error, 'error');
            return;
        }

        // Preview image
        if (preview && previewImg) {
            DashboardUtils.previewImage(file, previewImg);
        }

        DashboardUtils.showToast('File selected successfully', 'success');
    }

    createFileList(file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        return dt.files;
    }

    async loadDashboardData() {
        try {
            // Load stats
            await this.loadUserStats();
            
            // Load services
            await this.loadServices();
            
            // Load recommended services
            await this.loadRecommendedServices();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            DashboardUtils.showToast('Error loading dashboard data', 'error');
        }
    }    async loadUserStats() {
        try {
            const response = await DashboardUtils.makeRequest(`/auth/customer-stats/${this.userData.userId}`);
            const stats = response.stats;

            // Update stats display
            document.getElementById('activeBookings').textContent = stats.activeBookings;
            document.getElementById('completedBookings').textContent = stats.completedBookings;
            document.getElementById('averageRating').textContent = stats.averageRating;
        } catch (error) {
            console.error('Error loading user stats:', error);
            // Set default values on error
            document.getElementById('activeBookings').textContent = '0';
            document.getElementById('completedBookings').textContent = '0';
            document.getElementById('averageRating').textContent = '0.0';
        }
    }    async loadServices() {
        try {
            // Load service categories first
            await this.loadServiceCategories();
            
            // Load service listings
            const queryParams = new URLSearchParams({
                page: 1,
                limit: this.servicesPerPage,
                search: this.currentSearchQuery,
                category: this.currentFilters.category,
                location: this.currentFilters.location,
                sortBy: this.currentFilters.sort
            });

            const response = await DashboardUtils.makeRequest(`/auth/service-listings?${queryParams}`);
            
            this.services = response.listings || [];
            this.filteredServices = [...this.services];
            this.servicesLoaded = this.services.length;
            this.totalServices = response.pagination?.totalCount || 0;
            this.hasMoreServices = response.pagination?.hasNext || false;
            
            this.displayServices();
            this.updateResultsCount();
        } catch (error) {
            console.error('Error loading services:', error);
            DashboardUtils.showToast('Error loading services', 'error');
            // Show empty state
            document.getElementById('allServices').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Unable to load services</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    async loadServiceCategories() {
        try {
            const response = await DashboardUtils.makeRequest('/auth/service-categories');
            const categories = response.categories || [];
            
            // Update category dropdown
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                // Clear existing options except "All Categories"
                categorySelect.innerHTML = '<option value="">All Categories</option>';
                
                // Add categories from database
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.category_name.toLowerCase();
                    option.textContent = category.category_name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading service categories:', error);
        }
    }    async loadRecommendedServices() {
        try {
            // Get recommended services (first 6 from regular listings)
            const queryParams = new URLSearchParams({
                page: 1,
                limit: 6,
                sortBy: 'rating'
            });

            const response = await DashboardUtils.makeRequest(`/auth/service-listings?${queryParams}`);
            const recommended = response.listings || [];
            
            this.displayRecommendedServices(recommended);
        } catch (error) {
            console.error('Error loading recommended services:', error);
        }
    }

    generateMockServices() {
        const categories = ['plumbing', 'electrical', 'cleaning', 'carpentry', 'painting', 'appliance-repair'];
        const locations = ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig'];
        const services = [];

        for (let i = 1; i <= 50; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            
            services.push({
                id: i,
                title: `Professional ${DashboardUtils.capitalize(category)} Service`,
                description: `High-quality ${category} services for your home and office needs. Professional, reliable, and affordable.`,
                category: category,
                location: location,
                price: Math.floor(Math.random() * 2000) + 500,
                rating: (Math.random() * 2 + 3).toFixed(1),
                reviewCount: Math.floor(Math.random() * 100) + 10,
                provider: `${category.charAt(0).toUpperCase() + category.slice(1)} Expert ${i}`,
                image: null,
                distance: (Math.random() * 20).toFixed(1)
            });
        }

        return services;
    }    displayServices() {
        const container = document.getElementById('allServices');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        if (this.filteredServices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No services found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        // Create service cards
        this.filteredServices.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMoreServices ? 'inline-flex' : 'none';
        }
    }

    displayRecommendedServices(services) {
        const container = document.getElementById('recommendedServices');
        if (!container) return;

        container.innerHTML = '';

        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h3>No recommendations available</h3>
                    <p>Complete some bookings to get personalized recommendations</p>
                </div>
            `;
            return;
        }

        services.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });
    }    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
          // Get primary category for icon
        const primaryCategory = service.categories && service.categories.length > 0 
            ? service.categories[0].toLowerCase() 
            : 'general';
            
        card.innerHTML = `
            <div class="service-image">
                ${service.service_picture ? 
                    `<img src="/${service.service_picture}" alt="${service.title}">` : 
                    `<div class="service-icon"><i class="fas fa-${this.getCategoryIcon(primaryCategory)}"></i></div>`
                }
            </div>
            <div class="service-content">
                <div class="service-header">
                    <h3 class="service-title">${service.title}</h3>
                    <span class="service-price">From ${DashboardUtils.formatCurrency(service.startingPrice)}</span>
                </div>
                <p class="service-provider">by ${service.provider.name}</p>
                <div class="service-rating">
                    <div class="stars">
                        ${DashboardUtils.generateStarRating(parseFloat(service.provider.rating))}
                    </div>
                    <span class="rating-text">${service.provider.rating.toFixed(1)}</span>
                </div>
                <p class="service-description">${DashboardUtils.truncateText(service.description, 80)}</p>
                <div class="service-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${service.provider.location || 'Location not specified'}</span>
                    ${service.categories.length > 0 ? 
                        `<span><i class="fas fa-tags"></i> ${service.categories.join(', ')}</span>` : 
                        ''
                    }
                </div>
                <div class="service-actions">
                    <button class="btn-primary" onclick="dashboard.bookService(${service.id})">
                        <i class="fas fa-calendar-plus"></i> Book Now
                    </button>
                    <button class="btn-secondary" onclick="dashboard.viewServiceDetails(${service.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    getCategoryIcon(category) {
        const icons = {
            'plumbing': 'wrench',
            'electrical': 'bolt',
            'cleaning': 'broom',
            'carpentry': 'hammer',
            'painting': 'paint-brush',
            'appliance-repair': 'tools',
            'gardening': 'seedling',
            'pest-control': 'bug'
        };
        return icons[category] || 'tools';
    }

    performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        this.currentSearchQuery = searchInput.value.trim().toLowerCase();
        this.applyFilters();
    }    async applyFilters() {
        try {
            // Reset services loaded counter
            this.servicesLoaded = 0;

            // Build query parameters
            const queryParams = new URLSearchParams({
                page: 1,
                limit: this.servicesPerPage,
                search: this.currentSearchQuery,
                category: this.currentFilters.category,
                location: this.currentFilters.location,
                sortBy: this.currentFilters.sort
            });

            // Show loading state
            const container = document.getElementById('allServices');
            if (container) {
                DashboardUtils.createLoadingSkeleton(container, 6);
            }

            // Fetch filtered services
            const response = await DashboardUtils.makeRequest(`/auth/service-listings?${queryParams}`);
            
            this.services = response.listings || [];
            this.filteredServices = [...this.services];
            this.servicesLoaded = this.services.length;
            this.totalServices = response.pagination?.totalCount || 0;
            this.hasMoreServices = response.pagination?.hasNext || false;

            // Display filtered services
            this.displayFilteredServices();
            this.updateResultsCount();
        } catch (error) {
            console.error('Error applying filters:', error);
            DashboardUtils.showToast('Error filtering services', 'error');
        }
    }

    displayFilteredServices() {
        const container = document.getElementById('allServices');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        if (this.filteredServices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No services found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        // Create service cards
        this.filteredServices.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMoreServices ? 'inline-flex' : 'none';
        }
    }

    sortServices() {
        switch (this.currentFilters.sort) {
            case 'rating':
                this.filteredServices.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
                break;
            case 'price-low':
                this.filteredServices.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredServices.sort((a, b) => b.price - a.price);
                break;
            case 'distance':
                this.filteredServices.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
                break;
            case 'newest':
                this.filteredServices.sort((a, b) => b.id - a.id);
                break;
        }
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            const count = this.filteredServices.length;
            resultsCount.textContent = `${count} service${count !== 1 ? 's' : ''} found`;
        }
    }    async loadMoreServices() {
        try {
            const nextPage = Math.floor(this.servicesLoaded / this.servicesPerPage) + 1;
            
            const queryParams = new URLSearchParams({
                page: nextPage,
                limit: this.servicesPerPage,
                search: this.currentSearchQuery,
                category: this.currentFilters.category,
                location: this.currentFilters.location,
                sortBy: this.currentFilters.sort
            });

            const response = await DashboardUtils.makeRequest(`/auth/service-listings?${queryParams}`);
            const newServices = response.listings || [];
            
            // Add new services to existing ones
            this.filteredServices.push(...newServices);
            
            // Display only the new services
            const container = document.getElementById('allServices');
            if (container) {
                newServices.forEach(service => {
                    const serviceCard = this.createServiceCard(service);
                    container.appendChild(serviceCard);
                });
            }
            
            this.servicesLoaded += newServices.length;
            this.hasMoreServices = response.pagination?.hasNext || false;
            
            // Update load more button
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = this.hasMoreServices ? 'inline-flex' : 'none';
            }
            
        } catch (error) {
            console.error('Error loading more services:', error);
            DashboardUtils.showToast('Error loading more services', 'error');
        }
    }

    showPage(page) {
        this.navigateToPage(page);
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;

            // Load page-specific data
            this.loadPageData(page);
        }
    }

    async loadPageData(page) {
        switch (page) {
            case 'bookings':
                await this.loadBookings();
                break;
            case 'booking-history':
                await this.loadBookingHistory();
                break;
            case 'profile':
                await this.loadProfile();
                break;
            case 'settings':
                await this.loadSettings();
                break;
        }
    }

    async loadBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading your bookings...</p></div>';
        
        try {
            const response = await DashboardUtils.makeRequest('/auth/bookings');
            const appointments = response.appointments || [];

            // Store all bookings
            this.allBookings = appointments;

            // Filter bookings to show all active appointment statuses
            const allowedStatuses = ['accepted',  'confirmed', 'on the way', 'in progress', 'completed'];
            const filteredAppointments = appointments.filter(booking => 
                allowedStatuses.includes(booking.appointment_status)
            );

            if (!filteredAppointments || filteredAppointments.length === 0) {
                container.innerHTML = this.renderEmptyBookings();
                return;
            }

            // Apply filters and render
            this.filteredBookings = filteredAppointments;
            this.renderBookingsWithFilters();

        } catch (error) {
            console.error('Error loading bookings:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Bookings</h3>
                    <p>Unable to load your bookings. Please try again.</p>
                    <p class="error-details">Error: ${error.message}</p>
                    <button class="btn-primary" onclick="window.dashboard.loadBookings()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    renderEmptyBookings() {
        return `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Bookings Yet</h3>
                <p>You haven't made any service bookings yet.</p>
                <button class="btn-primary" onclick="window.dashboard.showPage('dashboard')">
                    <i class="fas fa-plus"></i> Browse Services
                </button>
            </div>
        `;
    }

    renderBookingsSection(title, bookings, type) {
        if (!bookings || bookings.length === 0) {
            return '';
        }

        return `
            <div class="bookings-section">
                <h3 class="section-title">
                    <i class="fas ${this.getBookingSectionIcon(type)}"></i>
                    ${title} (${bookings.length})
                </h3>
                <div class="bookings-grid">
                    ${bookings.map(booking => this.renderBookingCard(booking, type)).join('')}
                </div>
            </div>
        `;
    }

    renderBookingCard(booking) {
        return this.renderBookingCardHorizontal(booking);
    }

    renderBookingCardHorizontal(booking) {
        const canCall = booking.actions ? booking.actions.canCall : 
            (['accepted',  'confirmed', 'on the way', 'in progress'].includes(booking.appointment_status));
        const canCancel = booking.actions ? booking.actions.canCancel : 
            (['pending', 'accepted', 'confirmed'].includes(booking.appointment_status));

        return `
            <div class="booking-card-horizontal" data-booking-id="${booking.appointment_id}">
                <div class="booking-main-content">
                    <div class="booking-header-horizontal">
                        <div class="booking-status-section">
                            <span class="status-badge-horizontal ${this.getStatusClass(booking.appointment_status)}">
                                ${this.getStatusText(booking.appointment_status)}
                            </span>
                        </div>
                        <div class="booking-date-section">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${this.formatDate(booking.scheduled_date)}</span>
                        </div>
                    </div>

                    <div class="booking-service-details">
                        <h3 class="service-title-horizontal">${booking.service.title}</h3>
                        <p class="service-description-horizontal">${this.truncateText(booking.service.description || '', 120)}</p>
                        <div class="service-price-horizontal">
                            <i class="fas fa-peso-sign"></i>
                            <!-- Starting price comes from serviceListing table -->
                            <span>Starting from ₱${booking.service.startingPrice.toFixed(2)}</span>
                            <!-- Final price comes from appointment table, updated by service provider when completed -->
                            ${booking.final_price ? `<span class="final-price"> • Final: ₱${booking.final_price.toFixed(2)}</span>` : `<span class="final-price"> • Final price to be determined</span>`}
                        </div>
                    </div>

                    <div class="booking-provider-section">
                        <div class="provider-info-horizontal">
                            <h4 class="provider-name-horizontal">
                                <i class="fas fa-user-circle"></i>
                                ${booking.provider.name}
                            </h4>
                            <div class="provider-location-horizontal">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${booking.provider.location || 'Location not specified'}</span>
                            </div>
                            ${booking.provider.rating ? `
                                <div class="provider-rating-horizontal">
                                    <i class="fas fa-star"></i>
                                    <span>${booking.provider.rating.toFixed(1)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="booking-appointment-details">
                        <div class="appointment-detail-item">
                            <i class="fas fa-clock"></i>
                            <span><strong>Time:</strong> ${this.formatTime(booking.timeSlot.startTime)} - ${this.formatTime(booking.timeSlot.endTime)}</span>
                        </div>
                        ${booking.repairDescription ? `
                            <div class="appointment-detail-item">
                                <i class="fas fa-edit"></i>
                                <span><strong>Issue:</strong> ${this.truncateText(booking.repairDescription, 100)}</span>
                            </div>
                        ` : ''}
                        <div class="appointment-detail-item">
                            <i class="fas fa-calendar-plus"></i>
                            <span><strong>Booked:</strong> ${this.formatDate(booking.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="booking-actions-section">
                    ${this.renderBookingActions(booking)}
                </div>
            </div>
        `;
    }

    renderBookingActions(booking) {
        // Determine actions based on appointment status
        const canCall = ['accepted', 'approved', 'confirmed', 'on the way', 'in progress'].includes(booking.appointment_status);
        const canCancel = ['accepted', 'approved', 'confirmed'].includes(booking.appointment_status);
        const status = booking.appointment_status;

        let actionsHTML = '';

        // Call provider button
        if (canCall) {
            actionsHTML += `
                <button class="booking-action-btn primary call-provider" 
                        data-phone="${booking.provider.phone_number}"
                        data-provider-name="${booking.provider.name}">
                    <i class="fas fa-phone"></i>
                    Call Provider
                </button>
            `;
        } else {
            actionsHTML += `
                <button class="booking-action-btn secondary" disabled>
                    <i class="fas fa-phone"></i>
                    Call Provider
                </button>
            `;
        }

        // Cancel booking button
        if (canCancel) {
            actionsHTML += `
                <button class="booking-action-btn danger cancel-booking" 
                        data-booking-id="${booking.appointment_id}"
                        data-provider-name="${booking.provider.name}">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            `;
        } else {
            actionsHTML += `
                <button class="booking-action-btn secondary" disabled>
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            `;
        }

        // Additional actions based on status
        if (status === 'completed') {
            actionsHTML += `
                <button class="booking-action-btn secondary rate-service" 
                        data-booking-id="${booking.appointment_id}"
                        data-provider-name="${booking.provider.name}">
                    <i class="fas fa-star"></i>
                    Rate Service
                </button>
            `;
        }

        return actionsHTML;
    }

    // Legacy method - keeping for backward compatibility
    renderBookingCardOld(booking) {
        // Only enable call and cancel buttons for "approved" status
        const isApproved = booking.appointment_status === 'approved';
        const canCancel = isApproved;
        const canCall = isApproved;
        
        const statusClass = this.getStatusClass(booking.appointment_status);
        const statusText = this.getStatusText(booking.appointment_status);

        return `
            <div class="booking-card" data-booking-id="${booking.appointment_id}">
                <div class="booking-header">
                    <div class="booking-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="booking-date">
                        <i class="fas fa-calendar"></i>
                        ${DashboardUtils.formatDate(booking.scheduled_date)}
                    </div>
                </div>
                
                <div class="booking-content">
                    <!-- Service Information -->
                    <div class="service-info">
                        <div class="service-image">
                            ${booking.service.picture ? 
                                `<img src="${booking.service.picture}" alt="Service Picture">` :
                                `<i class="fas fa-tools"></i>`
                            }
                        </div>
                        <div class="service-details">
                            <h4 class="service-title">${booking.service.title}</h4>
                            <p class="service-description">${booking.service.description}</p>
                            <div class="service-price">
                                <i class="fas fa-peso-sign"></i>
                                Starting from ₱${booking.service.startingPrice.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <!-- Provider Information -->
                    <div class="provider-info">
                        <div class="provider-avatar">
                            ${booking.provider.profile_photo ? 
                                `<img src="${booking.provider.profile_photo}" alt="Provider Photo">` :
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="provider-details">
                            <h4 class="provider-name">${booking.provider.name}</h4>
                            <p class="provider-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${booking.provider.location || 'Location not specified'}
                            </p>
                            ${booking.provider.rating ? `
                                <div class="provider-rating">
                                    <i class="fas fa-star"></i>
                                    ${booking.provider.rating.toFixed(1)}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Appointment Details -->
                    <div class="appointment-details">
                        <div class="appointment-time">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatTime(booking.timeSlot.startTime)} - ${this.formatTime(booking.timeSlot.endTime)}</span>
                        </div>
                        
                        ${booking.repairDescription ? `
                            <div class="appointment-description">
                                <i class="fas fa-edit"></i>
                                <span>${booking.repairDescription}</span>
                            </div>
                        ` : ''}

                        ${booking.final_price ? `
                            <div class="appointment-price">
                                <i class="fas fa-peso-sign"></i>
                                <span>Final Price: ₱${booking.final_price.toFixed(2)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="booking-actions">
                    ${canCall ? `
                        <button class="btn-secondary call-provider" 
                                data-phone="${booking.provider.phone_number}"
                                data-provider-name="${booking.provider.name}">
                            <i class="fas fa-phone"></i> Call Provider
                        </button>
                    ` : `
                        <button class="btn-secondary call-provider disabled" disabled>
                            <i class="fas fa-phone"></i> Call Provider
                        </button>
                    `}
                    
                    ${canCancel ? `
                        <button class="btn-danger cancel-booking" 
                                data-booking-id="${booking.appointment_id}"
                                data-provider-name="${booking.provider.name}">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : `
                        <button class="btn-danger cancel-booking disabled" disabled>
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    canCancelBooking(status) {
        const nonCancellableStatuses = ['finished', 'completed', 'canceled', 'on the way'];
        return !nonCancellableStatuses.includes(status);
    }

    getStatusClass(status) {
        const statusClasses = {
            'accepted': 'accepted',
            'confirmed': 'confirmed', 
            'on the way': 'on-the-way',
            'in_progress': 'in-progress',
            'completed': 'completed',
            'finished': 'completed',
            'canceled': 'cancelled'
        };
        return statusClasses[status];
    }

    getStatusText(status) {
        const statusTexts = {

            'accepted': 'Accepted',
            'confirmed': 'Confirmed',
            'on the way': 'Provider On The Way',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'finished': 'Completed',
            'canceled': 'Cancelled'
        };
        return statusTexts[status] || status;
    }

    getBookingSectionIcon(type) {
        const icons = {
            'active': 'fa-clock',
            'completed': 'fa-check-circle',
            'cancelled': 'fa-times-circle'
        };
        return icons[type] || 'fa-calendar';
    }

    setupBookingActionListeners() {
        // Call provider buttons
        document.querySelectorAll('.call-provider').forEach(button => {
            button.addEventListener('click', (e) => {
                const phone = button.dataset.phone;
                const providerName = button.dataset.providerName;
                this.callProvider(phone, providerName);
            });
        });

        // Cancel booking buttons
        document.querySelectorAll('.cancel-booking').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookingId = button.dataset.bookingId;
                const providerName = button.dataset.providerName;
                this.showCancelConfirmation(bookingId, providerName);
            });
        });
    }

    callProvider(phone, providerName) {
        // Create a modal or confirmation dialog
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-phone"></i> Call ${providerName}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="call-info">
                        <div class="provider-call-details">
                            <i class="fas fa-user"></i>
                            <span>${providerName}</span>
                        </div>
                        <div class="phone-number">
                            <i class="fas fa-phone"></i>
                            <span>${phone}</span>
                        </div>
                    </div>
                    <p>You can call this number to contact your service provider directly.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <a href="tel:${phone}" class="btn-primary">
                        <i class="fas fa-phone"></i> Call Now
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async showCancelConfirmation(bookingId, providerName) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content modern-cancel-modal">
                <div class="modal-header modern-header">
                    <div class="header-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Cancel Booking</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body modern-body">
                    <div class="cancel-info">
                        <p class="primary-text">Are you sure you want to cancel your booking with <strong>${providerName}</strong>?</p>
                        <p class="warning-text">
                            <i class="fas fa-info-circle"></i>
                            This action cannot be undone and may affect your future bookings.
                        </p>
                    </div>
                    
                    <div class="form-group modern-select-group">
                        <label for="cancellationReason" class="modern-label">
                            <i class="fas fa-comment-dots"></i>
                            Why are you canceling this booking?
                        </label>
                        <div class="select-wrapper">
                            <select id="cancellationReason" class="modern-select">
                                <option value="">Choose a reason...</option>
                                <option value="Schedule conflict">📅 Schedule conflict</option>
                                <option value="Emergency situation">🚨 Emergency situation</option>
                                <option value="Found alternative service">🔄 Found alternative service</option>
                                <option value="Provider not responding">📞 Provider not responding</option>
                                <option value="Budget constraints">💰 Budget constraints</option>
                                <option value="Location changed">📍 Location changed</option>
                                <option value="Service no longer needed">❌ Service no longer needed</option>
                                <option value="Other">✏️ Other (please specify)</option>
                            </select>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                    </div>
                    
                    <div id="customReasonDiv" class="custom-reason-container">
                        <label for="customReason" class="modern-label">
                            <i class="fas fa-edit"></i>
                            Please provide more details
                        </label>
                        <textarea id="customReason" class="modern-textarea" placeholder="Tell us more about why you're canceling..." rows="3"></textarea>
                        <div class="char-counter">
                            <span id="charCount">0</span>/200 characters
                        </div>
                    </div>
                </div>
                <div class="modal-footer modern-footer">
                    <button class="btn modern-btn secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-arrow-left"></i>
                        Keep Booking
                    </button>
                    <button class="btn modern-btn danger" id="confirmCancelBtn" disabled onclick="window.dashboard.cancelBooking('${bookingId}'); this.closest('.modal').remove();">
                        <i class="fas fa-ban"></i>
                        Cancel Booking
                    </button>
                </div>
            </div>
        `;
        
        // Add modern styles
        const style = document.createElement('style');
        style.textContent = `
            .modern-cancel-modal {
                max-width: 520px !important;
                border-radius: 20px !important;
                overflow: hidden !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                backdrop-filter: blur(10px);
            }
            
            .modern-header {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%) !important;
                color: white !important;
                padding: 24px !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                border-bottom: none !important;
            }
            
            .header-icon {
                width: 48px;
                height: 48px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            
            .modern-header h3 {
                flex: 1 !important;
                margin: 0 !important;
                font-size: 22px !important;
                font-weight: 600 !important;
            }
            
            .modal-close {
                background: rgba(255, 255, 255, 0.2) !important;
                border: none !important;
                width: 36px !important;
                height: 36px !important;
                border-radius: 50% !important;
                color: white !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
            }
            
            .modal-close:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: scale(1.1) !important;
            }
            
            .modern-body {
                padding: 32px !important;
                background: white !important;
            }
            
            .cancel-info {
                margin-bottom: 24px;
                text-align: center;
            }
            
            .primary-text {
                font-size: 18px !important;
                color: #2d3748 !important;
                margin-bottom: 12px !important;
                line-height: 1.5 !important;
            }
            
            .warning-text {
                background: #fef7e7 !important;
                color: #b45309 !important;
                padding: 12px 16px !important;
                border-radius: 12px !important;
                font-size: 14px !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                border-left: 4px solid #f59e0b !important;
                margin: 0 !important;
            }
            
            .modern-select-group {
                margin-bottom: 20px !important;
            }
            
            .modern-label {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #374151 !important;
                margin-bottom: 8px !important;
            }
            
            .select-wrapper {
                position: relative !important;
            }
            
            .modern-select {
                width: 100% !important;
                padding: 14px 16px !important;
                border: 2px solid #e5e7eb !important;
                border-radius: 12px !important;
                font-size: 15px !important;
                background: white !important;
                color: #374151 !important;
                appearance: none !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                padding-right: 45px !important;
            }
            
            .modern-select:focus {
                outline: none !important;
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            }
            
            .select-arrow {
                position: absolute !important;
                right: 16px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                color: #9ca3af !important;
                pointer-events: none !important;
                transition: transform 0.3s ease !important;
            }
            
            .modern-select:focus + .select-arrow {
                transform: translateY(-50%) rotate(180deg) !important;
            }
            
            .custom-reason-container {
                display: none !important;
                animation: slideDown 0.3s ease !important;
            }
            
            .custom-reason-container.show {
                display: block !important;
            }
            
            .modern-textarea {
                width: 100% !important;
                padding: 14px 16px !important;
                border: 2px solid #e5e7eb !important;
                border-radius: 12px !important;
                font-size: 15px !important;
                font-family: inherit !important;
                resize: vertical !important;
                min-height: 90px !important;
                transition: all 0.3s ease !important;
            }
            
            .modern-textarea:focus {
                outline: none !important;
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            }
            
            .char-counter {
                text-align: right !important;
                font-size: 12px !important;
                color: #9ca3af !important;
                margin-top: 4px !important;
            }
            
            .modern-footer {
                padding: 24px 32px !important;
                background: #f9fafb !important;
                display: flex !important;
                gap: 12px !important;
                border-top: 1px solid #e5e7eb !important;
            }
            
            .modern-btn {
                flex: 1 !important;
                padding: 14px 24px !important;
                border-radius: 12px !important;
                font-size: 15px !important;
                font-weight: 600 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                transition: all 0.3s ease !important;
                border: none !important;
                cursor: pointer !important;
            }
            
            .modern-btn.secondary {
                background: white !important;
                color: #374151 !important;
                border: 2px solid #e5e7eb !important;
            }
            
            .modern-btn.secondary:hover {
                background: #f9fafb !important;
                border-color: #d1d5db !important;
            }
            
            .modern-btn.danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
                color: white !important;
            }
            
            .modern-btn.danger:hover:not(:disabled) {
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.4) !important;
            }
            
            .modern-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                transform: none !important;
                box-shadow: none !important;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(modal);
        
        // Add enhanced functionality
        const reasonSelect = modal.querySelector('#cancellationReason');
        const customReasonDiv = modal.querySelector('#customReasonDiv');
        const customReason = modal.querySelector('#customReason');
        const confirmBtn = modal.querySelector('#confirmCancelBtn');
        const charCount = modal.querySelector('#charCount');
        
        reasonSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                customReasonDiv.classList.add('show');
                customReasonDiv.style.display = 'block';
            } else {
                customReasonDiv.classList.remove('show');
                customReasonDiv.style.display = 'none';
            }
            
            // Enable/disable confirm button based on selection
            updateConfirmButton();
        });
        
        // Character counter for textarea
        if (customReason && charCount) {
            customReason.addEventListener('input', function() {
                const length = this.value.length;
                charCount.textContent = length;
                
                if (length > 200) {
                    charCount.style.color = '#ef4444';
                    this.style.borderColor = '#ef4444';
                } else {
                    charCount.style.color = '#9ca3af';
                    this.style.borderColor = '#e5e7eb';
                }
                
                updateConfirmButton();
            });
        }
        
        function updateConfirmButton() {
            const hasReason = reasonSelect.value;
            const hasCustomReason = reasonSelect.value !== 'Other' || (customReason.value.trim().length > 0 && customReason.value.length <= 200);
            
            confirmBtn.disabled = !hasReason || !hasCustomReason;
        }
        
        // Initially disable the confirm button
        confirmBtn.disabled = true;
    }

    async cancelBooking(bookingId) {
        try {
            // Get the cancellation reason from the modal
            const reasonSelect = document.querySelector('#cancellationReason');
            const customReason = document.querySelector('#customReason');
            
            let cancellationReason = '';
            if (reasonSelect) {
                if (reasonSelect.value === 'Other' && customReason) {
                    cancellationReason = customReason.value.trim() || 'Other - no details provided';
                } else {
                    cancellationReason = reasonSelect.value || 'No reason provided';
                }
            }
            
            DashboardUtils.showLoading();
            
            const response = await DashboardUtils.makeRequest(`/auth/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancellation_reason: cancellationReason
                })
            });

            DashboardUtils.hideLoading();
            DashboardUtils.showToast('Booking cancelled successfully', 'success');
            
            // Reload bookings to reflect the change
            await this.loadBookings();
            
        } catch (error) {
            DashboardUtils.hideLoading();
            console.error('Error cancelling booking:', error);
            
            if (error.message.includes('on the way')) {
                DashboardUtils.showToast('Cannot cancel - service provider is on the way', 'error');
            } else if (error.message.includes('completed')) {
                DashboardUtils.showToast('Cannot cancel a completed booking', 'error');
            } else {
                DashboardUtils.showToast('Error cancelling booking. Please try again.', 'error');
            }
        }
    }

    async loadBookingHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        container.innerHTML = '<p>Loading booking history...</p>';
        
        // Mock history data
        setTimeout(() => {
            container.innerHTML = `
                <div class="history-card">
                    <h3>Electrical Repair</h3>
                    <p>Status: <span class="status-badge completed">Completed</span></p>
                    <p>Date: ${DashboardUtils.formatDate(new Date(Date.now() - 86400000))}</p>
                    <p>Provider: Expert Electricians</p>
                    <p>Rating: ${DashboardUtils.generateStarRating(5)}</p>
                </div>
            `;
        }, 1000);
    }

    async loadProfile() {
        const container = document.getElementById('profileContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-form">
                <h3>Personal Information</h3>
                <form>
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" value="${this.userData.userName || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="customer@example.com" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" value="+63 912 345 6789" class="form-control">
                    </div>
                    <button type="submit" class="btn-primary">Update Profile</button>
                </form>
            </div>
        `;
    }

    async loadSettings() {
        const container = document.getElementById('settingsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-form">
                <h3>Notification Preferences</h3>
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

    showVerificationModal() {
        const modal = document.getElementById('verificationModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideVerificationModal() {
        const modal = document.getElementById('verificationModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async submitVerification() {
        const form = document.getElementById('verificationForm');
        const profilePicture = document.getElementById('profilePicture').files[0];
        const validId = document.getElementById('validId').files[0];

        if (!profilePicture || !validId) {
            DashboardUtils.showToast('Please upload both profile picture and valid ID', 'error');
            return;
        }

        try {
            DashboardUtils.showLoading();

            const formData = new FormData();
            formData.append('profilePicture', profilePicture);
            formData.append('validId', validId);
            formData.append('userId', this.userData.userId);

            // Mock API call - replace with actual endpoint
            await new Promise(resolve => setTimeout(resolve, 2000));

            DashboardUtils.hideLoading();
            this.hideVerificationModal();
            DashboardUtils.showToast('Verification documents submitted successfully!', 'success');
            
            // Update verification status
            this.isVerified = true;
            this.updateVerificationStatus();
        } catch (error) {
            console.error('Verification submission error:', error);
            DashboardUtils.hideLoading();
            DashboardUtils.showToast('Error submitting verification', 'error');
        }
    }

    viewServiceDetails(serviceId) {
        // Show service details modal or navigate to details page
        DashboardUtils.showToast(`Viewing details for service ${serviceId}`, 'info');
        // Implement service details logic here
    }

    signOut() {
        if (confirm('Are you sure you want to sign out?')) {
            DashboardUtils.logout();
        }
    }

    // Booking functionality
    async bookService(serviceId) {
        try {
            // Find service data
            const service = this.services.find(s => s.id === serviceId);
            if (!service) {
                DashboardUtils.showToast('Service not found', 'error');
                return;
            }

            // Get provider ID first
            const providerId = service.provider.id;

            // Populate booking modal with service information
            this.populateBookingModal(service);
            
            // Show booking modal
            const modal = document.getElementById('bookingModal');
            modal.style.display = 'flex';
            modal.classList.add('show');

            // Reset form
            this.resetBookingForm();
            
            // Restrict calendar to available days
            await this.restrictCalendarToAvailableDays(providerId);

            // Find the next available day for this provider
            const today = new Date();
            const response = await DashboardUtils.makeRequest(`/auth/provider/${providerId}/weekly-days`);
            
            let defaultDate = today.toISOString().split('T')[0];
            
            if (response.success && response.data.availableDays) {
                const availableDays = response.data.availableDays;
                const dayMapping = {
                    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                    'Thursday': 4, 'Friday': 5, 'Saturday': 6
                };
                const availableDayNumbers = availableDays.map(day => dayMapping[day]);
                
                // Find the next available day
                for (let i = 0; i < 14; i++) { // Search up to 2 weeks ahead
                    const testDate = new Date(today);
                    testDate.setDate(today.getDate() + i);
                    
                    if (availableDayNumbers.includes(testDate.getDay())) {
                        defaultDate = testDate.toISOString().split('T')[0];
                        break;
                    }
                }
            }
            
            // Set the default date
            document.getElementById('bookingDate').value = defaultDate;
            
            // Update summary for the default date
            const date = new Date(defaultDate);
            document.getElementById('summaryDate').textContent = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Load time slots for the default date
            await this.loadAvailableTimeSlots(providerId, defaultDate);

        } catch (error) {
            console.error('Error opening booking modal:', error);
            DashboardUtils.showToast('Error opening booking form', 'error');
        }
    }

    populateBookingModal(service) {
        // Service information
        document.getElementById('bookingServiceTitle').textContent = service.title;
        document.getElementById('bookingServiceProvider').textContent = `by ${service.provider.name}`;
        document.getElementById('bookingServicePrice').textContent = DashboardUtils.formatCurrency(service.startingPrice);
        
        // Hidden form fields
        document.getElementById('bookingProviderId').value = service.provider.id;
        document.getElementById('bookingServiceId').value = service.id;
        document.getElementById('bookingPrice').value = service.startingPrice;

        // Service image
        const imageContainer = document.getElementById('bookingServiceImage');
        if (service.service_picture && service.service_picture !== 'undefined' && service.service_picture !== null) {
            imageContainer.innerHTML = `<img src="/${service.service_picture}" alt="${service.title}">`;
        } else if (service.provider.profilePhoto) {
            imageContainer.innerHTML = `<img src="${service.provider.profilePhoto}" alt="${service.title}">`;
        } else {
            const primaryCategory = service.categories && service.categories.length > 0 
                ? service.categories[0].toLowerCase() 
                : 'general';
            imageContainer.innerHTML = `<i class="fas fa-${this.getCategoryIcon(primaryCategory)}"></i>`;
        }

        // Booking summary
        document.getElementById('summaryServiceTitle').textContent = service.title;
        document.getElementById('summaryProviderName').textContent = service.provider.name;
        document.getElementById('summaryPrice').textContent = DashboardUtils.formatCurrency(service.startingPrice);
    }

    resetBookingForm() {
        // Clear form
        document.getElementById('bookingForm').reset();
        document.getElementById('selectedTimeSlot').value = '';
        
        // Reset time slots
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        timeSlotsContainer.innerHTML = `
            <div class="time-slots-loading">
                <i class="fas fa-calendar-alt"></i>
                <p>Select a date to view available time slots</p>
            </div>
        `;

        // Reset summary
        document.getElementById('summaryDate').textContent = '-';
        document.getElementById('summaryTime').textContent = '-';
        
        // Disable confirm button
        document.getElementById('confirmBooking').disabled = true;

        // Set date restrictions for rolling weekly recurring booking
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // Calculate max date (allow booking up to 8 weeks in advance)
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + (8 * 7)); // 8 weeks from today
        const maxDateString = maxDate.toISOString().split('T')[0];
        
        const dateInput = document.getElementById('bookingDate');
        dateInput.min = todayString; // Can't book in the past
        dateInput.max = maxDateString; // Can book up to 8 weeks in advance
        dateInput.value = todayString; // Default to today
    }

    async loadAvailableTimeSlots(providerId, date) {
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        
        try {
            // Show loading state
            timeSlotsContainer.innerHTML = `
                <div class="time-slots-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading weekly time slots...</p>
                </div>
            `;

            // Get day of week for the selected date
            const selectedDate = new Date(date);
            const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

            // Fetch weekly availability using the updated endpoint
            const response = await DashboardUtils.makeRequest(`/auth/provider/${providerId}/booking-availability?date=${date}`);
            
            console.log('=== WEEKLY SCHEDULE DEBUG ===');
            console.log('Provider ID:', providerId);
            console.log('Date:', date);
            console.log('Day of Week:', dayOfWeek);
            console.log('API Response:', response);
            console.log('Weekly availability:', response.data?.availability);
            
            if (response.success && response.data.availability && response.data.availability.length > 0) {
                const allSlots = response.data.availability;
                const { schedulingType, isToday } = response.data;
                
                const slotsHTML = allSlots.map(slot => {
                    let statusClass = '';
                    let statusText = '';
                    let statusIcon = '';
                    let isClickable = false;
                    
                    switch(slot.status) {
                        case 'available':
                            statusClass = 'available';
                            statusText = 'Available';
                            statusIcon = '✅';
                            isClickable = true;
                            break;
                        case 'booked':
                            statusClass = 'booked';
                            statusText = 'Booked';
                            statusIcon = '🔒';
                            isClickable = false;
                            break;
                        case 'past':
                            statusClass = 'past';
                            statusText = 'Past';
                            statusIcon = '⏰';
                            isClickable = false;
                            break;
                        default:
                            statusClass = 'available';
                            statusText = 'Available';
                            statusIcon = '✅';
                            isClickable = true;
                    }
                    
                    return `
                        <button type="button" 
                                class="time-slot ${statusClass}" 
                                data-time="${slot.startTime}"
                                data-end-time="${slot.endTime}"
                                data-available="${isClickable}"
                                ${!isClickable ? 'disabled' : ''}
                                title="${statusText} - ${this.formatTime(slot.startTime)} to ${this.formatTime(slot.endTime)}">
                            <div class="slot-time">
                                <span class="time-text">${this.formatTime(slot.startTime)} - ${this.formatTime(slot.endTime)}</span>
                            </div>
                            <div class="slot-status">
                                <span class="status-icon">${statusIcon}</span>
                                <small class="status-text">${statusText}</small>
                            </div>
                        </button>
                    `;
                }).join('');

                timeSlotsContainer.innerHTML = `
                    <div class="weekly-schedule-info">
                        <h4><i class="fas fa-calendar-week"></i> ${dayOfWeek} Schedule</h4>
                        <p class="schedule-type">Weekly Recurring Schedule - Books for current week</p>
                        ${isToday ? '<p class="today-notice"><i class="fas fa-info-circle"></i> Past time slots are not available for booking today.</p>' : ''}
                    </div>
                    <div class="time-slots-grid">
                        ${slotsHTML}
                    </div>
                    <div class="weekly-info">
                        <small>
                            <i class="fas fa-info-circle"></i> 
                            This provider uses weekly recurring schedules. 
                            Booking a slot reserves it for this week only.
                        </small>
                    </div>
                `;

                // Add click handlers to available time slots only
                timeSlotsContainer.querySelectorAll('.time-slot.available').forEach(button => {
                    button.addEventListener('click', (e) => {
                        // Remove previous selection
                        timeSlotsContainer.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
                        
                        // Select this slot
                        button.classList.add('selected');
                        
                        // Update hidden field and summary
                        const selectedTime = button.dataset.time;
                        document.getElementById('selectedTimeSlot').value = selectedTime;
                        document.getElementById('summaryTime').textContent = this.formatTime(selectedTime);
                        
                        // Enable confirm button if date and time are selected
                        this.validateBookingForm();
                    });
                });

            } else {
                // No slots available for this day
                timeSlotsContainer.innerHTML = `
                    <div class="no-slots-message">
                        <i class="fas fa-calendar-times"></i>
                        <h4>No availability on ${dayOfWeek}</h4>
                        <p>This provider doesn't have any time slots available on ${dayOfWeek}s.</p>
                        <small>Please try selecting a different day of the week.</small>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading weekly time slots:', error);
            timeSlotsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error Loading Schedule</h4>
                    <p>Unable to load weekly availability</p>
                    <small>${error.message}</small>
                    <button class="retry-btn" onclick="window.dashboard.loadAvailableTimeSlots('${providerId}', '${date}')">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    formatTime(timeString) {
        // Convert 24-hour format to 12-hour format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    validateBookingForm() {
        const date = document.getElementById('bookingDate').value;
        const time = document.getElementById('selectedTimeSlot').value;
        const confirmButton = document.getElementById('confirmBooking');
        
        if (date && time) {
            confirmButton.disabled = false;
        } else {
            confirmButton.disabled = true;
        }
    }

    async submitBooking(formData) {
        // Prevent duplicate submissions
        if (this.isSubmittingBooking) {
            console.log('Booking submission already in progress');
            return;
        }
        this.isSubmittingBooking = true;
        try {
            // Show loading state
            DashboardUtils.showLoading();

            console.log('=== BOOKING SUBMISSION DEBUG ===');
            console.log('Form data:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            const bookingData = {
                customer_id: DashboardUtils.getUserData()?.userId || localStorage.getItem('fixmo_user_id'),
                provider_id: parseInt(formData.get('provider_id')),
                service_listing_id: parseInt(formData.get('service_id')),
                scheduled_date: formData.get('scheduled_date'),
                scheduled_time: formData.get('scheduled_time'),
                service_description: formData.get('repairDescription'),
                final_price: formData.get('final_price') || 0
            };

            console.log('Booking data to send:', bookingData);

            // Submit booking using the correct endpoint
            const response = await DashboardUtils.makeRequest('/auth/book-appointment', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });

            console.log('Server response:', response);

            if (response.success || response.message === 'Appointment booked successfully') {
                // Get provider and appointment details for notification
                const provider = this.currentProviders?.find(p => p.provider_id === parseInt(formData.get('provider_id'))) || {};
                const appointmentDetails = {
                    provider_name: `${provider.provider_first_name || 'Provider'} ${provider.provider_last_name || ''}`.trim(),
                    date: new Date(formData.get('scheduled_date')).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    time: formData.get('scheduled_time'),
                    status: 'Automatically Accepted'
                };

                // Show success notification
                window.notificationManager.bookingSuccess(appointmentDetails);
                
                this.closeBookingModal();
                
                // Refresh bookings data if on bookings page
                if (this.currentPage === 'bookings') {
                    setTimeout(() => {
                        this.loadCustomerBookings();
                    }, 1000);
                }
                
            } else {
                // Show error notification with specific message
                const errorMessage = response.message || 'Failed to book appointment. Please try again.';
                window.notificationManager.bookingError(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting booking:', error);
            
            // Parse error message for better user experience
            let errorMessage = 'Unable to complete booking. Please try again.';
            
            if (error.message.includes('400')) {
                errorMessage = 'Invalid booking data. Please check your selection and try again.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Your session has expired. Please log in again.';
            } else if (error.message.includes('409')) {
                errorMessage = 'This time slot is no longer available. Please select a different time.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Our team has been notified. Please try again later.';
            }
            
            window.notificationManager.bookingError(errorMessage);
        } finally {
            DashboardUtils.hideLoading();
            this.isSubmittingBooking = false; // Reset flag
        }
    }

    closeBookingModal() {
        const modal = document.getElementById('bookingModal');
        modal.style.display = 'none';
        modal.classList.remove('show');
        this.resetBookingForm();
    }

    setupBookingEventListeners() {
        // Booking modal close buttons
        const closeButtons = ['bookingModalClose', 'cancelBooking'];
        closeButtons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.closeBookingModal());
            }
        });

        // Date change handler
        const bookingDate = document.getElementById('bookingDate');
        if (bookingDate) {
            bookingDate.addEventListener('change', (e) => {
                const selectedDate = e.target.value;
                const providerId = document.getElementById('bookingProviderId').value;
                
                if (selectedDate && providerId) {
                    // Update summary
                    const date = new Date(selectedDate);
                    document.getElementById('summaryDate').textContent = date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    // Load time slots
                    this.loadAvailableTimeSlots(providerId, selectedDate);
                    
                    // Reset time selection
                    document.getElementById('selectedTimeSlot').value = '';
                    document.getElementById('summaryTime').textContent = '-';
                    this.validateBookingForm();
                }
            });
        }

        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(bookingForm);
                this.submitBooking(formData);
            });
        }

        // Close modal when clicking outside
        const bookingModal = document.getElementById('bookingModal');
        if (bookingModal) {
            bookingModal.addEventListener('click', (e) => {
                if (e.target === bookingModal) {
                    this.closeBookingModal();
                }
            });
        }
    }

    async restrictCalendarToAvailableDays(providerId) {
        try {
            // Fetch provider's weekly availability to know which days they work
            const response = await DashboardUtils.makeRequest(`/auth/provider/${providerId}/weekly-days`);
            
            if (response.success && response.data.availableDays) {
                const availableDays = response.data.availableDays;
                
                console.log('Provider available days:', availableDays);
                
                // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
                const dayMapping = {
                    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                    'Thursday': 4, 'Friday': 5, 'Saturday': 6
                };
                
                const availableDayNumbers = availableDays.map(day => dayMapping[day]);
                
                // Get the date input and add a custom validation
                const dateInput = document.getElementById('bookingDate');
                
                // Remove any existing event listeners for this validation
                const newDateInput = dateInput.cloneNode(true);
                dateInput.parentNode.replaceChild(newDateInput, dateInput);
                
                // Add input validation to only allow available days
                newDateInput.addEventListener('input', (e) => {
                    const selectedDate = new Date(e.target.value);
                    const selectedDayOfWeek = selectedDate.getDay();
                    
                    if (!availableDayNumbers.includes(selectedDayOfWeek)) {
                        e.target.setCustomValidity(`This provider is not available on ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}s. Available days: ${availableDays.join(', ')}`);
                        e.target.reportValidity();
                        
                        // Reset to today if valid, otherwise don't change
                        const today = new Date();
                        const todayDayOfWeek = today.getDay();
                        if (availableDayNumbers.includes(todayDayOfWeek)) {
                            e.target.value = today.toISOString().split('T')[0];
                        }
                    } else {
                        e.target.setCustomValidity('');
                    }
                });
                
                // Re-add the original change event listener
                newDateInput.addEventListener('change', (e) => {
                    const selectedDate = e.target.value;
                    const providerId = document.getElementById('bookingProviderId').value;
                    
                    if (selectedDate && providerId) {
                        // Update summary
                        const date = new Date(selectedDate);
                        document.getElementById('summaryDate').textContent = date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        
                        // Load time slots
                        this.loadAvailableTimeSlots(providerId, selectedDate);
                        
                        // Reset time selection
                        document.getElementById('selectedTimeSlot').value = '';
                        document.getElementById('summaryTime').textContent = '-';
                        this.validateBookingForm();
                    }
                });
                
                // Validate the current date input value
                if (newDateInput.value) {
                    const currentDate = new Date(newDateInput.value);
                    const currentDayOfWeek = currentDate.getDay();
                    if (!availableDayNumbers.includes(currentDayOfWeek)) {
                        // Find the next available day from today onwards
                        const today = new Date();
                        const maxSearchDays = 14; // Search up to 2 weeks ahead
                        
                        let foundValidDay = false;
                        for (let i = 0; i < maxSearchDays; i++) {
                            const testDate = new Date(today);
                            testDate.setDate(today.getDate() + i);
                            
                            if (testDate >= today && availableDayNumbers.includes(testDate.getDay())) {
                                newDateInput.value = testDate.toISOString().split('T')[0];
                                foundValidDay = true;
                                break;
                            }
                        }
                        
                        if (!foundValidDay) {
                            // Provider has no availability in the next 2 weeks
                            DashboardUtils.showToast(`This provider has limited availability. Available days: ${availableDays.join(', ')}`, 'warning');
                            // Set to today as fallback
                            newDateInput.value = today.toISOString().split('T')[0];
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error restricting calendar:', error);
            // Don't block the booking process if this fails
        }
    }

    renderBookingsWithFilters() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        // Apply filters
        this.applyBookingFilters();

        // Render the filtered bookings with filter UI
        container.innerHTML = `
            <div class="bookings-sections">
                ${this.renderBookingFilters()}
                <div class="bookings-section">
                    <h3 class="section-title">
                        <i class="fas fa-calendar-check"></i>
                        Active Bookings (${this.filteredBookings.length})
                    </h3>
                    <div class="bookings-container-horizontal">
                        ${this.filteredBookings.map(booking => this.renderBookingCard(booking)).join('')}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for action buttons and filters
        this.setupBookingActionListeners();
        this.setupBookingFilterListeners();
    }

    renderBookingFilters() {
        return `
            <div class="booking-filters-section">
                <div class="filters-header">
                    <h3><i class="fas fa-filter"></i> Filter Bookings</h3>
                    <button class="btn-secondary clear-filters" onclick="window.dashboard.clearBookingFilters()">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                </div>
                
                <div class="search-filter-group">
                    <label for="bookingSearch">Search Bookings</label>
                    <div class="search-input-wrapper">
                        <input type="text" id="bookingSearch" class="search-input" placeholder="Search by service, provider, or description...">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                </div>
                
                <div class="filters-grid">
                    <div class="filter-group">
                        <label for="statusFilter">Status</label>
                        <select id="statusFilter" class="filter-select">
                            <option value="">All Status</option>
                            <option value="accepted">Accepted</option>
                            <option value="approved">Approved</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="on the way">On The Way</option>
                            <option value="in progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="dateRangeFilter">Date Range</label>
                        <select id="dateRangeFilter" class="filter-select">
                            <option value="">All Dates</option>
                            <option value="today">Today</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
                            <option value="last-month">Last Month</option>
                            <option value="last-3-months">Last 3 Months</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="serviceTypeFilter">Service Type</label>
                        <select id="serviceTypeFilter" class="filter-select">
                            <option value="">All Services</option>
                            <option value="plumbing">Plumbing</option>
                            <option value="electrical">Electrical</option>
                            <option value="cleaning">Cleaning</option>
                            <option value="carpentry">Carpentry</option>
                            <option value="painting">Painting</option>
                            <option value="appliance repair">Appliance Repair</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="sortBookings">Sort By</label>
                        <select id="sortBookings" class="filter-select">
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="status">Status</option>
                            <option value="service-title">Service Title</option>
                            <option value="provider-name">Provider Name</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    applyBookingFilters() {
        let filtered = [...this.allBookings];

        // Filter by search query
        if (this.currentBookingFilters.search) {
            const searchTerm = this.currentBookingFilters.search.toLowerCase();
            filtered = filtered.filter(booking => 
                booking.service.title.toLowerCase().includes(searchTerm) ||
                booking.provider.name.toLowerCase().includes(searchTerm) ||
                (booking.repairDescription && booking.repairDescription.toLowerCase().includes(searchTerm)) ||
                booking.appointment_status.toLowerCase().includes(searchTerm)
            );
        }

        // Filter by status
        if (this.currentBookingFilters.status) {
            filtered = filtered.filter(booking => 
                booking.appointment_status === this.currentBookingFilters.status
            );
        }

        // Filter by date range
        if (this.currentBookingFilters.dateRange) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.scheduled_date);
                
                switch (this.currentBookingFilters.dateRange) {
                    case 'today':
                        return bookingDate.toDateString() === today.toDateString();
                    case 'this-week':
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        return bookingDate >= weekStart && bookingDate <= weekEnd;
                    case 'this-month':
                        return bookingDate.getMonth() === now.getMonth() && 
                               bookingDate.getFullYear() === now.getFullYear();
                    case 'last-month':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                        return bookingDate >= lastMonth && bookingDate <= lastMonthEnd;
                    case 'last-3-months':
                        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                        return bookingDate >= threeMonthsAgo;
                    default:
                        return true;
                }
            });
        }

        // Filter by service type
        if (this.currentBookingFilters.serviceType) {
            filtered = filtered.filter(booking => {
                const serviceTitle = booking.service.title.toLowerCase();
                const serviceType = this.currentBookingFilters.serviceType.toLowerCase();
                return serviceTitle.includes(serviceType);
            });
        }

        // Sort bookings
        this.sortBookings(filtered);

        // Only show active bookings
        const allowedStatuses = ['accepted', 'approved', 'confirmed', 'on the way', 'in progress', 'completed'];
        this.filteredBookings = filtered.filter(booking => 
            allowedStatuses.includes(booking.appointment_status)
        );
    }

    sortBookings(bookings) {
        switch (this.currentBookingFilters.sort) {
            case 'date-desc':
                bookings.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
                break;
            case 'date-asc':
                bookings.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
                break;
            case 'status':
                bookings.sort((a, b) => a.appointment_status.localeCompare(b.appointment_status));
                break;
            case 'service-title':
                bookings.sort((a, b) => a.service.title.localeCompare(b.service.title));
                break;
            case 'provider-name':
                bookings.sort((a, b) => a.provider.name.localeCompare(b.provider.name));
                break;
        }
    }

    setupBookingFilterListeners() {
        const bookingSearch = document.getElementById('bookingSearch');
        const statusFilter = document.getElementById('statusFilter');
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        const serviceTypeFilter = document.getElementById('serviceTypeFilter');
        const sortBookings = document.getElementById('sortBookings');

        // Search input with debouncing
        if (bookingSearch) {
            bookingSearch.value = this.currentBookingFilters.search;
            let searchTimeout;
            bookingSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentBookingFilters.search = e.target.value;
                    this.renderBookingsWithFilters();
                }, 300); // 300ms debounce
            });
        }

        if (statusFilter) {
            statusFilter.value = this.currentBookingFilters.status;
            statusFilter.addEventListener('change', (e) => {
                this.currentBookingFilters.status = e.target.value;
                this.renderBookingsWithFilters();
            });
        }

        if (dateRangeFilter) {
            dateRangeFilter.value = this.currentBookingFilters.dateRange;
            dateRangeFilter.addEventListener('change', (e) => {
                this.currentBookingFilters.dateRange = e.target.value;
                this.renderBookingsWithFilters();
            });
        }

        if (serviceTypeFilter) {
            serviceTypeFilter.value = this.currentBookingFilters.serviceType;
            serviceTypeFilter.addEventListener('change', (e) => {
                this.currentBookingFilters.serviceType = e.target.value;
                this.renderBookingsWithFilters();
            });
        }

        if (sortBookings) {
            sortBookings.value = this.currentBookingFilters.sort;
            sortBookings.addEventListener('change', (e) => {
                this.currentBookingFilters.sort = e.target.value;
                this.renderBookingsWithFilters();
            });
        }
    }

    clearBookingFilters() {
        this.currentBookingFilters = {
            status: '',
            dateRange: '',
            serviceType: '',
            search: '',
            sort: 'date-desc'
        };
        this.renderBookingsWithFilters();
    }

    // ...existing code...
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CustomerDashboard();
});

// Add styles for skeleton loading and additional components
const additionalStyles = `
<style>
.skeleton-card {
    background: white;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    margin-bottom: 20px;
    animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
    width: 100%;
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

.skeleton-content {
    padding: 20px;
}

.skeleton-line {
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 10px;
}

.skeleton-title {
    height: 20px;
    margin-bottom: 15px;
}

.skeleton-text.short {
    width: 70%;
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

.booking-card, .history-card {
    background: white;
    padding: 20px;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
}

.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
}

.status-badge.confirmed {
    background: #fff3cd;
    color: #856404;
}

.status-badge.completed {
    background: #d4edda;
    color: #155724;
}

.profile-form, .settings-form {
    background: white;
    padding: 30px;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

.form-control {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: var(--transition);
    margin-bottom: 15px;
}

.form-control:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 178, 178, 0.1);
}

.setting-item {
    margin-bottom: 15px;
    padding: 10px 0;
}

.setting-item label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
}

.service-meta {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.service-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
}

@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

/* Booking Filters Styles */
.booking-filters-section {
    background: white;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid var(--border-color);
}

.filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f0f0f0;
}

.filters-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.filters-header h3 i {
    color: var(--primary-color);
}

.clear-filters {
    padding: 8px 16px;
    font-size: 0.9rem;
    border-radius: 6px;
    transition: var(--transition);
}

.clear-filters:hover {
    background: #f8f9fa;
    border-color: #dee2e6;
}

.search-filter-group {
    margin-bottom: 20px;
}

.search-filter-group label {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
    margin-bottom: 8px;
}

.search-input-wrapper {
    position: relative;
}

.search-input {
    width: 100%;
    padding: 12px 16px;
    padding-right: 45px;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 1rem;
    background: white;
    color: var(--text-primary);
    transition: var(--transition);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 178, 178, 0.1);
}

.search-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    font-size: 1rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.filter-group label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
    margin-bottom: 4px;
}

.filter-select {
    padding: 10px 12px;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 0.95rem;
    background: white;
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition);
}

.filter-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 178, 178, 0.1);
}

.filter-select:hover {
    border-color: #c0c0c0;
}

/* Responsive adjustments for filters */
@media (max-width: 768px) {
    .filters-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .filters-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
    
    .booking-filters-section {
        padding: 16px;
    }
}

/* Enhanced booking cards for filtered view */
.bookings-container-horizontal {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.booking-card-horizontal {
    background: white;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    padding: 20px;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.booking-card-horizontal:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.booking-card-horizontal::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
}
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
