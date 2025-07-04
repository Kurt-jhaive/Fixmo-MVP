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

        card.innerHTML = `
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
                        <!-- Starting price from serviceListing table -->
                        <span>Starting from ₱${booking.service.startingPrice.toFixed(2)}</span>
                        <!-- Final price from appointment table, updated by service provider when completed -->
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
        `;

        return card;
    }

    renderBookingActions(booking) {
        // Determine actions based on appointment status
        const canCall = ['accepted', 'approved', 'confirmed', 'on the way', 'in progress'].includes(booking.appointment_status);
        const canCancel = ['pending', 'accepted', 'approved', 'confirmed'].includes(booking.appointment_status);
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
        const allowedStatuses = ['pending', 'accepted', 'approved', 'confirmed', 'on the way', 'in progress', 'completed'];
        
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
        // Filter bookings to show all active appointment statuses
        const allowedStatuses = ['pending', 'accepted', 'approved', 'confirmed', 'on the way', 'in progress', 'completed'];
        const validBookings = this.bookings.filter(b => allowedStatuses.includes(b.appointment_status));
        
        const totalBookings = validBookings.length;
        const activeBookings = validBookings.filter(b => 
            ['pending', 'accepted', 'approved', 'confirmed', 'on the way', 'in progress'].includes(b.appointment_status)
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

            const data = await DashboardUtils.makeRequest(`/auth/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancellation_reason: cancellationReason
                })
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
                    <button class="btn modern-btn danger" id="confirmCancelBtn" disabled onclick="window.bookingsManager.cancelBooking('${bookingId}'); this.closest('.modal').remove();">
                        <i class="fas fa-ban"></i>
                        Cancel Booking
                    </button>
                </div>
            </div>
        `;
        
        // Add modern styles (same as dashboard)
        if (!document.querySelector('#modern-cancel-styles')) {
            const style = document.createElement('style');
            style.id = 'modern-cancel-styles';
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
        }
        
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
            'accepted': 'accepted',
            'approved': 'accepted',
            'confirmed': 'accepted',
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
            'accepted': 'Accepted',
            'approved': 'Approved',
            'confirmed': 'Confirmed',
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
