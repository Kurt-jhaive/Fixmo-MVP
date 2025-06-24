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
                ${service.provider.profilePhoto ? 
                    `<img src="${service.provider.profilePhoto}" alt="${service.title}">` : 
                    `<i class="fas fa-${this.getCategoryIcon(primaryCategory)}"></i>`
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

        container.innerHTML = '<p>Loading active bookings...</p>';
        
        // Mock booking data
        setTimeout(() => {
            container.innerHTML = `
                <div class="booking-card">
                    <h3>Plumbing Service</h3>
                    <p>Status: <span class="status-badge pending">Pending</span></p>
                    <p>Date: ${DashboardUtils.formatDate(new Date())}</p>
                    <p>Provider: John's Plumbing Services</p>
                </div>
            `;
        }, 1000);
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

    bookService(serviceId) {
        // Navigate to booking page or show booking modal
        DashboardUtils.showToast(`Booking service ${serviceId}...`, 'info');
        // Implement booking logic here
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
