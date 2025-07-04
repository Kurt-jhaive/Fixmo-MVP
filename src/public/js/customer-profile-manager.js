// Customer Profile Manager for Customer Dashboard
class CustomerProfileManager {
    constructor() {
        this.currentCustomer = null;
        this.isEditMode = false;
        this.otpTimer = null;
        this.otpCountdown = 0;
        this.currentOtpStep = null; // Track current OTP verification step
        this.token = localStorage.getItem('fixmo_customer_token'); // Get token from localStorage
        this.eventListenerAdded = false;
        this.init();
    }

    async init() {
        console.log('CustomerProfileManager init called');
        // Try to get customer data from the main dashboard first
        if (window.dashboard && window.dashboard.customerData) {
            this.currentCustomer = window.dashboard.customerData;
            console.log('Using customer data from dashboard:', this.currentCustomer);
        } else if (!this.currentCustomer) {
            console.log('No customer data available, attempting to fetch...');
            await this.loadCustomerData();
        } else {
            console.log('Using existing customer data:', this.currentCustomer);
        }
        
        this.setupEventListeners();
        this.renderStaticProfile();
    }

    async loadCustomerData() {
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            });

            if (response.ok) {
                this.currentCustomer = await response.json();
                console.log('Customer data loaded:', this.currentCustomer);
            } else {
                throw new Error('Failed to load customer data');
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
            this.showToast('Error loading profile data', 'error');
        }
    }

    setupEventListeners() {
        console.log('Setting up CustomerProfileManager event listeners');
        
        if (!this.eventListenerAdded) {
            // Edit Profile Button
            document.addEventListener('click', (e) => {
                console.log('Document click detected:', e.target.id, e.target.className);
                
                if (e.target.id === 'editProfileBtn') {
                    console.log('Edit Profile button clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Check if we're in cancel mode or edit mode
                    if (e.target.classList.contains('cancel-mode')) {
                        console.log('Cancel mode detected');
                        this.cancelEdit();
                    } else {
                        console.log('Edit mode detected');
                        this.toggleEditMode();
                    }
                    return;
                }
                
                if (e.target.id === 'saveProfileBtn') {
                    console.log('Save Profile button clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleProfileUpdate();
                    return;
                }

                // OTP Modal Events
                if (e.target.id === 'closeOtpModal') {
                    this.closeOtpModal();
                    return;
                }
                
                if (e.target.id === 'verifyOtpBtn') {
                    this.verifyOtp();
                    return;
                }
                
                if (e.target.id === 'resendOtpBtn') {
                    this.resendOtp();
                    return;
                }
            });
            
            this.eventListenerAdded = true;
        }
    }

    renderStaticProfile() {
        console.log('renderStaticProfile called');
        const container = document.getElementById('profileContainer');
        if (!container) {
            console.warn('Profile section not found');
            return;
        }
        
        if (!this.currentCustomer) {
            console.warn('No customer data available');
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading profile</h3>
                    <p>No profile data available. Please try refreshing the page.</p>
                </div>
            `;
            return;
        }

        console.log('Rendering profile with data:', this.currentCustomer);

        const profilePhotoUrl = this.currentCustomer.profile_photo 
            ? `/${this.currentCustomer.profile_photo}`
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzUiIGZpbGw9IiNlMGU3ZmYiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIyNSIgZmlsbD0iIzk5YWVmZiIvPjxwYXRoIGQ9Ik00MCAyMDVjMC0zMyAyNy02MCA2MC02MHM2MCAyNyA2MCA2MHYyMEg0MHYtMjB6IiBmaWxsPSIjOTlhZWZmIi8+PC9zdmc+';

        container.innerHTML = `
            <div class="modern-profile-container">
                <!-- Profile Header with Photo -->
                <div class="profile-header">
                    <div class="profile-photo-container">
                        <div class="profile-photo-wrapper">
                            <img src="${profilePhotoUrl}" 
                                 alt="Profile Photo" 
                                 class="profile-photo"
                                 id="profilePhotoDisplay">
                            <div class="photo-overlay" id="photoOverlay" style="display: none;">
                                <i class="fas fa-camera"></i>
                                <span>Change Photo</span>
                            </div>
                        </div>
                        <input type="file" id="profilePhotoInput" accept="image/*" style="display: none;">
                    </div>
                    <div class="profile-info-header">
                        <h2>${this.currentCustomer.first_name} ${this.currentCustomer.last_name}</h2>
                        <p class="provider-email">${this.currentCustomer.email}</p>
                        <div class="verification-status">
                            <i class="fas fa-shield-alt ${this.currentCustomer.is_verified ? 'verified' : 'unverified'}"></i>
                            <span>${this.currentCustomer.is_verified ? 'Verified Customer' : 'Pending Verification'}</span>
                        </div>
                    </div>
                </div>

                <!-- Profile Details Grid -->
                <div class="profile-details-grid">
                    <!-- Static Information Card -->
                    <div class="profile-card">
                        <div class="card-header">
                            <h3>Basic Information</h3>
                            <span class="readonly-badge">Read Only</span>
                        </div>
                        <div class="card-content">
                            <div class="field-group">
                                <label>First Name</label>
                                <div class="field-value">${this.currentCustomer.first_name}</div>
                            </div>
                            <div class="field-group">
                                <label>Last Name</label>
                                <div class="field-value">${this.currentCustomer.last_name}</div>
                            </div>
                            <div class="field-group">
                                <label>Birthday</label>
                                <div class="field-value">${this.currentCustomer.birthday ? new Date(this.currentCustomer.birthday).toLocaleDateString() : 'Not provided'}</div>
                            </div>
                            <div class="field-group">
                                <label>Location/Address</label>
                                <div class="field-value">${this.currentCustomer.user_location || 'Not provided'}</div>
                            </div>
                            <div class="field-group">
                                <label>Username</label>
                                <div class="field-value">${this.currentCustomer.userName}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Editable Information Card -->
                    <div class="profile-card">
                        <div class="card-header">
                            <h3>Contact Information</h3>
                            <button class="edit-btn" id="editProfileBtn">
                                <i class="fas fa-edit"></i>
                                Edit Profile
                            </button>
                        </div>
                        <div class="card-content" id="editableContent">
                            <div class="field-group">
                                <label>Email Address</label>
                                <div class="field-value" id="emailDisplay">${this.currentCustomer.email}</div>
                                <input type="email" class="field-input" id="emailInput" value="${this.currentCustomer.email}" style="display: none;">
                            </div>
                            <div class="field-group">
                                <label>Phone Number</label>
                                <div class="field-value" id="phoneDisplay">${this.currentCustomer.phone_number || 'Not provided'}</div>
                                <input type="tel" class="field-input" id="phoneInput" value="${this.currentCustomer.phone_number || ''}" style="display: none;">
                            </div>
                        </div>
                        
                        <!-- Edit Actions (Hidden by default) -->
                        <div class="edit-actions" id="editActions" style="display: none;">
                            <button class="btn-secondary" id="cancelEditBtn">
                                <i class="fas fa-times"></i>
                                Cancel
                            </button>
                            <button class="btn-primary" id="saveProfileBtn">
                                <i class="fas fa-save"></i>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- OTP Verification Modal -->
            <div id="otpModal" class="modal-overlay" style="display: none;">
                <div class="modal-content otp-modal">
                    <div class="modal-header">
                        <h3>Verify Your Identity</h3>
                        <button class="close-btn" id="closeOtpModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="otp-message">We've sent a 6-digit verification code to your email address. Please enter it below to confirm your profile changes.</p>
                        
                        <div class="otp-input-container">
                            <input type="text" class="otp-input" maxlength="1" data-index="0">
                            <input type="text" class="otp-input" maxlength="1" data-index="1">
                            <input type="text" class="otp-input" maxlength="1" data-index="2">
                            <input type="text" class="otp-input" maxlength="1" data-index="3">
                            <input type="text" class="otp-input" maxlength="1" data-index="4">
                            <input type="text" class="otp-input" maxlength="1" data-index="5">
                        </div>
                        
                        <div class="otp-timer" id="otpTimer" style="display: none;">
                            <i class="fas fa-clock"></i>
                            <span>Resend in <span id="countdown">60</span> seconds</span>
                        </div>
                        
                        <div class="otp-error" id="otpError" style="display: none;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="resendOtpBtn">
                            <i class="fas fa-redo"></i>
                            Resend Code
                        </button>
                        <button class="btn-primary" id="verifyOtpBtn">
                            <i class="fas fa-check"></i>
                            Verify & Save
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Debug: Check if the button was created
        setTimeout(() => {
            const editBtn = document.getElementById('editProfileBtn');
            console.log('Edit button found:', !!editBtn);
            if (editBtn) {
                console.log('Edit button element:', editBtn);
            } else {
                console.error('Edit button not found in DOM!');
            }
        }, 100);

        // Set up photo change button visibility
        this.setupPhotoHover();
    }

    setupPhotoHover() {
        // Profile photo changing is disabled - remove all photo interaction
        // const photoWrapper = document.querySelector('.profile-photo-wrapper');
        // const photoOverlay = document.getElementById('photoOverlay');
        // 
        // if (photoWrapper && photoOverlay) {
        //     photoWrapper.addEventListener('mouseenter', () => {
        //         if (this.isEditMode) {
        //             photoOverlay.style.display = 'flex';
        //         }
        //     });
        //     
        //     photoWrapper.addEventListener('mouseleave', () => {
        //         photoOverlay.style.display = 'none';
        //     });
        //     
        //     photoWrapper.addEventListener('click', () => {
        //         if (this.isEditMode) {
        //             document.getElementById('profilePhotoInput').click();
        //         }
        //     });
        // }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        const editBtn = document.getElementById('editProfileBtn');
        const editActions = document.getElementById('editActions');
        const emailDisplay = document.getElementById('emailDisplay');
        const emailInput = document.getElementById('emailInput');
        const phoneDisplay = document.getElementById('phoneDisplay');
        const phoneInput = document.getElementById('phoneInput');
        
        if (this.isEditMode) {
            // Switch to edit mode
            editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Edit';
            editBtn.classList.add('cancel-mode');
            editActions.style.display = 'flex';
            
            // Show inputs, hide displays
            emailDisplay.style.display = 'none';
            emailInput.style.display = 'block';
            phoneDisplay.style.display = 'none';
            phoneInput.style.display = 'block';
            
            // Enable photo editing - DISABLED
            // document.querySelector('.profile-photo-wrapper').classList.add('editable');
        } else {
            // Switch to view mode
            this.cancelEdit();
        }
    }

    cancelEdit() {
        this.isEditMode = false;
        
        const editBtn = document.getElementById('editProfileBtn');
        const editActions = document.getElementById('editActions');
        const emailDisplay = document.getElementById('emailDisplay');
        const emailInput = document.getElementById('emailInput');
        const phoneDisplay = document.getElementById('phoneDisplay');
        const phoneInput = document.getElementById('phoneInput');
        
        // Reset button
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
        editBtn.classList.remove('cancel-mode');
        editActions.style.display = 'none';
        
        // Show displays, hide inputs
        emailDisplay.style.display = 'block';
        emailInput.style.display = 'none';
        phoneDisplay.style.display = 'block';
        phoneInput.style.display = 'none';
        
        // Reset values
        emailInput.value = this.currentCustomer.email;
        phoneInput.value = this.currentCustomer.phone_number || '';
        
        // Disable photo editing - DISABLED
        // document.querySelector('.profile-photo-wrapper').classList.remove('editable');
        // document.getElementById('photoOverlay').style.display = 'none';
    }

    handlePhotoChange(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select a valid image file', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.showToast('Image file size must be less than 5MB', 'error');
                return;
            }
            
            // Preview the image
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('profilePhotoDisplay').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleProfileUpdate() {
        const emailInput = document.getElementById('emailInput');
        const phoneInput = document.getElementById('phoneInput');
        const photoInput = document.getElementById('profilePhotoInput');
        
        const newEmail = emailInput.value.trim();
        const newPhone = phoneInput.value.trim();
        const hasNewPhoto = false; // Profile photo changing is disabled
        
        // Validate inputs
        if (!newEmail || !this.isValidEmail(newEmail)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }
        
        if (!newPhone || !this.isValidPhone(newPhone)) {
            this.showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        // Check if anything changed
        const emailChanged = newEmail !== this.currentCustomer.email;
        const phoneChanged = newPhone !== this.currentCustomer.phone_number;
        
        if (!emailChanged && !phoneChanged && !hasNewPhoto) {
            this.showToast('No changes detected', 'info');
            return;
        }
        
        // Store pending changes
        this.pendingChanges = {
            email: newEmail,
            phone: newPhone,
            hasNewPhoto: false, // Profile photo changing is disabled
            photoFile: null, // Profile photo changing is disabled
            emailChanged: emailChanged,
            phoneChanged: phoneChanged,
            currentStep: emailChanged ? 'verify_original_email' : 'verify_phone_only'
        };
        
        // Request OTP - start with original email
        if (emailChanged) {
            await this.requestOtp(this.currentCustomer.email, 'verify_original_email');
        } else {
            await this.requestOtp(this.currentCustomer.email, 'verify_phone_only');
        }
    }

    async requestOtp(email, step = 'verify_phone_only') {
        try {
            const response = await fetch('/api/auth/profile-update-request-otp', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify({ email: email })
            });
            
            if (response.ok) {
                this.showOtpModal(step);
                this.startOtpTimer();
                const stepMessage = step === 'verify_original_email' ? 
                    'OTP sent to your current email for verification' : 
                    step === 'verify_new_email' ? 
                    'OTP sent to your new email for verification' :
                    'OTP sent to your email';
                this.showToast(stepMessage, 'success');
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to send OTP', 'error');
            }
        } catch (error) {
            console.error('Error requesting OTP:', error);
            this.showToast('Error sending OTP', 'error');
        }
    }

    showOtpModal(step = 'verify_phone_only') {
        const modal = document.getElementById('otpModal');
        modal.style.display = 'flex';
        
        // Update modal message based on step
        const messageEl = modal.querySelector('.otp-message');
        let message = '';
        
        if (step === 'verify_original_email') {
            message = `We've sent a 6-digit verification code to your current email address (${this.currentCustomer.email}). Please enter it below to proceed with the email change.`;
        } else if (step === 'verify_new_email') {
            message = `We've sent a 6-digit verification code to your new email address (${this.pendingChanges.email}). Please enter it below to complete the email change.`;
        } else {
            message = `We've sent a 6-digit verification code to your email address (${this.currentCustomer.email}). Please enter it below to confirm your profile changes.`;
        }
        
        messageEl.textContent = message;
        
        // Store current step
        this.currentOtpStep = step;
        
        // Clear previous OTP inputs
        document.querySelectorAll('.otp-input').forEach(input => {
            input.value = '';
            input.classList.remove('error');
        });
        
        // Setup enhanced OTP input handling
        this.setupOtpInputs();
        
        // Focus first input
        setTimeout(() => {
            document.querySelector('.otp-input').focus();
        }, 100);
        
        // Clear error
        document.getElementById('otpError').style.display = 'none';
    }

    setupOtpInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            // Remove existing listeners to prevent duplicates
            input.removeEventListener('input', this.handleOtpInput);
            input.removeEventListener('keydown', this.handleOtpKeydown);
            input.removeEventListener('paste', this.handleOtpPaste);
            
            // Add enhanced input handling
            input.addEventListener('input', (e) => this.handleOtpInput(e, index));
            input.addEventListener('keydown', (e) => this.handleOtpKeydown(e, index));
            input.addEventListener('paste', (e) => this.handleOtpPaste(e, index));
        });
    }

    handleOtpInput(event, index) {
        const input = event.target;
        const value = input.value;
        
        // Only allow numbers
        if (value && !/^[0-9]$/.test(value)) {
            input.value = '';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
            return;
        }
        
        // Remove error class on valid input
        input.classList.remove('error');
        
        // Move to next input
        if (value && index < 5) {
            const nextInput = document.querySelectorAll('.otp-input')[index + 1];
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
        
        // Auto-verify when all inputs are filled
        const allInputs = document.querySelectorAll('.otp-input');
        const allFilled = Array.from(allInputs).every(inp => inp.value);
        if (allFilled) {
            setTimeout(() => this.verifyOtp(), 300);
        }
    }

    handleOtpKeydown(event, index) {
        const input = event.target;
        
        // Handle backspace
        if (event.key === 'Backspace' && !input.value && index > 0) {
            const prevInput = document.querySelectorAll('.otp-input')[index - 1];
            if (prevInput) {
                prevInput.focus();
                prevInput.select();
            }
        }
        
        // Handle arrow keys
        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            document.querySelectorAll('.otp-input')[index - 1].focus();
        }
        
        if (event.key === 'ArrowRight' && index < 5) {
            event.preventDefault();
            document.querySelectorAll('.otp-input')[index + 1].focus();
        }
        
        // Prevent non-numeric input
        if (!/^[0-9]$/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }
    }

    handleOtpPaste(event, index) {
        event.preventDefault();
        const paste = event.clipboardData.getData('text');
        const numbers = paste.replace(/\D/g, '').slice(0, 6);
        
        if (numbers.length > 0) {
            const otpInputs = document.querySelectorAll('.otp-input');
            numbers.split('').forEach((num, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = num;
                    otpInputs[i].classList.remove('error');
                }
            });
            
            // Focus on the next empty input or the last one
            const lastFilledIndex = Math.min(numbers.length - 1, 5);
            if (lastFilledIndex < 5) {
                otpInputs[lastFilledIndex + 1].focus();
            } else {
                otpInputs[5].focus();
                // Auto-verify if all filled
                if (numbers.length === 6) {
                    setTimeout(() => this.verifyOtp(), 300);
                }
            }
        }
    }

    closeOtpModal() {
        const modal = document.getElementById('otpModal');
        modal.style.display = 'none';
        
        // Clear timer
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = null;
        }
        
        // Reset OTP step
        this.currentOtpStep = null;
    }

    startOtpTimer() {
        this.otpCountdown = 60;
        const timerEl = document.getElementById('otpTimer');
        const countdownEl = document.getElementById('countdown');
        const resendBtn = document.getElementById('resendOtpBtn');
        
        timerEl.style.display = 'block';
        resendBtn.disabled = true;
        
        this.otpTimer = setInterval(() => {
            this.otpCountdown--;
            countdownEl.textContent = this.otpCountdown;
            
            if (this.otpCountdown <= 0) {
                clearInterval(this.otpTimer);
                this.otpTimer = null;
                timerEl.style.display = 'none';
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    async verifyOtp() {
        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            this.showOtpError('Please enter the complete 6-digit code');
            // Add error styling to empty inputs
            otpInputs.forEach(input => {
                if (!input.value) {
                    input.classList.add('error');
                }
            });
            return;
        }
        
        try {
            let endpoint = '';
            let requestBody = {};
            
            // Determine which endpoint to call based on current step
            if (this.currentOtpStep === 'verify_original_email') {
                endpoint = '/api/auth/profile-update-verify-original-email';
                requestBody = {
                    email: this.currentCustomer.email,
                    phone_number: this.pendingChanges.phone,
                    new_email: this.pendingChanges.email,
                    otp: otp
                };
            } else if (this.currentOtpStep === 'verify_new_email') {
                endpoint = '/api/auth/profile-update-verify-new-email';
                requestBody = {
                    new_email: this.pendingChanges.email,
                    otp: otp
                };
            } else {
                // Regular profile update (phone only)
                endpoint = '/api/auth/profile-update-verify-otp';
                const formData = new FormData();
                formData.append('email', this.currentCustomer.email);
                formData.append('phone_number', this.pendingChanges.phone);
                formData.append('otp', otp);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                    },
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.currentCustomer = result.customer;
                    
                    this.closeOtpModal();
                    this.showToast('Profile updated successfully!', 'success');
                    
                    // Refresh the profile display
                    this.renderStaticProfile();
                    
                    // Update main dashboard if needed
                    if (window.dashboard && window.dashboard.updateProfileDisplay) {
                        window.dashboard.customerData = result.customer;
                        window.dashboard.updateProfileDisplay();
                    }
                } else {
                    const error = await response.json();
                    this.showOtpError(error.message || 'Invalid OTP');
                }
                return;
            }
            
            // Handle two-step email verification
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.nextStep === 'verify_new_email') {
                    // Step 1 completed, now verify new email
                    this.pendingChanges.currentStep = 'verify_new_email';
                    this.closeOtpModal();
                    
                    this.showToast(result.message, 'success');
                    
                    // Wait a moment then show OTP modal for new email
                    setTimeout(() => {
                        this.showOtpModal('verify_new_email');
                        this.startOtpTimer();
                    }, 1000);
                } else {
                    // Step 2 completed, profile updated
                    this.currentCustomer = result.customer;
                    
                    this.closeOtpModal();
                    this.showToast('Profile updated successfully!', 'success');
                    
                    // Refresh the profile display
                    this.renderStaticProfile();
                    
                    // Update main dashboard if needed
                    if (window.dashboard && window.dashboard.updateProfileDisplay) {
                        window.dashboard.customerData = result.customer;
                        window.dashboard.updateProfileDisplay();
                    }
                }
            } else {
                const error = await response.json();
                this.showOtpError(error.message || 'Invalid OTP');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            this.showOtpError('Error verifying OTP');
        }
    }

    async resendOtp() {
        // Determine which email to send OTP to based on current step
        let emailToSend = this.currentCustomer.email;
        let step = this.currentOtpStep || 'verify_phone_only';
        
        if (this.currentOtpStep === 'verify_new_email') {
            emailToSend = this.pendingChanges.email;
            step = 'verify_new_email';
        }
        
        await this.requestOtp(emailToSend, step);
    }

    showOtpError(message) {
        const errorEl = document.getElementById('otpError');
        const otpInputs = document.querySelectorAll('.otp-input');
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Add shake animation to all inputs
        otpInputs.forEach(input => {
            input.classList.add('error');
        });
        
        // Remove error class after animation
        setTimeout(() => {
            otpInputs.forEach(input => {
                input.classList.remove('error');
            });
        }, 500);
        
        // Clear error message after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
        
        // Focus first input for retry
        if (otpInputs[0]) {
            otpInputs[0].focus();
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    showToast(message, type = 'info') {
        // Use the main dashboard's toast function if available
        if (window.dashboard && window.dashboard.showToast) {
            window.dashboard.showToast(message, type);
            return;
        }
        
        // Fallback toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize Customer Profile Manager when needed
if (typeof window !== 'undefined') {
    window.CustomerProfileManager = CustomerProfileManager;
}
