// Availability Management JavaScript
class AvailabilityManager {
    constructor() {
        this.availability = [];
        this.currentAvailability = {};
        this.initialized = false;
        this.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        this.quickTimes = {
            morning: { start: '09:00', end: '12:00' },
            afternoon: { start: '13:00', end: '17:00' },
            evening: { start: '18:00', end: '21:00' },
            fullDay: { start: '09:00', end: '17:00' }
        };
    }

    async init() {
        if (this.initialized) {
            console.log('Availability manager already initialized');
            return;
        }

        try {
            console.log('Initializing availability manager...');
            await this.loadAvailability();
            this.setupEventListeners();
            this.initialized = true;
            console.log('Availability manager initialized successfully');
        } catch (error) {
            console.error('Error initializing availability manager:', error);
            this.showToast('Error loading availability data', 'error');
        }
    }

    setupEventListeners() {
        console.log('Setting up availability manager event listeners...');

        // Modal close button
        const closeBtn = document.getElementById('availabilityModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }        // Setup event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quick-time-btn')) {
                this.handleQuickTimeClick(e);
            } else if (e.target.matches('.bulk-btn')) {
                this.handleBulkActionClick(e);
            } else if (e.target.matches('.add-time-slot-btn') || e.target.closest('.add-time-slot-btn')) {
                this.handleAddTimeSlot(e);
            } else if (e.target.matches('.remove-time-slot-btn') || e.target.closest('.remove-time-slot-btn')) {
                this.handleRemoveTimeSlot(e);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.day-checkbox')) {
                this.handleDayToggle(e);
            } else if (e.target.matches('.time-input')) {
                this.handleTimeChange(e);
            }
        });
    }

    async loadAvailability() {
        try {
            console.log('Loading availability...');
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/availability', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.availability = result.data || [];
                this.processAvailabilityData();
                console.log('Availability loaded:', this.availability.length, 'records');
            } else {
                console.error('Failed to load availability:', response.status);
                this.availability = [];
            }
        } catch (error) {
            console.error('Error loading availability:', error);
            this.availability = [];
        }
    }    processAvailabilityData() {
        // Convert availability array to day-based object
        this.currentAvailability = {};
        this.dayActiveStates = {}; // Track which days are active
        
        this.availability.forEach(avail => {
            const day = avail.dayOfWeek.toLowerCase();
            if (!this.currentAvailability[day]) {
                this.currentAvailability[day] = [];
            }
            this.currentAvailability[day].push({
                id: avail.availability_id,
                startTime: avail.startTime,
                endTime: avail.endTime,
                isBooked: avail.availability_isBooked,
                isActive: avail.availability_isActive
            });
            
            // Set day as active if any slot is active
            if (avail.availability_isActive) {
                this.dayActiveStates[day] = true;
            }
        });

        console.log('Processed availability:', this.currentAvailability);
        console.log('Day active states:', this.dayActiveStates);
    }

    async loadAvailabilityForm() {
        const container = document.getElementById('availabilityForm');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="availability-loading">
                <div class="spinner"></div>
                <span>Loading your availability...</span>
            </div>
        `;

        try {
            // Load current availability if not already loaded
            if (this.availability.length === 0) {
                await this.loadAvailability();
            }

            // Load availability summary
            await this.loadAvailabilitySummary();

            container.innerHTML = this.generateAvailabilityForm();
            this.populateCurrentAvailability();
        } catch (error) {
            console.error('Error loading availability form:', error);
            container.innerHTML = `
                <div class="availability-message error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error loading availability data. Please try again.</span>
                </div>
            `;
        }
    }

    async loadAvailabilitySummary() {
        try {
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/availability/summary', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.availabilitySummary = result.data;
                console.log('Availability summary loaded:', this.availabilitySummary);
            }
        } catch (error) {
            console.error('Error loading availability summary:', error);
        }
    }    generateAvailabilityForm() {
        const summary = this.availabilitySummary || { 
            totalSlots: 0, 
            activeSlots: 0, 
            bookedSlots: 0, 
            availableSlots: 0, 
            configuredSlots: 0,
            activeDays: 0
        };
        
        return `
            <div class="availability-form">
                <!-- Availability Overview -->
                <div class="availability-overview">
                    <h4><i class="fas fa-clock"></i> Your Availability Overview</h4>
                    <div class="availability-stats">
                        <div class="availability-stat">
                            <h5>${summary.totalSlots}</h5>
                            <p>Total Configured</p>
                        </div>
                        <div class="availability-stat">
                            <h5>${summary.activeSlots}</h5>
                            <p>Active Slots</p>
                        </div>
                        <div class="availability-stat">
                            <h5>${summary.availableSlots}</h5>
                            <p>Available Now</p>
                        </div>
                        <div class="availability-stat">
                            <h5>${summary.bookedSlots}</h5>
                            <p>Booked Slots</p>
                        </div>
                        <div class="availability-stat">
                            <h5>${summary.configuredSlots || 0}</h5>
                            <p>Inactive Slots</p>
                        </div>
                        <div class="availability-stat">
                            <h5>${summary.activeDays}</h5>
                            <p>Active Days</p>
                        </div>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div class="bulk-actions">
                    <h5><i class="fas fa-magic"></i> Quick Actions</h5>
                    <div class="bulk-action-buttons">
                        <button type="button" class="bulk-btn" data-action="set-weekdays">
                            <i class="fas fa-briefcase"></i> Set Weekdays (9-5)
                        </button>
                        <button type="button" class="bulk-btn" data-action="set-all-days">
                            <i class="fas fa-calendar"></i> Set All Days
                        </button>
                        <button type="button" class="bulk-btn danger" data-action="clear-all">
                            <i class="fas fa-times"></i> Clear All
                        </button>
                    </div>
                </div>

                <!-- Days Configuration -->
                <div class="days-grid">
                    ${this.daysOfWeek.map(day => this.generateDayItem(day)).join('')}
                </div>

                <!-- Form Actions -->
                <div class="availability-form-actions">
                    <div class="action-group">
                        <button type="button" class="btn-availability secondary" onclick="window.availabilityManager.closeModal()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                    <div class="action-group">
                        <button type="button" class="btn-availability danger" onclick="window.availabilityManager.clearAllAvailability()">
                            <i class="fas fa-trash"></i> Clear All
                        </button>
                        <button type="button" class="btn-availability primary" onclick="window.availabilityManager.saveAvailability()">
                            <i class="fas fa-save"></i> Save Availability
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getActiveDaysCount() {
        let activeDays = 0;
        Object.keys(this.currentAvailability).forEach(day => {
            if (this.currentAvailability[day] && this.currentAvailability[day].length > 0) {
                activeDays++;
            }
        });
        return activeDays;
    }    generateDayItem(day) {
        const dayLower = day.toLowerCase();
        const daySlots = this.currentAvailability[dayLower] || [];
        const hasAvailability = daySlots.length > 0;
        const isActive = this.dayActiveStates && this.dayActiveStates[dayLower];

        return `
            <div class="day-item ${isActive ? 'active' : ''}" data-day="${dayLower}">
                <div class="day-header">
                    <label class="day-label">
                        <input type="checkbox" class="day-checkbox" data-day="${dayLower}" ${isActive ? 'checked' : ''}>
                        <span>${day}</span>
                    </label>
                    <div class="day-status ${isActive ? 'available' : hasAvailability ? 'configured' : 'unavailable'}">
                        ${hasAvailability ? 
                            `${daySlots.length} slot${daySlots.length > 1 ? 's' : ''} ${isActive ? '(Active)' : '(Inactive)'}` : 
                            'Unavailable'
                        }
                    </div>
                </div>
                
                <!-- Time Slots Container - Show if slots exist, regardless of active state -->
                <div class="time-slots-container" ${!hasAvailability ? 'style="display: none;"' : ''}>
                    <div class="time-slots-list" id="timeSlots-${dayLower}">
                        ${hasAvailability ? this.generateTimeSlots(dayLower, daySlots) : this.generateTimeSlots(dayLower, [])}
                    </div>
                    <button type="button" class="add-time-slot-btn" data-day="${dayLower}">
                        <i class="fas fa-plus"></i> Add Time Slot
                    </button>
                </div>
                
                <div class="quick-times">
                    <button type="button" class="quick-time-btn" data-day="${dayLower}" data-times="morning">
                        Morning (9-12)
                    </button>
                    <button type="button" class="quick-time-btn" data-day="${dayLower}" data-times="afternoon">
                        Afternoon (1-5)
                    </button>
                    <button type="button" class="quick-time-btn" data-day="${dayLower}" data-times="evening">
                        Evening (6-9)
                    </button>
                    <button type="button" class="quick-time-btn" data-day="${dayLower}" data-times="fullDay">
                        Full Day (9-5)
                    </button>
                </div>
            </div>
        `;
    }

    generateTimeSlots(day, slots) {
        if (slots.length === 0) {
            // Add one default slot
            return this.generateSingleTimeSlot(day, 0, { startTime: '09:00', endTime: '17:00' });
        }
        
        return slots.map((slot, index) => 
            this.generateSingleTimeSlot(day, index, slot)
        ).join('');
    }

    generateSingleTimeSlot(day, index, slot = { startTime: '09:00', endTime: '17:00' }) {
        return `
            <div class="time-slot" data-day="${day}" data-slot-index="${index}">
                <div class="time-inputs">
                    <div class="time-input-group">
                        <label class="time-input-label">Start Time</label>
                        <input type="time" class="time-input start-time" 
                               data-day="${day}" data-slot-index="${index}"
                               value="${slot.startTime}" 
                               min="07:00" max="20:00">
                    </div>
                    <div class="time-separator">to</div>
                    <div class="time-input-group">
                        <label class="time-input-label">End Time</label>
                        <input type="time" class="time-input end-time" 
                               data-day="${day}" data-slot-index="${index}"
                               value="${slot.endTime}"
                               min="07:00" max="20:00">
                    </div>
                    <button type="button" class="remove-time-slot-btn" 
                            data-day="${day}" data-slot-index="${index}"
                            ${index === 0 ? 'style="display: none;"' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${slot.isBooked ? `<div class="slot-status booked">Booked</div>` : ''}
            </div>
        `;
    }    populateCurrentAvailability() {
        // This method is called after the form is generated to ensure all elements exist
        this.daysOfWeek.forEach(day => {
            const dayLower = day.toLowerCase();
            const hasAvailability = this.currentAvailability[dayLower] && this.currentAvailability[dayLower].length > 0;
            const isActive = this.dayActiveStates[dayLower] || false;
            
            // Set checkbox state based on isActive, not just existence of slots
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            if (checkbox) {
                checkbox.checked = isActive;
            }
            
            if (hasAvailability) {
                this.updateDayDisplay(dayLower, isActive);
            }
        });
    }

    handleDayToggle(event) {
        const day = event.target.dataset.day;
        const isChecked = event.target.checked;
        
        this.updateDayDisplay(day, isChecked);
    }    updateDayDisplay(day, isAvailable) {
        const dayItem = document.querySelector(`.day-item[data-day="${day}"]`);
        const timeSlotsContainer = dayItem.querySelector('.time-slots-container');
        const statusElement = dayItem.querySelector('.day-status');
        const timeSlots = dayItem.querySelectorAll('.time-slot');
        const hasTimeSlots = timeSlots.length > 0;
        
        if (isAvailable) {
            dayItem.classList.add('active');
            
            // Always show time slots container if slots exist or day is active
            if (hasTimeSlots || isAvailable) {
                timeSlotsContainer.style.display = 'block';
            }
            
            // Enable all time inputs for this day
            dayItem.querySelectorAll('.time-input').forEach(input => {
                input.disabled = false;
            });
            
            this.updateDayStatus(day);
        } else {
            dayItem.classList.remove('active');
            
            // Keep time slots visible if they exist, just mark as inactive
            if (hasTimeSlots) {
                timeSlotsContainer.style.display = 'block';
                
                // Keep inputs enabled so user can still edit
                dayItem.querySelectorAll('.time-input').forEach(input => {
                    input.disabled = false;
                });
                
                // Update status to show slots exist but are inactive
                const slotsText = timeSlots.length === 1 ? 'slot' : 'slots';
                statusElement.textContent = `${timeSlots.length} ${slotsText} (Inactive)`;
                statusElement.className = 'day-status configured';
            } else {
                timeSlotsContainer.style.display = 'none';
                statusElement.textContent = 'Unavailable';
                statusElement.className = 'day-status unavailable';
            }
        }
    }    updateDayStatus(day) {
        const dayItem = document.querySelector(`.day-item[data-day="${day}"]`);
        const statusElement = dayItem.querySelector('.day-status');
        const timeSlots = dayItem.querySelectorAll('.time-slot');
        const checkbox = dayItem.querySelector('.day-checkbox');
        const isActive = checkbox.checked;
        
        if (timeSlots.length > 0) {
            const slotsText = timeSlots.length === 1 ? 'slot' : 'slots';
            if (isActive) {
                statusElement.textContent = `${timeSlots.length} ${slotsText} (Active)`;
                statusElement.className = 'day-status available';
            } else {
                statusElement.textContent = `${timeSlots.length} ${slotsText} (Inactive)`;
                statusElement.className = 'day-status configured';
            }
        } else {
            statusElement.textContent = 'Unavailable';
            statusElement.className = 'day-status unavailable';
        }
    }handleTimeChange(event) {
        const input = event.target;
        const day = input.dataset.day;
        const slotIndex = input.dataset.slotIndex;
        const isStartTime = input.classList.contains('start-time');
        
        // Validate time is within allowed range (7 AM - 8 PM)
        const time = input.value;
        if (time) {
            if (!this.validateTimeRange(time, input)) {
                this.updateValidationVisuals(day);
                return;
            }
        }
        
        // Find the corresponding time slot
        const timeSlot = document.querySelector(`.time-slot[data-day="${day}"][data-slot-index="${slotIndex}"]`);
        if (!timeSlot) return;
        
        const startTimeInput = timeSlot.querySelector('.start-time');
        const endTimeInput = timeSlot.querySelector('.end-time');
        
        // Validate duration and time logic
        if (startTimeInput.value && endTimeInput.value) {
            if (!this.validateSlotDuration(startTimeInput, endTimeInput, isStartTime, input)) {
                this.updateValidationVisuals(day);
                return;
            }
        }
        
        // Update visual validation
        this.updateValidationVisuals(day);
        
        // Update day status
        this.updateDayStatus(day);
    }

    validateTimeRange(time, input) {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        
        // Check if time is within 7:00 AM - 8:00 PM (420 - 1200 minutes)
        if (timeInMinutes < 420) { // 7:00 AM
            this.showToast('⚠️ Time cannot be earlier than 7:00 AM', 'error');
            input.value = '07:00';
            return false;
        }
        if (timeInMinutes > 1200) { // 8:00 PM
            this.showToast('⚠️ Time cannot be later than 8:00 PM. Our service hours are 7 AM - 8 PM.', 'error');
            input.value = '20:00';
            return false;
        }
        return true;
    }

    validateSlotDuration(startTimeInput, endTimeInput, isStartTime, changedInput) {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startInMinutes = startHours * 60 + startMinutes;
        const endInMinutes = endHours * 60 + endMinutes;
        const durationInMinutes = endInMinutes - startInMinutes;
        
        // Check if end time is after start time
        if (durationInMinutes <= 0) {
            this.showToast('❌ End time must be after start time', 'error');
            this.adjustTimeForOrder(startTimeInput, endTimeInput, isStartTime, changedInput);
            return false;
        }
        
        // Check minimum duration (1 hour = 60 minutes)
        if (durationInMinutes < 60) {
            this.showToast('⚠️ Time slot must be at least 1 hour long', 'error');
            this.adjustTimeForDuration(startTimeInput, endTimeInput, isStartTime, changedInput);
            return false;
        }
        
        return true;
    }

    adjustTimeForOrder(startTimeInput, endTimeInput, isStartTime, changedInput) {
        if (isStartTime) {
            // If start time was changed, adjust it to be 1 hour before end time
            const [endHours, endMinutes] = endTimeInput.value.split(':').map(Number);
            const endInMinutes = endHours * 60 + endMinutes;
            const newStartInMinutes = Math.max(420, endInMinutes - 60); // At least 7:00 AM
            
            const newStartHours = Math.floor(newStartInMinutes / 60);
            const newStartMinutes = newStartInMinutes % 60;
            changedInput.value = `${newStartHours.toString().padStart(2, '0')}:${newStartMinutes.toString().padStart(2, '0')}`;
        } else {
            // If end time was changed, adjust it to be 1 hour after start time
            const [startHours, startMinutes] = startTimeInput.value.split(':').map(Number);
            const startInMinutes = startHours * 60 + startMinutes;
            const newEndInMinutes = Math.min(1200, startInMinutes + 60); // At most 8:00 PM
            
            const newEndHours = Math.floor(newEndInMinutes / 60);
            const newEndMinutes = newEndInMinutes % 60;
            changedInput.value = `${newEndHours.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}`;
        }
    }

    adjustTimeForDuration(startTimeInput, endTimeInput, isStartTime, changedInput) {
        if (isStartTime) {
            // If start time was changed, adjust end time to maintain 1 hour duration
            const [startHours, startMinutes] = changedInput.value.split(':').map(Number);
            const startInMinutes = startHours * 60 + startMinutes;
            const newEndInMinutes = Math.min(1200, startInMinutes + 60); // At most 8:00 PM
            
            const newEndHours = Math.floor(newEndInMinutes / 60);
            const newEndMinutes = newEndInMinutes % 60;
            endTimeInput.value = `${newEndHours.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}`;
        } else {
            // If end time was changed, adjust start time to maintain 1 hour duration
            const [endHours, endMinutes] = changedInput.value.split(':').map(Number);
            const endInMinutes = endHours * 60 + endMinutes;
            const newStartInMinutes = Math.max(420, endInMinutes - 60); // At least 7:00 AM
            
            const newStartHours = Math.floor(newStartInMinutes / 60);
            const newStartMinutes = newStartInMinutes % 60;
            startTimeInput.value = `${newStartHours.toString().padStart(2, '0')}:${newStartMinutes.toString().padStart(2, '0')}`;
        }
    }    validateDuplicateSlots(day) {
        const timeSlots = document.querySelectorAll(`.time-slot[data-day="${day}"]`);
        const slots = [];
        const duplicates = new Set();
        const duplicateRanges = [];
        
        // Collect all time slots for this day
        timeSlots.forEach((slot, index) => {
            const startTime = slot.querySelector('.start-time').value;
            const endTime = slot.querySelector('.end-time').value;
            
            if (startTime && endTime) {
                const timeRange = `${startTime}-${endTime}`;
                
                // Check if this exact time range already exists
                const existingSlot = slots.find(s => s.timeRange === timeRange);
                if (existingSlot) {
                    duplicates.add(existingSlot.index);
                    duplicates.add(index);
                    
                    // Highlight duplicate slots
                    slot.style.borderColor = '#dc3545';
                    slot.style.backgroundColor = '#fff5f5';
                    existingSlot.element.style.borderColor = '#dc3545';
                    existingSlot.element.style.backgroundColor = '#fff5f5';
                    
                    // Track duplicate range for error message
                    if (!duplicateRanges.includes(timeRange)) {
                        duplicateRanges.push(timeRange);
                    }
                } else {
                    // Reset styling for non-duplicate slots
                    slot.style.borderColor = '#e9ecef';
                    slot.style.backgroundColor = 'white';
                }
                
                slots.push({
                    timeRange,
                    startTime,
                    endTime,
                    element: slot,
                    index
                });
            }
        });
        
        return duplicates.size === 0;
    }    validateSlotOverlaps(day) {
        const timeSlots = document.querySelectorAll(`.time-slot[data-day="${day}"]`);
        const slots = [];
        
        // Collect all time slots for this day
        timeSlots.forEach((slot, index) => {
            const startTime = slot.querySelector('.start-time').value;
            const endTime = slot.querySelector('.end-time').value;
            
            if (startTime && endTime) {
                const [startHours, startMinutes] = startTime.split(':').map(Number);
                const [endHours, endMinutes] = endTime.split(':').map(Number);
                
                slots.push({
                    startMinutes: startHours * 60 + startMinutes,
                    endMinutes: endHours * 60 + endMinutes,
                    startTime,
                    endTime,
                    element: slot,
                    index
                });
            }
        });
        
        // Sort slots by start time
        slots.sort((a, b) => a.startMinutes - b.startMinutes);
        
        // Reset all slot styling first
        slots.forEach(slot => {
            slot.element.style.borderColor = '#e9ecef';
            slot.element.style.backgroundColor = 'white';
        });
        
        // Check for overlaps
        let hasOverlap = false;
        
        for (let i = 0; i < slots.length - 1; i++) {
            const currentSlot = slots[i];
            const nextSlot = slots[i + 1];
            
            // Check if current slot ends after next slot starts (overlap condition)
            if (currentSlot.endMinutes > nextSlot.startMinutes) {
                hasOverlap = true;
                
                // Highlight overlapping slots
                currentSlot.element.style.borderColor = '#dc3545';
                currentSlot.element.style.backgroundColor = '#fff5f5';
                nextSlot.element.style.borderColor = '#dc3545';
                nextSlot.element.style.backgroundColor = '#fff5f5';
            }
        }
        
        return !hasOverlap;
    }handleQuickTimeClick(event) {
        const day = event.target.dataset.day;
        const timesKey = event.target.dataset.times;
        const times = this.quickTimes[timesKey];
        
        if (!times) return;
        
        // Enable the day if not already enabled
        const checkbox = document.querySelector(`.day-checkbox[data-day="${day}"]`);
        if (!checkbox.checked) {
            checkbox.checked = true;
            this.updateDayDisplay(day, true);
        }
        
        // Clear existing slots
        const timeSlotsList = document.getElementById(`timeSlots-${day}`);
        if (timeSlotsList) {
            timeSlotsList.innerHTML = '';
        }
        
        // Add the quick time slot based on the button clicked
        let slotsToAdd = [];
        
        switch (timesKey) {
            case 'morning':
                slotsToAdd = [{ startTime: '09:00', endTime: '12:00' }];
                break;
            case 'afternoon':
                slotsToAdd = [{ startTime: '13:00', endTime: '17:00' }];
                break;
            case 'evening':
                slotsToAdd = [{ startTime: '18:00', endTime: '21:00' }];
                break;
            case 'fullDay':
                slotsToAdd = [
                    { startTime: '09:00', endTime: '12:00' },
                    { startTime: '13:00', endTime: '17:00' }
                ];
                break;
        }
        
        // Add the slots
        slotsToAdd.forEach((slot, index) => {
            const slotHtml = this.generateSingleTimeSlot(day, index, slot);
            timeSlotsList.insertAdjacentHTML('beforeend', slotHtml);
        });
        
        // Show remove buttons if more than one slot
        if (slotsToAdd.length > 1) {
            timeSlotsList.querySelectorAll('.remove-time-slot-btn').forEach(btn => {
                btn.style.display = 'flex';
            });
        }
        
        this.updateDayStatus(day);
    }

    handleBulkActionClick(event) {
        const action = event.target.dataset.action;
        
        switch (action) {
            case 'set-weekdays':
                this.setWeekdayHours();
                break;
            case 'set-all-days':
                this.setAllDayHours();
                break;
            case 'clear-all':
                this.clearAllAvailability();
                break;
        }
    }    setWeekdayHours() {
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        weekdays.forEach(day => {
            const checkbox = document.querySelector(`.day-checkbox[data-day="${day}"]`);
            const timeSlotsList = document.getElementById(`timeSlots-${day}`);
            
            // Enable the day
            checkbox.checked = true;
            this.updateDayDisplay(day, true);
            
            // Clear existing slots and add a single 9-5 slot
            if (timeSlotsList) {
                timeSlotsList.innerHTML = this.generateSingleTimeSlot(day, 0, { 
                    startTime: '09:00', 
                    endTime: '17:00' 
                });
            }
            
            this.updateDayStatus(day);
        });
        
        this.showToast('Weekday hours set to 9 AM - 5 PM', 'success');
    }

    setAllDayHours() {
        this.daysOfWeek.forEach(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            const timeSlotsList = document.getElementById(`timeSlots-${dayLower}`);
            
            // Enable the day
            checkbox.checked = true;
            this.updateDayDisplay(dayLower, true);
            
            // Clear existing slots and add a single 9-5 slot
            if (timeSlotsList) {
                timeSlotsList.innerHTML = this.generateSingleTimeSlot(dayLower, 0, { 
                    startTime: '09:00', 
                    endTime: '17:00' 
                });
            }
            
            this.updateDayStatus(dayLower);
        });
        
        this.showToast('All days set to 9 AM - 5 PM', 'success');
    }

    clearAllAvailability() {
        if (!confirm('Are you sure you want to clear all availability? This action cannot be undone.')) {
            return;
        }
        
        this.daysOfWeek.forEach(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            
            checkbox.checked = false;
            this.updateDayDisplay(dayLower, false);
        });
        
        this.showToast('All availability cleared', 'info');
    }

    /**
     * Comprehensive validation of all availability data before saving
     */
    validateAllAvailability() {
        let isValid = true;
        let errorMessages = [];
        let warningMessages = [];
        
        // Check each enabled day
        this.daysOfWeek.forEach(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            const timeSlots = document.querySelectorAll(`.time-slot[data-day="${dayLower}"]`);
            
            if (checkbox.checked && timeSlots.length > 0) {
                // Validate each time slot on this day
                const daySlots = [];
                let dayHasErrors = false;
                
                timeSlots.forEach(slot => {
                    const startTimeInput = slot.querySelector('.start-time');
                    const endTimeInput = slot.querySelector('.end-time');
                    
                    if (!startTimeInput.value || !endTimeInput.value) {
                        errorMessages.push(`${day}: Empty time slot detected`);
                        dayHasErrors = true;
                        isValid = false;
                        return;
                    }
                    
                    const startTime = startTimeInput.value;
                    const endTime = endTimeInput.value;
                    
                    // Validate time range
                    if (!this.isTimeInRange(startTime) || !this.isTimeInRange(endTime)) {
                        errorMessages.push(`${day}: Time slots must be between 7:00 AM and 8:00 PM`);
                        dayHasErrors = true;
                        isValid = false;
                    }
                    
                    // Validate duration
                    const duration = this.calculateDuration(startTime, endTime);
                    if (duration <= 0) {
                        errorMessages.push(`${day}: End time must be after start time`);
                        dayHasErrors = true;
                        isValid = false;
                    } else if (duration < 60) {
                        errorMessages.push(`${day}: Time slots must be at least 1 hour long`);
                        dayHasErrors = true;
                        isValid = false;
                    }
                    
                    daySlots.push({
                        startTime,
                        endTime,
                        startMinutes: this.timeToMinutes(startTime),
                        endMinutes: this.timeToMinutes(endTime)
                    });
                });
                
                if (!dayHasErrors && daySlots.length > 0) {
                    // Check for duplicates
                    const duplicates = this.findDuplicateSlots(daySlots);
                    if (duplicates.length > 0) {
                        errorMessages.push(`${day}: Duplicate time slots found - ${duplicates.join(', ')}`);
                        isValid = false;
                    }
                    
                    // Check for overlaps
                    const overlaps = this.findOverlappingSlots(daySlots);
                    if (overlaps.length > 0) {
                        errorMessages.push(`${day}: Overlapping time slots found - ${overlaps.join(', ')}`);
                        isValid = false;
                    }
                    
                    // Warning for too many slots
                    if (daySlots.length > 6) {
                        warningMessages.push(`${day}: Consider consolidating ${daySlots.length} time slots for better scheduling`);
                    }
                }
            }
        });
        
        // Check if any days are enabled
        const enabledDays = this.daysOfWeek.filter(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            return checkbox.checked;
        });
        
        if (enabledDays.length === 0) {
            warningMessages.push('No availability set - this will clear all your working hours');
        }
        
        return {
            isValid,
            errorMessages,
            warningMessages,
            enabledDaysCount: enabledDays.length
        };
    }

    /**
     * Helper functions for validation
     */
    isTimeInRange(time) {
        const minutes = this.timeToMinutes(time);
        return minutes >= 420 && minutes <= 1200; // 7:00 AM to 8:00 PM
    }

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    calculateDuration(startTime, endTime) {
        return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
    }

    findDuplicateSlots(slots) {
        const duplicates = [];
        const seen = new Set();
        
        slots.forEach(slot => {
            const timeRange = `${slot.startTime}-${slot.endTime}`;
            if (seen.has(timeRange)) {
                duplicates.push(timeRange);
            } else {
                seen.add(timeRange);
            }
        });
        
        return duplicates;
    }

    findOverlappingSlots(slots) {
        const overlaps = [];
        const sortedSlots = [...slots].sort((a, b) => a.startMinutes - b.startMinutes);
        
        for (let i = 0; i < sortedSlots.length - 1; i++) {
            const current = sortedSlots[i];
            const next = sortedSlots[i + 1];
            
            if (current.endMinutes > next.startMinutes) {
                overlaps.push(`${current.startTime}-${current.endTime} ↔ ${next.startTime}-${next.endTime}`);
            }
        }
        
        return overlaps;
    }

    async saveAvailability() {
        try {
            console.log('Validating availability before saving...');
            
            // Comprehensive validation
            const validation = this.validateAllAvailability();
            
            if (!validation.isValid) {
                // Show all error messages
                const errorMsg = validation.errorMessages.join('\n• ');
                this.showToast(`❌ Please fix the following issues:\n• ${errorMsg}`, 'error');
                return;
            }
            
            // Show warnings and get confirmation
            if (validation.warningMessages.length > 0) {
                const warningMsg = validation.warningMessages.join('\n• ');
                if (!confirm(`⚠️ Please note:\n• ${warningMsg}\n\nDo you want to continue?`)) {
                    return;
                }
            }
            
            console.log('Saving availability...');
            
            const availabilityData = this.collectAvailabilityData();
            
            // Additional check for empty availability
            if (availabilityData.filter(slot => slot.isAvailable).length === 0) {
                if (!confirm('You have not set any availability. This will clear all your working hours. Continue?')) {
                    return;
                }
            }
            
            const token = localStorage.getItem('fixmo_provider_token');
            
            const response = await fetch('/api/availability', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ availabilityData })
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('✅ Availability saved successfully!', 'success');
                this.closeModal();
                
                // Reload availability data
                await this.loadAvailability();
                
                // Update dashboard summary if available
                if (window.providerDashboard) {
                    window.providerDashboard.loadAvailabilitySummary();
                }
            } else {
                const error = await response.json();
                this.showToast(`❌ ${error.message || 'Error saving availability'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving availability:', error);
            this.showToast('❌ Error saving availability. Please try again.', 'error');
        }
    }    collectAvailabilityData() {
        const availabilityData = [];
        
        this.daysOfWeek.forEach(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.querySelector(`.day-checkbox[data-day="${dayLower}"]`);
            const timeSlots = document.querySelectorAll(`.time-slot[data-day="${dayLower}"]`);
            
            // Always collect time slots if they exist, regardless of checkbox state
            if (timeSlots.length > 0) {
                // Collect all time slots for this day
                timeSlots.forEach(slot => {
                    const startTimeInput = slot.querySelector('.start-time');
                    const endTimeInput = slot.querySelector('.end-time');
                    
                    if (startTimeInput.value && endTimeInput.value) {
                        availabilityData.push({
                            dayOfWeek: day,
                            isAvailable: checkbox.checked, // Save the checkbox state
                            startTime: startTimeInput.value,
                            endTime: endTimeInput.value
                        });
                    }
                });
            } else if (!checkbox.checked) {
                // Only add "unavailable" record if day is unchecked AND has no time slots
                availabilityData.push({
                    dayOfWeek: day,
                    isAvailable: false,
                    startTime: null,
                    endTime: null
                });
            }
        });
        
        console.log('Collected availability data:', availabilityData);
        return availabilityData;
    }closeModal() {
        const modal = document.getElementById('availabilityModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Provide real-time visual validation feedback
     */
    updateValidationVisuals(day) {
        const dayItem = document.querySelector(`.day-item[data-day="${day}"]`);
        const timeSlots = document.querySelectorAll(`.time-slot[data-day="${day}"]`);
        
        if (!dayItem) return;
        
        let dayHasErrors = false;
        let dayHasWarnings = false;
        
        // Reset all slot styles first
        timeSlots.forEach(slot => {
            slot.classList.remove('has-error', 'has-warning', 'valid');
        });
        
        // Validate each slot
        timeSlots.forEach(slot => {
            const startTimeInput = slot.querySelector('.start-time');
            const endTimeInput = slot.querySelector('.end-time');
            
            if (!startTimeInput.value || !endTimeInput.value) {
                slot.classList.add('has-error');
                dayHasErrors = true;
                return;
            }
            
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            
            // Check time range
            if (!this.isTimeInRange(startTime) || !this.isTimeInRange(endTime)) {
                slot.classList.add('has-error');
                dayHasErrors = true;
                return;
            }
            
            // Check duration
            const duration = this.calculateDuration(startTime, endTime);
            if (duration <= 0) {
                slot.classList.add('has-error');
                dayHasErrors = true;
                return;
            } else if (duration < 60) {
                slot.classList.add('has-error');
                dayHasErrors = true;
                return;
            }
            
            // If we get here, the slot is valid
            slot.classList.add('valid');
        });
        
        // Check for duplicates and overlaps
        if (!dayHasErrors) {
            const duplicatesValid = this.validateDuplicateSlots(day);
            const overlapsValid = this.validateSlotOverlaps(day);
            
            if (!duplicatesValid || !overlapsValid) {
                dayHasErrors = true;
            }
        }
        
        // Check for warnings (too many slots)
        if (!dayHasErrors && timeSlots.length > 6) {
            dayHasWarnings = true;
        }
        
        // Apply day-level styling
        dayItem.classList.remove('has-errors', 'has-warnings', 'valid');
        if (dayHasErrors) {
            dayItem.classList.add('has-errors');
        } else if (dayHasWarnings) {
            dayItem.classList.add('has-warnings');
        } else if (timeSlots.length > 0) {
            dayItem.classList.add('valid');
        }
    }

    /**
     * Enhanced toast with better formatting for multiple messages
     */
    showToast(message, type = 'info', duration = 5000) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Determine icon based on type
        let icon = 'info-circle';
        switch(type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
        }
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to container
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Auto remove after specified duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
    }    handleAddTimeSlot(event) {
        const btn = event.target.closest('.add-time-slot-btn');
        const day = btn.dataset.day;
        const timeSlotsList = document.getElementById(`timeSlots-${day}`);
        
        if (!timeSlotsList) return;
        
        const currentSlots = timeSlotsList.querySelectorAll('.time-slot');
          // Check maximum slots limit (7 AM to 8 PM = max ~13 hours, reasonable limit of 8 slots)
        if (currentSlots.length >= 8) {
            this.showToast('⚠️ Maximum 8 time slots allowed per day', 'warning');
            return;
        }
        
        // Validate existing slots before adding new one
        if (!this.validateDuplicateSlots(day) || !this.validateSlotOverlaps(day)) {
            this.showToast('❌ Please fix existing time slot issues before adding new slots', 'error');
            return;
        }
        
        const newIndex = currentSlots.length;
        
        // Find a good default time that doesn't conflict
        let defaultStartTime = '09:00';
        let defaultEndTime = '17:00';
        
        if (currentSlots.length > 0) {
            // Find the latest end time and suggest next available slot
            let latestEndTime = '07:00';
            currentSlots.forEach(slot => {
                const endTime = slot.querySelector('.end-time').value;
                if (endTime && endTime > latestEndTime) {
                    latestEndTime = endTime;
                }
            });
            
            // Suggest time starting 1 hour after the latest end time
            const latestHour = parseInt(latestEndTime.split(':')[0]);
            const latestMinute = parseInt(latestEndTime.split(':')[1]);
            let newStartHour = latestHour + 1;
            
            if (newStartHour <= 19) { // Make sure we don't go past 8 PM
                defaultStartTime = `${newStartHour.toString().padStart(2, '0')}:${latestMinute.toString().padStart(2, '0')}`;
                defaultEndTime = `${Math.min(20, newStartHour + 1).toString().padStart(2, '0')}:${latestMinute.toString().padStart(2, '0')}`;
            }
        }
        
        const newSlotHtml = this.generateSingleTimeSlot(day, newIndex, { 
            startTime: defaultStartTime, 
            endTime: defaultEndTime 
        });
        
        timeSlotsList.insertAdjacentHTML('beforeend', newSlotHtml);
        
        // Show remove buttons for all slots if more than 1
        if (newIndex > 0) {
            timeSlotsList.querySelectorAll('.remove-time-slot-btn').forEach(btn => {
                btn.style.display = 'flex';
            });
        }
          this.updateDayStatus(day);
        this.updateValidationVisuals(day);
        this.showToast('✅ New time slot added', 'success', 3000);
    }

    handleRemoveTimeSlot(event) {
        const btn = event.target.closest('.remove-time-slot-btn');
        const day = btn.dataset.day;
        const slotIndex = parseInt(btn.dataset.slotIndex);
        const timeSlot = btn.closest('.time-slot');
        const timeSlotsList = document.getElementById(`timeSlots-${day}`);
        
        if (!timeSlot || !timeSlotsList) return;
        
        // Remove the slot
        timeSlot.remove();
        
        // Re-index remaining slots
        const remainingSlots = timeSlotsList.querySelectorAll('.time-slot');
        remainingSlots.forEach((slot, index) => {
            slot.dataset.slotIndex = index;
            slot.querySelectorAll('[data-slot-index]').forEach(element => {
                element.dataset.slotIndex = index;
            });
        });
          // Hide remove button for first slot if only one remains
        if (remainingSlots.length === 1) {
            const firstRemoveBtn = remainingSlots[0].querySelector('.remove-time-slot-btn');
            if (firstRemoveBtn) {
                firstRemoveBtn.style.display = 'none';
            }
        }
        
        this.updateDayStatus(day);
        this.updateValidationVisuals(day);
        this.showToast('Time slot removed', 'info', 3000);
    }
}

// Ensure global availability
window.AvailabilityManager = AvailabilityManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('AvailabilityManager class is available globally');
    if (!window.availabilityManager) {
        console.log('AvailabilityManager instance will be created by dashboard');
    }
});
