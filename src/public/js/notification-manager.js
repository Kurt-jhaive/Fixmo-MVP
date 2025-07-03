// Notification utility for better popup notifications
class NotificationManager {
    constructor() {
        this.createNotificationContainer();
    }

    createNotificationContainer() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 10000 !important;
                max-width: 400px !important;
                pointer-events: none !important;
                opacity: 1 !important;
                backdrop-filter: none !important;
                filter: none !important;
            `;
            document.body.appendChild(container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        // Prevent duplicate notifications for the same message
        const existingNotifications = document.querySelectorAll('[id^="notification-"]');
        for (let existing of existingNotifications) {
            if (existing.querySelector('div:last-child')?.textContent === message) {
                // Shake existing notification to show it's the same
                existing.classList.add('notification-shake');
                setTimeout(() => existing.classList.remove('notification-shake'), 500);
                return existing.id;
            }
        }

        const notification = document.createElement('div');
        const notificationId = 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        notification.id = notificationId;
        
        // Set notification styles based on type
        const typeStyles = {
            success: {
                background: '#28a745',
                borderLeft: '4px solid #155724',
                icon: '✅'
            },
            error: {
                background: '#dc3545',
                borderLeft: '4px solid #721c24',
                icon: '❌'
            },
            warning: {
                background: '#ffc107',
                borderLeft: '4px solid #856404',
                icon: '⚠️',
                textColor: '#212529'
            },
            info: {
                background: '#17a2b8',
                borderLeft: '4px solid #0c5460',
                icon: 'ℹ️'
            }
        };

        const style = typeStyles[type] || typeStyles.info;
        
        notification.style.cssText = `
            background: ${style.background} !important;
            color: ${style.textColor || 'white'} !important;
            padding: 16px 20px !important;
            margin-bottom: 12px !important;
            border-radius: 8px !important;
            ${style.borderLeft} !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            max-width: 100% !important;
            word-wrap: break-word !important;
            transform: translateX(420px) !important;
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
            pointer-events: auto !important;
            cursor: pointer !important;
            position: relative !important;
            overflow: hidden !important;
            opacity: 1 !important;
            z-index: 10001 !important;
            backdrop-filter: none !important;
            filter: none !important;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 18px; flex-shrink: 0;">${style.icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px; color: ${style.textColor || 'white'};">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div style="color: ${style.textColor || 'white'};">${message}</div>
                </div>
                <button onclick="window.notificationManager.hide('${notificationId}')" 
                        style="background: none; border: none; color: ${style.textColor || 'white'}; font-size: 18px; cursor: pointer; padding: 0; margin-left: 8px; opacity: 0.7; transition: opacity 0.2s;">
                    ×
                </button>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255,255,255,0.3); width: 100%; transform-origin: left; animation: progressBar ${duration}ms linear;"></div>
        `;

        // Add CSS animation for progress bar
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes progressBar {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                
                .notification-shake {
                    animation: shake 0.5s ease-in-out;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(styles);
        }

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Slide in animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto hide after duration
        const hideTimeout = setTimeout(() => {
            this.hide(notificationId);
        }, duration);

        // Click to dismiss
        notification.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                clearTimeout(hideTimeout);
                this.hide(notificationId);
            }
        });

        // Store timeout for manual clearing
        notification.dataset.timeout = hideTimeout;

        return notificationId;
    }

    hide(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            // Clear timeout if exists
            if (notification.dataset.timeout) {
                clearTimeout(notification.dataset.timeout);
            }
            
            // Slide out animation only - no opacity change
            notification.style.transform = 'translateX(420px)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    // Show booking specific notifications
    bookingSuccess(appointmentDetails) {
        const message = `Booking successful!`;
        
        // Check for duplicate booking success notifications
        const messageText = `Booking successful!`;
        const existingNotifications = document.querySelectorAll('[id^="notification-"]');
        for (let existing of existingNotifications) {
            const existingText = existing.textContent || existing.innerText;
            if (existingText.includes('Booking successful!')) {
                existing.classList.add('notification-shake');
                setTimeout(() => existing.classList.remove('notification-shake'), 500);
                return existing.id;
            }
        }
        
        return this.show(message, 'success', 4000);
    }

    bookingError(errorMessage) {
        const message = `
            <strong>Booking Failed</strong><br>
            ${errorMessage}<br>
            <small>Please try again or select a different time slot.</small>
        `;
        
        // Check for duplicate booking error notifications
        const existingNotifications = document.querySelectorAll('[id^="notification-"]');
        for (let existing of existingNotifications) {
            const existingText = existing.textContent || existing.innerText;
            if (existingText.includes('Booking Failed') && existingText.includes(errorMessage)) {
                existing.classList.add('notification-shake');
                setTimeout(() => existing.classList.remove('notification-shake'), 500);
                return existing.id;
            }
        }
        
        return this.show(message, 'error', 8000);
    }

    availabilityUpdate(message) {
        return this.show(`<strong>Availability Updated:</strong><br>${message}`, 'info', 6000);
    }

    // Clear all notifications
    clearAll() {
        const container = document.getElementById('notification-container');
        if (container) {
            const notifications = container.querySelectorAll('[id^="notification-"]');
            notifications.forEach(notification => {
                this.hide(notification.id);
            });
        }
    }
}

// Create global instance
window.notificationManager = new NotificationManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
