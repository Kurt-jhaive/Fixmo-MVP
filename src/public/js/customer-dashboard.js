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

            // Filter bookings to only show approved, on the way, in progress, and completed
            const allowedStatuses = ['approved', 'on the way', 'in progress', 'completed'];
            const filteredAppointments = appointments.filter(booking => 
                allowedStatuses.includes(booking.appointment_status)
            );

            if (!filteredAppointments || filteredAppointments.length === 0) {
                container.innerHTML = this.renderEmptyBookings();
                return;
            }

            // Show filtered appointments with horizontal design
            container.innerHTML = `
                <div class="bookings-sections">
                    <div class="bookings-section">
                        <h3 class="section-title">
                            <i class="fas fa-calendar-check"></i>
                            Active Bookings (${filteredAppointments.length})
                        </h3>
                        <div class="bookings-container-horizontal">
                            ${filteredAppointments.map(booking => this.renderBookingCard(booking)).join('')}
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners for action buttons
            this.setupBookingActionListeners();

        } catch (error) {
            console.error('Error loading bookings:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Bookings</h3>
                    <p>Unable to load your bookings. Please try again.</p>
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
        // Only enable call and cancel buttons for "approved" status
        const isApproved = booking.appointment_status === 'approved';
        const canCancel = isApproved;
        const canCall = isApproved;
        
        const serviceImage = booking.service.picture 
            ? `<img src="/${booking.service.picture}" alt="${booking.service.title}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-tools\\"></i>';">` 
            : '<i class="fas fa-tools"></i>';

        const providerImage = booking.provider.profile_photo 
            ? `<img src="/${booking.provider.profile_photo}" alt="${booking.provider.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-user\\"></i>';">` 
            : '<i class="fas fa-user"></i>';

        return `
            <div class="booking-card-horizontal" data-booking-id="${booking.appointment_id}">
                <div class="booking-service-image">
                    ${serviceImage}
                </div>
                
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
                        <p class="service-description-horizontal">${this.truncateText(booking.service.description, 120)}</p>
                        <div class="service-price-horizontal">
                            <i class="fas fa-peso-sign"></i>
                            <span>Starting from ₱${booking.service.startingPrice.toFixed(2)}</span>
                            ${booking.final_price ? `<span class="final-price"> • Final: ₱${booking.final_price.toFixed(2)}</span>` : ''}
                        </div>
                    </div>

                    <div class="booking-provider-section">
                        <div class="provider-avatar-horizontal">
                            ${providerImage}
                        </div>
                        <div class="provider-info-horizontal">
                            <h4 class="provider-name-horizontal">${booking.provider.name}</h4>
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
        const canCall = booking.actions ? booking.actions.canCall : (booking.appointment_status === 'approved');
        const canCancel = booking.actions ? booking.actions.canCancel : (booking.appointment_status === 'approved');
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
            'pending': 'pending',
            'accepted': 'accepted',
            'confirmed': 'confirmed', 
            'approved': 'approved',
            'on the way': 'on-the-way',
            'in_progress': 'in-progress',
            'completed': 'completed',
            'finished': 'completed',
            'canceled': 'cancelled'
        };
        return statusClasses[status] || 'pending';
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Pending',
            'accepted': 'Accepted',
            'confirmed': 'Confirmed',
            'approved': 'Approved', 
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
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Cancel Booking</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to cancel your booking with <strong>${providerName}</strong>?</p>
                    <p class="text-warning">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        Keep Booking
                    </button>
                    <button class="btn-danger" onclick="window.dashboard.cancelBooking('${bookingId}'); this.closest('.modal').remove();">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async cancelBooking(bookingId) {
        try {
            DashboardUtils.showLoading();
            
            const response = await DashboardUtils.makeRequest(`/auth/bookings/${bookingId}/cancel`, {
                method: 'PUT'
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

.status-badge.pending {
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
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
