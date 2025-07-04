// Booking Manager for Provider Dashboard
class BookingManager {
    constructor() {
        this.bookings = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.token = localStorage.getItem('fixmo_provider_token');
        this.providerData = null;
        this.statsData = {};
        this.selectedBooking = null;
        this.pollingInterval = null;
        this.selectedBookingForCancellation = null;
        this.selectedBookingForRating = null;
        this.selectedRating = 0;
        
        this.init();
    }

    async init() {
        console.log('Initializing Booking Manager...');
        
        try {
            // Get provider data from the main dashboard
            if (window.dashboard && window.dashboard.providerData) {
                this.providerData = window.dashboard.providerData;
            }
            
            await this.loadBookings();
            this.calculateStatsFromBookings();
            this.setupEventListeners();
            this.renderBookings();
            this.renderBookingStats();
            
            // Start polling for new bookings every 30 seconds
            this.startPolling();
            
            console.log('Booking Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Booking Manager:', error);
            this.showError('Failed to initialize booking manager');
        }
    }

    async loadBookings() {
        try {
            console.log('Loading bookings...');
            
            const response = await fetch('/api/serviceProvider/appointments?limit=100', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.bookings = data.data || data.appointments || [];
                console.log('Bookings loaded successfully:', this.bookings.length);
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                console.error('Failed to load bookings, status:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.error('Error details:', errorData);
                this.bookings = [];
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookings = [];
        }
    }

    calculateStatsFromBookings() {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        this.statsData = {
            totalBookings: this.bookings.length,
            pendingBookings: this.bookings.filter(b => b.appointment_status === 'pending').length,
            approvedBookings: this.bookings.filter(b => b.appointment_status === 'approved').length,
            confirmedBookings: this.bookings.filter(b => b.appointment_status === 'confirmed').length,
            inProgressBookings: this.bookings.filter(b => b.appointment_status === 'in-progress').length,
            completedBookings: this.bookings.filter(b => b.appointment_status === 'completed').length,
            cancelledBookings: this.bookings.filter(b => b.appointment_status === 'cancelled').length,
            todayBookings: this.bookings.filter(b => 
                new Date(b.scheduled_date).toDateString() === today.toDateString()
            ).length,
            monthlyBookings: this.bookings.filter(b => 
                new Date(b.scheduled_date) >= thisMonth
            ).length,
            averageRating: this.calculateAverageRating()
        };
    }

    calculateAverageRating() {
        const ratingsData = this.bookings
            .filter(b => b.appointment_rating && b.appointment_rating.length > 0)
            .flatMap(b => b.appointment_rating);
        
        if (ratingsData.length === 0) return 0;
        
        const sum = ratingsData.reduce((acc, rating) => acc + rating.rating_value, 0);
        return (sum / ratingsData.length).toFixed(1);
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.booking-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateFilterButtons();
                this.renderBookings();
            });
        });

        // Sort dropdown
        const sortSelect = document.getElementById('bookingSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderBookings();
            });
        }

        // Search input
        const searchInput = document.getElementById('bookingSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.debounceSearch();
            });
        }

        // Status filter dropdown
        const statusFilter = document.getElementById('bookingStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value || 'all';
                this.renderBookings();
            });
        }

        // Modal event listeners
        const modal = document.getElementById('bookingDetailsModal');
        if (modal) {
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeBookingDetailsModal();
                }
            });

            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (modal && modal.style.display === 'block') {
                        this.closeBookingDetailsModal();
                    }
                    const cancellationModal = document.getElementById('cancellationModal');
                    if (cancellationModal && cancellationModal.style.display === 'block') {
                        this.closeCancellationModal();
                    }
                    const ratingModal = document.getElementById('ratingModal');
                    if (ratingModal && ratingModal.style.display === 'block') {
                        this.closeRatingModal();
                    }
                }
            });
        }

        // Cancellation reason dropdown change
        const cancellationReason = document.getElementById('cancellationReason');
        if (cancellationReason) {
            cancellationReason.addEventListener('change', (e) => {
                const customReasonGroup = document.getElementById('customReasonGroup');
                if (e.target.value === 'other') {
                    customReasonGroup.style.display = 'block';
                } else {
                    customReasonGroup.style.display = 'none';
                }
            });
        }

        // Star rating event listeners
        const starRating = document.getElementById('starRating');
        if (starRating) {
            starRating.addEventListener('click', (e) => {
                if (e.target.classList.contains('fa-star')) {
                    this.setRating(parseInt(e.target.dataset.rating));
                }
            });
        }
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderBookings();
        }, 300);
    }

    updateFilterButtons() {
        document.querySelectorAll('.booking-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === this.currentFilter) {
                btn.classList.add('active');
            }
        });
    }

    getFilteredBookings() {
        let filtered = [...this.bookings];

        // Apply status filter
        if (this.currentFilter && this.currentFilter !== 'all') {
            filtered = filtered.filter(booking => booking.appointment_status === this.currentFilter);
        }

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(booking => 
                booking.customer.first_name.toLowerCase().includes(this.searchTerm) ||
                booking.customer.last_name.toLowerCase().includes(this.searchTerm) ||
                booking.service?.service_title?.toLowerCase().includes(this.searchTerm) ||
                booking.repairDescription?.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'date_asc':
                    return new Date(a.scheduled_date) - new Date(b.scheduled_date);
                case 'date_desc':
                    return new Date(b.scheduled_date) - new Date(a.scheduled_date);
                case 'price_high':
                    return (b.final_price || 0) - (a.final_price || 0);
                case 'price_low':
                    return (a.final_price || 0) - (b.final_price || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    renderBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container) {
            console.warn('Bookings container not found');
            return;
        }

        const filteredBookings = this.getFilteredBookings();

        if (filteredBookings.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = `
            <div class="booking-list">
                ${filteredBookings.map(booking => this.renderBookingCard(booking)).join('')}
            </div>
        `;

        // Update results count
        const resultsCount = document.getElementById('bookingResultsCount');
        if (resultsCount) {
            resultsCount.textContent = `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''}`;
        }

        // Initialize mini maps
        setTimeout(() => {
            this.initializeMiniMaps(filteredBookings);
        }, 100);
    }

    renderBookingCard(booking) {
        const scheduledDate = new Date(booking.scheduled_date);
        const isToday = scheduledDate.toDateString() === new Date().toDateString();
        const isPast = scheduledDate < new Date();
        
        return `
            <div class="booking-card ${booking.appointment_status} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                <div class="booking-header">
                    <div class="booking-id">#${booking.appointment_id}</div>
                    <div class="booking-status">
                        <span class="status-badge status-${booking.appointment_status}">
                            ${this.getStatusIcon(booking.appointment_status)}
                            ${this.formatStatus(booking.appointment_status)}
                        </span>
                    </div>
                </div>
                
                <div class="booking-content">
                    <div class="booking-main-info">
                        <h3 class="service-title">${booking.service?.service_title || 'Service'}</h3>
                        <div class="customer-info">
                            <i class="fas fa-user"></i>
                            <span>${booking.customer.first_name} ${booking.customer.last_name}</span>
                            <a href="tel:${booking.customer.phone_number}" class="phone-link">
                                <i class="fas fa-phone"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="booking-details">
                        <div class="booking-detail">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${this.formatDate(booking.scheduled_date)}</span>
                            ${isToday ? '<span class="today-badge">Today</span>' : ''}
                        </div>
                        
                        <div class="booking-detail">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatTime(booking.scheduled_date)}</span>
                        </div>
                        
                        ${booking.final_price ? `
                            <div class="booking-detail">
                                <i class="fas fa-peso-sign"></i>
                                <span>₱${booking.final_price.toLocaleString()}</span>
                            </div>
                        ` : ''}
                        
                        <div class="booking-detail">
                            <i class="fas fa-tag"></i>
                            <span>Created ${this.formatTimeAgo(booking.created_at)}</span>
                        </div>
                    </div>
                    
                    ${booking.customer.exact_location ? `
                        <div class="customer-location">
                            <div class="location-header">
                                <i class="fas fa-map-marker-alt"></i>
                                <h4>Customer Location</h4>
                                <button class="btn-sm btn-secondary" onclick="bookingManager.showLocationModal(${booking.appointment_id})">
                                    <i class="fas fa-expand"></i> View Full Map
                                </button>
                            </div>
                            <div class="mini-map" id="map-${booking.appointment_id}"></div>
                        </div>
                    ` : ''}
                    
                    ${booking.repairDescription ? `
                        <div class="booking-description">
                            <i class="fas fa-file-alt"></i>
                            <p>${booking.repairDescription}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="booking-actions">
                    <button class="btn-secondary btn-sm" onclick="bookingManager.viewBookingDetails(${booking.appointment_id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    
                    ${this.getStatusActions(booking)}
                </div>
            </div>
        `;
    }

    getStatusActions(booking) {
        const actions = [];
        
        switch (booking.appointment_status) {
            case 'pending':
                actions.push(`
                    <button class="btn-success btn-sm" onclick="bookingManager.updateBookingStatus(${booking.appointment_id}, 'approved')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-danger btn-sm" onclick="bookingManager.showCancelModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Decline
                    </button>
                `);
                break;
                
            case 'approved':
                actions.push(`
                    <button class="btn-success btn-sm" onclick="bookingManager.updateBookingStatus(${booking.appointment_id}, 'confirmed')">
                        <i class="fas fa-check-circle"></i> Confirm
                    </button>
                    <button class="btn-danger btn-sm" onclick="bookingManager.showCancelModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
                
            case 'confirmed':
                actions.push(`
                    <button class="btn-primary btn-sm" onclick="bookingManager.updateBookingStatus(${booking.appointment_id}, 'in-progress')">
                        <i class="fas fa-play"></i> Start Work
                    </button>
                    <button class="btn-danger btn-sm" onclick="bookingManager.showCancelModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
                
            case 'in-progress':
                actions.push(`
                    <button class="btn-success btn-sm" onclick="bookingManager.showCompleteModal(${booking.appointment_id})">
                        <i class="fas fa-check-circle"></i> Complete
                    </button>
                `);
                break;
                
            case 'completed':
                actions.push(`
                    <button class="btn-info btn-sm" onclick="bookingManager.generateReceipt(${booking.appointment_id})">
                        <i class="fas fa-receipt"></i> Receipt
                    </button>
                    <button class="btn-warning btn-sm" onclick="bookingManager.showRatingModal(${booking.appointment_id})">
                        <i class="fas fa-star"></i> Rate Customer
                    </button>
                `);
                break;
        }
        
        return actions.join('');
    }

    getStatusIcon(status) {
        const icons = {
            'pending': 'fas fa-clock',
            'approved': 'fas fa-thumbs-up',
            'confirmed': 'fas fa-check-circle',
            'in-progress': 'fas fa-play-circle',
            'completed': 'fas fa-check-double',
            'cancelled': 'fas fa-times-circle',
            'no-show': 'fas fa-user-times'
        };
        return `<i class="${icons[status] || 'fas fa-question-circle'}"></i>`;
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'confirmed': 'Confirmed',
            'in-progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'no-show': 'No Show'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
        }
    }

    renderEmptyState() {
        let message = 'No bookings found';
        let description = 'Your bookings will appear here once customers book your services.';
        
        if (this.currentFilter !== 'all') {
            message = `No ${this.currentFilter} bookings`;
            description = `You don't have any ${this.currentFilter} bookings at the moment.`;
        }
        
        if (this.searchTerm) {
            message = 'No matching bookings';
            description = `No bookings match your search "${this.searchTerm}".`;
        }
        
        return `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${message}</h3>
                <p>${description}</p>
                ${this.searchTerm ? `
                    <button class="btn-secondary" onclick="bookingManager.clearSearch()">
                        Clear Search
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderBookingStats() {
        // Update stats in the dashboard
        const statsElements = {
            'stats-total': this.statsData.totalBookings,
            'stats-pending': this.statsData.pendingBookings,
            'stats-approved': this.statsData.approvedBookings,
            'stats-confirmed': this.statsData.confirmedBookings,
            'stats-completed': this.statsData.completedBookings,
            'stats-today': this.statsData.todayBookings,
            'stats-rating': this.statsData.averageRating
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Action methods
    async updateBookingStatus(bookingId, newStatus) {
        try {
            console.log(`Updating booking ${bookingId} to status: ${newStatus}`);
            
            const response = await fetch(`/api/serviceProvider/appointments/${bookingId}/status`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Status update successful:', result);
                
                // Update local data
                const booking = this.bookings.find(b => b.appointment_id === bookingId);
                if (booking) {
                    booking.appointment_status = newStatus;
                    this.calculateStatsFromBookings();
                    this.renderBookings();
                    this.renderBookingStats();
                }
                
                this.showToast(`Booking ${this.formatStatus(newStatus).toLowerCase()} successfully`, 'success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Status update failed:', response.status, errorData);
                throw new Error(errorData.message || 'Failed to update booking status');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showToast(`Error updating booking status: ${error.message}`, 'error');
        }
    }

    viewBookingDetails(bookingId) {
        const booking = this.bookings.find(b => b.appointment_id === bookingId);
        if (!booking) {
            this.showToast('Booking not found', 'error');
            return;
        }

        this.selectedBooking = booking;
        this.showBookingDetailsModal();
    }

    showBookingDetailsModal() {
        const modal = document.getElementById('bookingDetailsModal');
        const booking = this.selectedBooking;
        
        if (!booking) {
            this.showToast('Booking data not available', 'error');
            return;
        }

        // Populate customer information
        document.getElementById('customerName').textContent = 
            `${booking.customer.first_name} ${booking.customer.last_name}`;
        document.getElementById('customerEmail').textContent = 
            booking.customer.email || 'N/A';
        document.getElementById('customerPhone').textContent = 
            booking.customer.phone_number || 'N/A';
        
        // Set customer avatar
        const customerAvatar = document.getElementById('customerAvatar');
        if (booking.customer.profile_image_url) {
            customerAvatar.innerHTML = `<img src="${booking.customer.profile_image_url}" alt="Customer Avatar">`;
        } else {
            customerAvatar.innerHTML = `<i class="fas fa-user fa-2x" style="color: #6c757d;"></i>`;
        }

        // Populate service information
        document.getElementById('serviceName').textContent = 
            booking.service?.service_title || 'N/A';
        document.getElementById('serviceDescription').textContent = 
            booking.service?.service_description || 'N/A';
        document.getElementById('servicePrice').textContent = 
            booking.final_price ? `₱${booking.final_price.toLocaleString()}` : 'N/A';

        // Populate appointment information
        document.getElementById('appointmentDate').textContent = 
            this.formatDate(booking.scheduled_date);
        document.getElementById('appointmentTime').textContent = 
            this.formatTime(booking.scheduled_date);
        document.getElementById('repairDescription').textContent = 
            booking.repairDescription || 'No description provided';
        
        // Set status badge
        const statusBadge = document.getElementById('appointmentStatus');
        statusBadge.textContent = this.formatStatus(booking.appointment_status);
        statusBadge.className = `status-badge status-${booking.appointment_status}`;

        // Populate location information
        const fullAddress = this.getFullAddress(booking);
        document.getElementById('customerAddress').textContent = fullAddress;

        // Populate action buttons
        this.populateModalActionButtons(booking);

        // Show modal
        modal.style.display = 'block';
        
        // Initialize map after modal is visible
        setTimeout(() => {
            this.initializeDetailsMap(booking);
        }, 100);
    }

    getFullAddress(booking) {
        const location = booking.customer.exact_location;
        if (location) {
            let locationObj = location;
            
            // Parse JSON string if necessary
            if (typeof location === 'string') {
                try {
                    locationObj = JSON.parse(location);
                } catch (e) {
                    // If parsing fails, use user_location as fallback
                    return booking.customer.user_location || 'Address not available';
                }
            }
            
            // Extract address components
            const addressParts = [];
            if (locationObj.street_address) addressParts.push(locationObj.street_address);
            if (locationObj.city) addressParts.push(locationObj.city);
            if (locationObj.province) addressParts.push(locationObj.province);
            
            if (addressParts.length > 0) {
                return addressParts.join(', ');
            }
        }
        
        // Fallback to user_location
        return booking.customer.user_location || 'Address not available';
    }

    closeBookingDetailsModal() {
        const modal = document.getElementById('bookingDetailsModal');
        modal.style.display = 'none';
        
        // Clean up map if it exists
        if (this.detailsMap) {
            this.detailsMap.remove();
            this.detailsMap = null;
        }
    }

    populateModalActionButtons(booking) {
        const actionButtonsContainer = document.getElementById('modalActionButtons');
        const actions = [];

        switch (booking.appointment_status) {
            case 'pending':
                actions.push(`
                    <button class="btn-success" onclick="bookingManager.updateBookingStatusFromModal(${booking.appointment_id}, 'approved')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-danger" onclick="bookingManager.showCancelModalFromModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Decline
                    </button>
                `);
                break;
            case 'approved':
                actions.push(`
                    <button class="btn-success" onclick="bookingManager.updateBookingStatusFromModal(${booking.appointment_id}, 'confirmed')">
                        <i class="fas fa-check-circle"></i> Confirm
                    </button>
                    <button class="btn-danger" onclick="bookingManager.showCancelModalFromModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'confirmed':
                actions.push(`
                    <button class="btn-warning" onclick="bookingManager.updateBookingStatusFromModal(${booking.appointment_id}, 'in-progress')">
                        <i class="fas fa-play"></i> Start Work
                    </button>
                    <button class="btn-danger" onclick="bookingManager.showCancelModalFromModal(${booking.appointment_id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `);
                break;
            case 'in-progress':
                actions.push(`
                    <button class="btn-success" onclick="bookingManager.updateBookingStatusFromModal(${booking.appointment_id}, 'completed')">
                        <i class="fas fa-check-circle"></i> Complete
                    </button>
                `);
                break;
            case 'completed':
                actions.push(`
                    <button class="btn-primary" onclick="bookingManager.generateReceipt(${booking.appointment_id})">
                        <i class="fas fa-receipt"></i> Generate Receipt
                    </button>
                    <button class="btn-warning" onclick="bookingManager.showRatingModal(${booking.appointment_id})">
                        <i class="fas fa-star"></i> Rate Customer
                    </button>
                `);
                break;
        }

        actionButtonsContainer.innerHTML = actions.join('');
    }

    updateBookingStatusFromModal(bookingId, newStatus) {
        this.updateBookingStatus(bookingId, newStatus).then(() => {
            // Update the modal content after successful status update
            const updatedBooking = this.bookings.find(b => b.appointment_id === bookingId);
            if (updatedBooking) {
                this.selectedBooking = updatedBooking;
                this.populateModalActionButtons(updatedBooking);
                
                // Update status badge in modal
                const statusBadge = document.getElementById('appointmentStatus');
                statusBadge.textContent = this.formatStatus(newStatus);
                statusBadge.className = `status-badge status-${newStatus}`;
            }
        }).catch(error => {
            console.error('Error updating booking status from modal:', error);
        });
    }

    showCancelModalFromModal(bookingId) {
        // Close booking details modal first
        this.closeBookingDetailsModal();
        // Show cancellation modal
        this.showCancelModal(bookingId);
    }

    initializeDetailsMap(booking) {
        const mapContainer = document.getElementById('bookingDetailsMap');
        if (!mapContainer) return;

        // Clean up existing map
        if (this.detailsMap) {
            this.detailsMap.remove();
        }

        const location = booking.customer.exact_location;
        if (!location) {
            mapContainer.innerHTML = '<div class="map-placeholder">Location not available</div>';
            return;
        }

        // Handle different location formats
        let lat, lng;
        
        if (typeof location === 'string') {
            // Try to parse as JSON first (most common format)
            try {
                const locationObj = JSON.parse(location);
                if (locationObj.lat && locationObj.lng) {
                    lat = parseFloat(locationObj.lat);
                    lng = parseFloat(locationObj.lng);
                }
            } catch (jsonError) {
                // If JSON parsing fails, try to parse as "lat,lng" string
                const coords = location.split(',');
                if (coords.length === 2) {
                    lat = parseFloat(coords[0].trim());
                    lng = parseFloat(coords[1].trim());
                }
            }
        } else if (typeof location === 'object') {
            // Handle different property names
            if (location.lat && location.lng) {
                lat = parseFloat(location.lat);
                lng = parseFloat(location.lng);
            } else if (location.latitude && location.longitude) {
                lat = parseFloat(location.latitude);
                lng = parseFloat(location.longitude);
            }
        }

        if (isNaN(lat) || isNaN(lng)) {
            mapContainer.innerHTML = '<div class="map-placeholder">Location coordinates not available</div>';
            return;
        }

        try {
            // Initialize map
            this.detailsMap = L.map('bookingDetailsMap').setView([lat, lng], 15);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.detailsMap);

            // Add marker
            const marker = L.marker([lat, lng]).addTo(this.detailsMap);
            
            // Add popup with customer info
            const popupContent = `
                <div class="map-popup">
                    <strong>${booking.customer.first_name} ${booking.customer.last_name}</strong><br>
                    ${this.getFullAddress(booking)}<br>
                    <small>Service: ${booking.service?.service_title || 'N/A'}</small>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            // Force map to resize properly
            setTimeout(() => {
                this.detailsMap.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error initializing details map:', error);
            mapContainer.innerHTML = '<div class="map-placeholder">Error loading map</div>';
        }
    }

    openGoogleMaps() {
        if (!this.selectedBooking) return;

        const booking = this.selectedBooking;
        const location = booking.customer.exact_location;
        
        if (!location) {
            this.showToast('Location not available', 'error');
            return;
        }

        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            this.showToast('Location coordinates not available', 'error');
            return;
        }

        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(googleMapsUrl, '_blank');
    }

    showCancelModal(bookingId) {
        const booking = this.bookings.find(b => b.appointment_id === bookingId);
        if (!booking) {
            this.showToast('Booking not found', 'error');
            return;
        }
        
        this.selectedBookingForCancellation = booking;
        this.showCancellationModal();
    }

    showCompleteModal(bookingId) {
        if (confirm('Mark this booking as completed?')) {
            this.updateBookingStatus(bookingId, 'completed');
        }
    }

    generateReceipt(bookingId) {
        const booking = this.bookings.find(b => b.appointment_id === bookingId);
        if (!booking) {
            this.showToast('Booking not found', 'error');
            return;
        }
        
        alert(`Receipt for Booking #${bookingId} will be generated and emailed to the customer.`);
        console.log('Generating receipt for booking:', booking);
    }

    initializeMiniMaps(bookings) {
        bookings.forEach(booking => {
            if (booking.customer.exact_location) {
                try {
                    console.log('Processing location for booking:', booking.appointment_id, 'Location:', booking.customer.exact_location);
                    
                    // Handle different location formats
                    let lat, lng;
                    
                    if (typeof booking.customer.exact_location === 'string') {
                        // Try to parse as JSON first (most common format)
                        try {
                            const locationObj = JSON.parse(booking.customer.exact_location);
                            if (locationObj.lat && locationObj.lng) {
                                lat = parseFloat(locationObj.lat);
                                lng = parseFloat(locationObj.lng);
                            }
                        } catch (jsonError) {
                            // If JSON parsing fails, try to parse as "lat,lng" string
                            const coords = booking.customer.exact_location.split(',');
                            if (coords.length === 2) {
                                lat = parseFloat(coords[0].trim());
                                lng = parseFloat(coords[1].trim());
                            }
                        }
                    } else if (typeof booking.customer.exact_location === 'object' && booking.customer.exact_location.lat && booking.customer.exact_location.lng) {
                        // If it's already an object with lat/lng properties
                        lat = parseFloat(booking.customer.exact_location.lat);
                        lng = parseFloat(booking.customer.exact_location.lng);
                    }
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        this.createMiniMap(booking.appointment_id, lat, lng);
                    } else {
                        console.warn('Invalid coordinates for booking:', booking.appointment_id, 'lat:', lat, 'lng:', lng);
                    }
                } catch (error) {
                    console.error('Error parsing location:', error);
                }
            }
        });
    }

    createMiniMap(appointmentId, lat, lng) {
        const mapContainer = document.getElementById(`map-${appointmentId}`);
        if (!mapContainer) return;

        try {
            // Check if map already exists
            if (mapContainer._leaflet_id) {
                return;
            }

            const map = L.map(mapContainer, {
                center: [lat, lng],
                zoom: 15,
                zoomControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.marker([lat, lng])
                .addTo(map)
                .bindPopup('Customer Location')
                .openPopup();

        } catch (error) {
            console.error('Error creating mini map:', error);
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                    <i class="fas fa-map-marker-alt"></i>
                    <span style="margin-left: 0.5rem;">Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                </div>
            `;
        }
    }

    showLocationModal(appointmentId) {
        const booking = this.bookings.find(b => b.appointment_id === appointmentId);
        if (!booking || !booking.customer.exact_location) {
            this.showToast('Location not available', 'error');
            return;
        }

        try {
            console.log('Showing location modal for booking:', appointmentId, 'Location:', booking.customer.exact_location);
            
            // Handle different location formats
            let lat, lng;
            
            if (typeof booking.customer.exact_location === 'string') {
                // Try to parse as JSON first (most common format)
                try {
                    const locationObj = JSON.parse(booking.customer.exact_location);
                    if (locationObj.lat && locationObj.lng) {
                        lat = parseFloat(locationObj.lat);
                        lng = parseFloat(locationObj.lng);
                    }
                } catch (jsonError) {
                    // If JSON parsing fails, try to parse as "lat,lng" string
                    const coords = booking.customer.exact_location.split(',');
                    if (coords.length === 2) {
                        lat = parseFloat(coords[0].trim());
                        lng = parseFloat(coords[1].trim());
                    }
                }
            } else if (typeof booking.customer.exact_location === 'object' && booking.customer.exact_location.lat && booking.customer.exact_location.lng) {
                // If it's an object with lat/lng properties
                lat = parseFloat(booking.customer.exact_location.lat);
                lng = parseFloat(booking.customer.exact_location.lng);
            }
            
            if (isNaN(lat) || isNaN(lng)) {
                console.error('Invalid coordinates - lat:', lat, 'lng:', lng);
                console.error('Location object:', booking.customer.exact_location);
                this.showToast('Invalid location coordinates', 'error');
                return;
            }

            console.log('Valid coordinates found - lat:', lat, 'lng:', lng);

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3><i class="fas fa-map-marker-alt"></i> Customer Location - ${booking.customer.first_name} ${booking.customer.last_name}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="fullMap" style="height: 400px; width: 100%; border-radius: 8px;"></div>
                        <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
                            </div>
                            <button class="btn-primary btn-sm" onclick="window.open('https://www.google.com/maps?q=${lat},${lng}', '_blank')">
                                <i class="fas fa-external-link-alt"></i> Open in Google Maps
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'flex';

            // Initialize full map
            setTimeout(() => {
                const fullMap = L.map('fullMap').setView([lat, lng], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(fullMap);

                L.marker([lat, lng])
                    .addTo(fullMap)
                    .bindPopup(`${booking.customer.first_name} ${booking.customer.last_name}<br>Customer Location`)
                    .openPopup();
            }, 100);
            
        } catch (error) {
            console.error('Error showing location modal:', error);
            this.showToast('Error loading location', 'error');
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('bookingSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchTerm = '';
        this.renderBookings();
    }

    async refreshBookings() {
        this.showLoading();
        try {
            await this.loadBookings();
            this.calculateStatsFromBookings();
            this.renderBookings();
            this.renderBookingStats();
            this.showToast('Bookings refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing bookings:', error);
            this.showToast('Error refreshing bookings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    startPolling() {
        // Poll for new bookings every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.refreshBookings();
        }, 30000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    showLoading() {
        const container = document.getElementById('bookingsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading bookings...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        this.renderBookings();
    }

    showToast(message, type = 'info') {
        // Use the dashboard's toast method if available
        if (window.dashboard && typeof window.dashboard.showToast === 'function') {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Cancellation Modal Functions
    showCancellationModal() {
        const modal = document.getElementById('cancellationModal');
        const reasonSelect = document.getElementById('cancellationReason');
        const customReasonGroup = document.getElementById('customReasonGroup');
        const customReason = document.getElementById('customReason');
        
        // Reset form
        reasonSelect.value = '';
        customReasonGroup.style.display = 'none';
        customReason.value = '';
        
        modal.style.display = 'block';
    }

    closeCancellationModal() {
        const modal = document.getElementById('cancellationModal');
        modal.style.display = 'none';
        this.selectedBookingForCancellation = null;
    }

    async confirmCancellation() {
        const reasonSelect = document.getElementById('cancellationReason');
        const customReason = document.getElementById('customReason');
        
        if (!reasonSelect.value) {
            this.showToast('Please select a reason for cancellation', 'error');
            return;
        }
        
        if (reasonSelect.value === 'other' && !customReason.value.trim()) {
            this.showToast('Please specify your reason for cancellation', 'error');
            return;
        }
        
        const cancellationReason = reasonSelect.value === 'other' 
            ? customReason.value.trim() 
            : reasonSelect.options[reasonSelect.selectedIndex].text;
        
        try {
            const response = await fetch(`/api/serviceProvider/appointments/${this.selectedBookingForCancellation.appointment_id}/cancel`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({ 
                    cancellation_reason: cancellationReason 
                })
            });

            if (response.ok) {
                // Update local data
                const booking = this.bookings.find(b => b.appointment_id === this.selectedBookingForCancellation.appointment_id);
                if (booking) {
                    booking.appointment_status = 'cancelled';
                    booking.cancellation_reason = cancellationReason;
                    this.calculateStatsFromBookings();
                    this.renderBookings();
                    this.renderBookingStats();
                }
                
                this.closeCancellationModal();
                this.showToast('Booking cancelled successfully', 'success');
            } else {
                throw new Error('Failed to cancel booking');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showToast('Error cancelling booking', 'error');
        }
    }

    // Rating Modal Functions
    showRatingModal(bookingId) {
        const booking = this.bookings.find(b => b.appointment_id === bookingId);
        if (!booking) {
            this.showToast('Booking not found', 'error');
            return;
        }
        
        this.selectedBookingForRating = booking;
        this.selectedRating = 0;
        
        // Populate modal
        document.getElementById('ratingCustomerName').textContent = 
            `${booking.customer.first_name} ${booking.customer.last_name}`;
        document.getElementById('ratingServiceName').textContent = 
            booking.service?.service_title || 'Service';
        document.getElementById('ratingComment').value = '';
        
        // Reset stars
        this.setRating(0);
        
        const modal = document.getElementById('ratingModal');
        modal.style.display = 'block';
    }

    closeRatingModal() {
        const modal = document.getElementById('ratingModal');
        modal.style.display = 'none';
        this.selectedBookingForRating = null;
        this.selectedRating = 0;
    }

    setRating(rating) {
        this.selectedRating = rating;
        const stars = document.querySelectorAll('#starRating i');
        const ratingText = document.getElementById('ratingText');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        const ratingTexts = [
            'Rate this customer',
            'Poor',
            'Fair', 
            'Good',
            'Very Good',
            'Excellent'
        ];
        
        ratingText.textContent = ratingTexts[rating] || 'Rate this customer';
    }

    async submitRating() {
        if (this.selectedRating === 0) {
            this.showToast('Please select a rating', 'error');
            return;
        }
        
        const comment = document.getElementById('ratingComment').value.trim();
        
        try {
            const response = await fetch(`/api/serviceProvider/appointments/${this.selectedBookingForRating.appointment_id}/rate`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({ 
                    rating: this.selectedRating,
                    comment: comment || null
                })
            });

            if (response.ok) {
                this.closeRatingModal();
                this.showToast('Rating submitted successfully', 'success');
                
                // Refresh bookings to update any changes
                await this.loadBookings();
                this.calculateStatsFromBookings();
                this.renderBookings();
                this.renderBookingStats();
            } else {
                throw new Error('Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showToast('Error submitting rating', 'error');
        }
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    destroy() {
        this.stopPolling();
        // Clear any timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

// Initialize booking manager when needed
window.BookingManager = BookingManager;
