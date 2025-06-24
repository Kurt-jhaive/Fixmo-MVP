// Dashboard utilities - Reusable functions
class DashboardUtils {
    // Show loading overlay
    static showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    // Hide loading overlay
    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Show toast notification
    static showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    container.removeChild(toast);
                }, 300);
            }
        }, duration);
    }

    // Get toast icon based on type
    static getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    // Format date
    static formatDate(date) {
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }

    // Format time
    static formatTime(date) {
        return new Intl.DateTimeFormat('en-PH', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    // Debounce function
    static debounce(func, wait) {
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

    // Make API request with error handling
    static async makeRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // Add auth token if available
            const token = localStorage.getItem('fixmo_user_token');
            if (token) {
                defaultOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Validate file upload
    static validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
            allowedExtensions = ['.jpg', '.jpeg', '.png']
        } = options;

        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: `File size must be less than ${maxSize / (1024 * 1024)}MB` };
        }

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
        }

        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
            return { valid: false, error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}` };
        }

        return { valid: true };
    }

    // Preview image file
    static previewImage(file, previewElement) {
        if (!file || !previewElement) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.parentElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // Generate star rating HTML
    static generateStarRating(rating, maxRating = 5) {
        let starsHtml = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = maxRating - Math.ceil(rating);

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }

        // Half star
        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        }

        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star"></i>';
        }

        return starsHtml;
    }

    // Truncate text
    static truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Capitalize first letter
    static capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Check if user is authenticated
    static isAuthenticated() {
        const token = localStorage.getItem('fixmo_user_token');
        const userId = localStorage.getItem('fixmo_user_id');
        const userType = localStorage.getItem('fixmo_user_type');
        
        return token && userId && userType === 'customer';
    }

    // Get user data from localStorage
    static getUserData() {
        return {
            token: localStorage.getItem('fixmo_user_token'),
            userId: localStorage.getItem('fixmo_user_id'),
            userName: localStorage.getItem('fixmo_user_name'),
            userType: localStorage.getItem('fixmo_user_type')
        };
    }

    // Clear user data and redirect to login
    static logout() {
        localStorage.removeItem('fixmo_user_token');
        localStorage.removeItem('fixmo_user_id');
        localStorage.removeItem('fixmo_user_name');
        localStorage.removeItem('fixmo_user_type');
        window.location.href = '/fixmo-login';
    }    // Check user verification status
    static async checkVerificationStatus() {
        try {
            const userData = this.getUserData();
            if (!userData.userId) return false;

            const response = await this.makeRequest(`/auth/user-profile/${userData.userId}`);
            return response.user?.is_verified || false;
        } catch (error) {
            console.error('Error checking verification status:', error);
            return false;
        }
    }

    // Handle drag and drop for file uploads
    static setupDragAndDrop(element, onFileSelected) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onFileSelected(files[0]);
            }
        });
    }

    // Smooth scroll to element
    static scrollToElement(elementId, offset = 100) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // Create loading skeleton
    static createLoadingSkeleton(container, count = 3) {
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="skeleton-line skeleton-text"></div>
                    <div class="skeleton-line skeleton-text short"></div>
                </div>
            `;
            container.appendChild(skeleton);
        }
    }

    // Format phone number
    static formatPhoneNumber(phoneNumber) {
        // Remove all non-digits
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Format as +63 XXX XXX XXXX
        if (cleaned.length === 11 && cleaned.startsWith('09')) {
            return `+63 ${cleaned.substring(1, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
        } else if (cleaned.length === 12 && cleaned.startsWith('639')) {
            return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
        }
        
        return phoneNumber; // Return original if format doesn't match
    }

    // Validate email
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate phone number
    static validatePhoneNumber(phone) {
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');
        
        // Check for valid Philippine mobile number format
        return (cleaned.length === 11 && cleaned.startsWith('09')) ||
               (cleaned.length === 12 && cleaned.startsWith('639'));
    }

    // Get distance between two coordinates
    static getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    }

    static deg2rad(deg) {
        return deg * (Math.PI/180);
    }
}

// Export for use in other modules
window.DashboardUtils = DashboardUtils;
