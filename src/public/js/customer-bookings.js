/**
 * Customer Bookings Manager
 * Handles customer booking display and management functionality
 */
class CustomerBookingsManager {
    constructor() {
        this.bookings = [];
        this.filteredBookings = [];
        this.filters = {
            status: '',
            dateRange: '',
            search: ''
        };
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadBookings();
    }

    setupEventListeners() {
        // Filter event listeners
        const statusFilter = document.getElementById('statusFilter');
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        const searchInput = document.getElementById('bookingSearchInput');

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.applyFilters();
            });
        }

        if (searchInput) {
            const debouncedSearch = this.debounce((e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
            }, 300);
            
            searchInput.addEventListener('input', debouncedSearch);
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBookings');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadBookings();
            });
        }
    }

    async loadBookings() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            // Check if DashboardUtils is available
            if (typeof DashboardUtils === 'undefined') {
                throw new Error('DashboardUtils is not available. Please refresh the page.');
            }

            const data = await DashboardUtils.makeRequest('/auth/bookings');
            
            if (data.success) {
                this.bookings = data.appointments || [];
                // Apply initial filter to show only allowed statuses
                this.applyFilters();
            } else {
                throw new Error(data.message || 'Failed to load bookings');
            }

        } catch (error) {
            console.error('Error loading bookings:', error);
            
            // Handle authentication errors specifically
            if (error.message.includes('Session expired') || error.message.includes('Authentication required')) {
                // Clear any existing tokens and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                localStorage.removeItem('fixmo_user_token');
                localStorage.removeItem('fixmo_user_id');
                localStorage.removeItem('fixmo_user_name');
                localStorage.removeItem('fixmo_user_type');
                
                // Show error message and redirect
                this.showErrorState('Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/fixmo-login';
                }, 3000);
            } else {
                this.showErrorState(error.message);
            }
        } finally {
            this.isLoading = false;
        }
    }

    displayBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        if (this.filteredBookings.length === 0) {
            this.showEmptyState();
            return;
        }

        // Create bookings list
        this.filteredBookings.forEach(booking => {
            const bookingElement = this.createBookingCard(booking);
            container.appendChild(bookingElement);
        });

        // Setup action listeners
        this.setupBookingActionListeners();
    }

    createBookingCard(booking) {
        const card = document.createElement('div');
        card.className = 'booking-card-horizontal';
        card.dataset.bookingId = booking.appointment_id;

        const serviceImage = booking.service.picture 
            ? `<img src="/${booking.service.picture}" alt="${booking.service.title}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-tools\\"></i>';">` 
            : '<i class="fas fa-tools"></i>';

        const providerImage = booking.provider.profile_photo 
            ? `<img src="/${booking.provider.profile_photo}" alt="${booking.provider.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-user\\"></i>';">` 
            : '<i class="fas fa-user"></i>';

        card.innerHTML = `
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
        `;

        return card;
    }

    renderBookingActions(booking) {
        const canCall = booking.actions.canCall;
        const canCancel = booking.actions.canCancel;
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

    setupBookingActionListeners() {
        // Call provider buttons
        document.querySelectorAll('.call-provider').forEach(button => {
            button.addEventListener('click', (e) => {
                const phone = button.dataset.phone;
                const providerName = button.dataset.providerName;
                this.showCallProviderModal(phone, providerName);
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

        // Rate service buttons
        document.querySelectorAll('.rate-service').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookingId = button.dataset.bookingId;
                const providerName = button.dataset.providerName;
                this.showRatingModal(bookingId, providerName);
            });
        });
    }

    applyFilters() {
        // Only show bookings with allowed statuses
        const allowedStatuses = ['approved', 'on the way', 'in progress', 'completed'];
        
        this.filteredBookings = this.bookings.filter(booking => {
            // First filter by allowed statuses
            if (!allowedStatuses.includes(booking.appointment_status)) {
                return false;
            }
            
            // Status filter
            if (this.filters.status && booking.appointment_status !== this.filters.status) {
                return false;
            }

            // Date range filter
            if (this.filters.dateRange) {
                const bookingDate = new Date(booking.scheduled_date);
                const now = new Date();
                const daysDiff = Math.ceil((bookingDate - now) / (1000 * 60 * 60 * 24));

                switch (this.filters.dateRange) {
                    case 'today':
                        if (daysDiff !== 0) return false;
                        break;
                    case 'tomorrow':
                        if (daysDiff !== 1) return false;
                        break;
                    case 'week':
                        if (daysDiff < 0 || daysDiff > 7) return false;
                        break;
                    case 'month':
                        if (daysDiff < 0 || daysDiff > 30) return false;
                        break;
                    case 'past':
                        if (daysDiff >= 0) return false;
                        break;
                }
            }

            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const serviceTitle = booking.service.title.toLowerCase();
                const providerName = booking.provider.name.toLowerCase();
                const status = booking.appointment_status.toLowerCase();
                
                if (!serviceTitle.includes(searchTerm) && 
                    !providerName.includes(searchTerm) && 
                    !status.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        this.displayBookings();
        this.updateStats();
    }

    updateStats() {
        // Filter bookings to only show approved, on the way, in progress, and completed
        const allowedStatuses = ['approved', 'on the way', 'in progress', 'completed'];
        const validBookings = this.bookings.filter(b => allowedStatuses.includes(b.appointment_status));
        
        const totalBookings = validBookings.length;
        const activeBookings = validBookings.filter(b => 
            ['approved', 'on the way', 'in progress'].includes(b.appointment_status)
        ).length;
        const completedBookings = validBookings.filter(b => 
            b.appointment_status === 'completed'
        ).length;
        const inProgressBookings = validBookings.filter(b => 
            b.appointment_status === 'in progress'
        ).length;
        
        // Update stats display
        this.updateStatElement('totalBookings', totalBookings);
        this.updateStatElement('activeBookings', activeBookings);
        this.updateStatElement('completedBookings', completedBookings);
        this.updateStatElement('inProgressBookings', inProgressBookings);
    }

    updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    async cancelBooking(bookingId) {
        try {
            const data = await DashboardUtils.makeRequest(`/auth/bookings/${bookingId}/cancel`, {
                method: 'PUT'
            });
            
            if (data.success) {
                this.showToast('Booking cancelled successfully', 'success');
                await this.loadBookings(); // Reload bookings
            } else {
                throw new Error(data.message || 'Failed to cancel booking');
            }

        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showToast('Error cancelling booking: ' + error.message, 'error');
        }
    }

    // Modal functions
    showCallProviderModal(phone, providerName) {
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
                    <div class="call-info" style="text-align: center; padding: 20px;">
                        <div class="provider-call-details" style="margin-bottom: 15px;">
                            <i class="fas fa-user" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 10px;"></i>
                            <h4 style="margin: 0; color: var(--text-primary);">${providerName}</h4>
                        </div>
                        <div class="phone-number" style="margin-bottom: 20px;">
                            <i class="fas fa-phone" style="color: var(--primary-color); margin-right: 8px;"></i>
                            <span style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);">${phone}</span>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">You can call this number to contact your service provider directly.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <a href="tel:${phone}" class="btn-primary" style="text-decoration: none;">
                        <i class="fas fa-phone"></i> Call Now
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showCancelConfirmation(bookingId, providerName) {
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
                    <p style="margin-bottom: 10px;">Are you sure you want to cancel your booking with <strong>${providerName}</strong>?</p>
                    <p style="color: var(--warning-color); margin-bottom: 20px;">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        Keep Booking
                    </button>
                    <button class="btn-danger" onclick="window.bookingsManager.cancelBooking('${bookingId}'); this.closest('.modal').remove();">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showRatingModal(bookingId, providerName) {
        // This would open a rating modal - implementation depends on your rating system
        this.showToast('Rating feature coming soon!', 'info');
    }

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        // Convert 24-hour format to 12-hour format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getStatusClass(status) {
        const statusClasses = {
            'pending': 'pending',
            'approved': 'approved',
            'on the way': 'on-the-way',
            'in progress': 'in-progress',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };
        return statusClasses[status] || 'pending';
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Pending',
            'approved': 'Approved',
            'on the way': 'On The Way',
            'in progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusTexts[status] || status;
    }

    showLoadingState() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="bookings-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your bookings...</p>
            </div>
        `;
    }

    showEmptyState() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="bookings-empty-state">
                <i class="fas fa-calendar-check"></i>
                <h3>No Active Bookings</h3>
                <p>You don't have any approved, in-progress, or completed bookings yet.</p>
                <a href="/customer-dashboard" class="btn-primary">
                    <i class="fas fa-plus"></i> Browse Services
                </a>
            </div>
        `;
    }

    showErrorState(message) {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        const isAuthError = message.includes('Session expired') || message.includes('Authentication required');
        
        container.innerHTML = `
            <div class="bookings-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${isAuthError ? 'Authentication Required' : 'Error Loading Bookings'}</h3>
                <p>${message}</p>
                ${isAuthError ? `
                    <p style="margin-top: 10px; color: var(--text-secondary);">
                        You will be redirected to the login page in a few seconds...
                    </p>
                    <a href="/fixmo-login" class="btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-sign-in-alt"></i> Go to Login
                    </a>
                ` : `
                    <button class="btn-primary" onclick="window.bookingsManager.loadBookings()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                `}
            </div>
        `;
    }

    showToast(message, type = 'info') {
        // Use the existing toast system if available
        if (typeof DashboardUtils !== 'undefined' && DashboardUtils.showToast) {
            DashboardUtils.showToast(message, type);
        } else if (window.DashboardUtils && window.DashboardUtils.showToast) {
            window.DashboardUtils.showToast(message, type);
        } else {
            // Fallback to console or alert
            console.log(`${type.toUpperCase()}: ${message}`);
            if (type === 'error') {
                alert('Error: ' + message);
            } else if (type === 'success') {
                alert('Success: ' + message);
            }
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the bookings manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a delay to ensure authentication is checked first
    setTimeout(() => {
        // Only initialize if we're on the bookings page and page hasn't been redirected
        if (document.getElementById('bookingsContainer') && document.body.innerHTML.includes('bookingsContainer')) {
            console.log('Initializing bookings manager...');
            window.bookingsManager = new CustomerBookingsManager();
        } else {
            console.log('Bookings container not found or page was replaced');
        }
    }, 500);
});
