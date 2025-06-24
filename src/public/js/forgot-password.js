// Forgot Password JavaScript Module
class ForgotPasswordManager {
    constructor() {
        this.currentStep = 1;
        this.userType = 'customer'; // default
        this.resendTimer = null;
        this.resendCountdown = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStepIndicator();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchUserType(e));
        });

        // Form submissions
        document.getElementById('emailForm').addEventListener('submit', (e) => this.handleEmailSubmit(e));
        document.getElementById('otpForm').addEventListener('submit', (e) => this.handleOTPSubmit(e));
        document.getElementById('passwordForm').addEventListener('submit', (e) => this.handlePasswordSubmit(e));

        // OTP input handling
        this.setupOTPInputs();

        // Password visibility toggles
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePassword(e));
        });

        // Resend OTP
        document.getElementById('resendOTP').addEventListener('click', () => this.resendOTP());
    }

    switchUserType(event) {
        const userType = event.target.dataset.userType;
        this.userType = userType;

        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Update placeholders and labels based on user type
        this.updateFormLabels();
        
        this.hideMessages();
    }

    updateFormLabels() {
        const emailInput = document.getElementById('userEmail');
        const emailLabel = document.querySelector('label[for="userEmail"]');
        
        if (this.userType === 'provider') {
            emailLabel.textContent = 'Provider Email Address';
            emailInput.placeholder = 'Enter your provider email';
        } else {
            emailLabel.textContent = 'Email Address';
            emailInput.placeholder = 'Enter your email';
        }
    }

    setupOTPInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Only allow numbers
                if (!/^\d*$/.test(value)) {
                    e.target.value = value.replace(/\D/g, '');
                    return;
                }
                
                // Move to next input
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                // Auto-submit when all fields are filled
                const allFilled = Array.from(otpInputs).every(inp => inp.value.length === 1);
                if (allFilled) {
                    document.getElementById('verifyOTPBtn').click();
                }
            });

            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
                
                for (let i = 0; i < Math.min(pastedData.length, otpInputs.length - index); i++) {
                    if (otpInputs[index + i]) {
                        otpInputs[index + i].value = pastedData[i];
                    }
                }
                
                // Focus the next empty input or the last one
                const nextEmpty = Array.from(otpInputs).findIndex((inp, i) => i >= index && !inp.value);
                if (nextEmpty !== -1) {
                    otpInputs[nextEmpty].focus();
                } else {
                    otpInputs[otpInputs.length - 1].focus();
                }
            });
        });
    }

    togglePassword(event) {
        const toggle = event.target;
        const inputId = toggle.dataset.target;
        const input = document.getElementById(inputId);
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
        }
    }

    async handleEmailSubmit(event) {
        event.preventDefault();
        
        const email = document.getElementById('userEmail').value.trim();
        
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        const submitBtn = document.getElementById('sendOTPBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

            const endpoint = this.userType === 'provider' 
                ? '/auth/provider-forgot-password-request-otp' 
                : '/auth/forgot-password-request-otp';

            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [emailField]: email })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('OTP sent to your email. Please check your inbox.');
                this.nextStep();
                this.startResendTimer();
            } else {
                this.showError(data.message || 'Failed to send OTP');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Send OTP error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }    async handleOTPSubmit(event) {
        event.preventDefault();
        
        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        const email = document.getElementById('userEmail').value;
        
        if (otp.length !== 6) {
            this.showError('Please enter the complete 6-digit OTP');
            return;
        }

        const submitBtn = document.getElementById('verifyOTPBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

            // Use the separate OTP verification endpoint
            const endpoint = this.userType === 'provider' 
                ? '/auth/provider-verify-otp' 
                : '/auth/verify-otp';

            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    [emailField]: email, 
                    otp 
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('OTP verified successfully! Now set your new password.');
                this.nextStep();
            } else {
                this.showError(data.message || 'Invalid or expired OTP');
                // Clear OTP inputs on error
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('OTP verification error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }    async handlePasswordSubmit(event) {
        event.preventDefault();
        
        const email = document.getElementById('userEmail').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!newPassword || !confirmPassword) {
            this.showError('Please fill in all password fields');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        const submitBtn = document.getElementById('resetPasswordBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting Password...';

            // Use a simple password reset endpoint since OTP was already verified
            const endpoint = this.userType === 'provider' 
                ? '/auth/provider-reset-password' 
                : '/auth/reset-password';

            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    [emailField]: email, 
                    newPassword 
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Password reset successful! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/fixmo-login';
                }, 2000);
            } else {
                this.showError(data.message || 'Failed to reset password');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Reset password error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async resendOTP() {
        if (this.resendCountdown > 0) return;

        const email = document.getElementById('userEmail').value;
        const resendLink = document.getElementById('resendOTP');
        
        try {
            resendLink.textContent = 'Sending...';
            
            const endpoint = this.userType === 'provider' 
                ? '/auth/provider-forgot-password-request-otp' 
                : '/auth/forgot-password-request-otp';

            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [emailField]: email })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('New OTP sent to your email');
                this.startResendTimer();
            } else {
                this.showError(data.message || 'Failed to resend OTP');
                resendLink.textContent = 'Resend OTP';
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            resendLink.textContent = 'Resend OTP';
            console.error('Resend OTP error:', error);
        }
    }

    startResendTimer() {
        this.resendCountdown = 60;
        const resendLink = document.getElementById('resendOTP');
        const resendTimer = document.getElementById('resendTimer');
        
        resendLink.style.display = 'none';
        resendTimer.style.display = 'block';
        
        this.resendTimer = setInterval(() => {
            this.resendCountdown--;
            resendTimer.textContent = `Resend OTP in ${this.resendCountdown}s`;
            
            if (this.resendCountdown <= 0) {
                clearInterval(this.resendTimer);
                resendLink.style.display = 'inline';
                resendLink.textContent = 'Resend OTP';
                resendTimer.style.display = 'none';
            }
        }, 1000);
    }

    nextStep() {
        this.currentStep++;
        this.updateStepIndicator();
        this.showStep(this.currentStep);
    }

    updateStepIndicator() {
        const steps = document.querySelectorAll('.step');
        
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    showStep(stepNumber) {
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.getElementById(`step${stepNumber}`).classList.add('active');
        
        // Focus the first input in the new step
        setTimeout(() => {
            const activeStep = document.getElementById(`step${stepNumber}`);
            const firstInput = activeStep.querySelector('input:not([readonly])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        this.hideMessages();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => this.hideMessages(), 5000);
    }

    showSuccess(message) {
        this.hideMessages();
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => this.hideMessages(), 5000);
    }

    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPasswordManager();
});

// Handle back navigation
function goBack() {
    if (confirm('Are you sure you want to go back to login? Your progress will be lost.')) {
        window.location.href = '/fixmo-login';
    }
}
