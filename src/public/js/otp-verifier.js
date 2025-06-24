/**
 * Reusable OTP Verification Module
 * Handles OTP verification for registration, forgot password, and other flows
 */

class OTPVerifier {
    constructor(options = {}) {
        this.userType = options.userType || 'customer'; // 'customer' or 'provider'
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});
        this.showMessage = options.showMessage || ((msg, type) => console.log(`${type}: ${msg}`));
        
        // API endpoints
        this.endpoints = {
            customer: {
                request: '/auth/request-otp',
                verify: '/auth/verify-otp'
            },
            provider: {
                request: '/auth/provider-request-otp',
                verify: '/auth/provider-verify-otp'
            }
        };
    }

    /**
     * Request OTP for email verification
     * @param {string} email - Email address to send OTP to
     * @param {Object} additionalData - Any additional data to send with request
     */
    async requestOTP(email, additionalData = {}) {
        try {
            const endpoint = this.endpoints[this.userType].request;
            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';
            
            const requestData = {
                [emailField]: email,
                ...additionalData
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Verification code sent to your email. Please check your inbox.', 'success');
                return { success: true, data };
            } else {
                this.showMessage(data.message || 'Failed to send verification code', 'error');
                return { success: false, message: data.message };
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
            console.error('OTP request error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    /**
     * Verify OTP code
     * @param {string} email - Email address
     * @param {string} otp - 6-digit OTP code
     */
    async verifyOTP(email, otp) {
        try {
            const endpoint = this.endpoints[this.userType].verify;
            const emailField = this.userType === 'provider' ? 'provider_email' : 'email';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [emailField]: email,
                    otp: otp
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Email verified successfully!', 'success');
                this.onSuccess(data);
                return { success: true, data };
            } else {
                this.showMessage(data.message || 'Invalid verification code. Please try again.', 'error');
                this.onError(data);
                return { success: false, message: data.message };
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
            console.error('OTP verification error:', error);
            this.onError({ message: 'Network error' });
            return { success: false, message: 'Network error' };
        }
    }

    /**
     * Validate OTP input (6 digits)
     * @param {string} otp - OTP to validate
     */
    validateOTP(otp) {
        if (!otp || otp.length !== 6) {
            return { valid: false, message: 'Please enter the complete 6-digit code' };
        }
        
        if (!/^\d{6}$/.test(otp)) {
            return { valid: false, message: 'Please enter a valid 6-digit number' };
        }
        
        return { valid: true };
    }

    /**
     * Handle OTP tile functionality (auto-focus, paste, etc.)
     * @param {NodeList} otpTiles - Collection of OTP input tiles
     */
    setupOTPTiles(otpTiles) {
        otpTiles.forEach((tile, index) => {
            tile.addEventListener('input', (e) => {
                // Only allow digits
                e.target.value = e.target.value.replace(/\D/g, '');
                
                if (e.target.value) {
                    e.target.classList.add('filled');
                    e.target.classList.remove('error');
                    
                    // Auto-focus next tile
                    if (index < otpTiles.length - 1) {
                        otpTiles[index + 1].focus();
                    }
                } else {
                    e.target.classList.remove('filled');
                }
            });
            
            tile.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpTiles[index - 1].focus();
                    otpTiles[index - 1].value = '';
                    otpTiles[index - 1].classList.remove('filled');
                }
                
                // Handle arrow keys
                if (e.key === 'ArrowLeft' && index > 0) {
                    otpTiles[index - 1].focus();
                }
                if (e.key === 'ArrowRight' && index < otpTiles.length - 1) {
                    otpTiles[index + 1].focus();
                }
            });
            
            tile.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const digits = paste.replace(/\D/g, '').slice(0, 6);
                
                digits.split('').forEach((digit, i) => {
                    if (otpTiles[i]) {
                        otpTiles[i].value = digit;
                        otpTiles[i].classList.add('filled');
                        otpTiles[i].classList.remove('error');
                    }
                });
                
                // Focus on next empty tile or last tile
                const nextEmpty = Array.from(otpTiles).find(tile => !tile.value);
                if (nextEmpty) {
                    nextEmpty.focus();
                } else {
                    otpTiles[otpTiles.length - 1].focus();
                }
            });
        });
    }

    /**
     * Clear OTP tiles and reset styling
     * @param {NodeList} otpTiles - Collection of OTP input tiles
     */
    clearOTPTiles(otpTiles) {
        otpTiles.forEach(tile => {
            tile.value = '';
            tile.classList.remove('filled', 'error');
        });
        if (otpTiles[0]) {
            otpTiles[0].focus();
        }
    }

    /**
     * Add error styling to OTP tiles
     * @param {NodeList} otpTiles - Collection of OTP input tiles
     */
    showOTPError(otpTiles) {
        otpTiles.forEach(tile => {
            tile.classList.add('error');
            setTimeout(() => tile.classList.remove('error'), 1000);
        });
    }

    /**
     * Get OTP value from tiles
     * @param {NodeList} otpTiles - Collection of OTP input tiles
     */
    getOTPFromTiles(otpTiles) {
        return Array.from(otpTiles).map(tile => tile.value).join('');
    }
}

// Export for use in other scripts
window.OTPVerifier = OTPVerifier;
