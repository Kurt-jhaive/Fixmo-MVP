class AdminUsers {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('usersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterAndDisplayUsers();
            });
        }

        // Sort
        const sortSelect = document.getElementById('usersSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.filterAndDisplayUsers();
            });
        }

        // Filter buttons
        document.querySelectorAll('#usersPage .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#usersPage .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.filterAndDisplayUsers();
            });
        });
    }

    async loadUsers() {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            
            if (response.ok) {
                this.users = data.users || [];
                this.updateUserStats();
                this.filterAndDisplayUsers();
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load users');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    updateUserStats() {
        const total = this.users.length;
        const verified = this.users.filter(user => user.is_verified).length;
        const pending = this.users.filter(user => !user.is_verified).length;
        const inactive = this.users.filter(user => !user.is_activated).length;

        document.getElementById('usersTotal').textContent = total;
        document.getElementById('usersVerified').textContent = verified;
        document.getElementById('usersPending').textContent = pending;
        document.getElementById('usersInactive').textContent = inactive;
    }

    filterAndDisplayUsers() {
        let filtered = [...this.users];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                user.first_name.toLowerCase().includes(term) ||
                user.last_name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.userName.toLowerCase().includes(term) ||
                user.phone_number.includes(term)
            );
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            switch (this.currentFilter) {
                case 'verified':
                    filtered = filtered.filter(user => user.is_verified);
                    break;
                case 'pending':
                    filtered = filtered.filter(user => !user.is_verified);
                    break;
                case 'active':
                    filtered = filtered.filter(user => user.is_activated);
                    break;
                case 'inactive':
                    filtered = filtered.filter(user => !user.is_activated);
                    break;
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'name':
                    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
                case 'name_desc':
                    return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
                default:
                    return 0;
            }
        });

        this.filteredUsers = filtered;
        this.displayUsers();
    }

    displayUsers() {
        const tbody = document.getElementById('usersTableBody');
        
        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--admin-text-light);">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.profile_photo ? 
                                `<img src="${user.profile_photo}" alt="${user.first_name}">` : 
                                `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
                            }
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.first_name} ${user.last_name}</div>
                            <div class="user-username">@${user.userName}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.phone_number}</td>
                <td>
                    <span class="status-badge ${user.is_verified ? 'verified' : 'pending'}">
                        <i class="fas ${user.is_verified ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${user.is_verified ? 'Verified' : 'Pending'}
                    </span>
                    ${!user.is_activated ? '<span class="status-badge inactive" style="margin-left: 0.5rem;"><i class="fas fa-ban"></i> Inactive</span>' : ''}
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="adminUsers.viewUser(${user.user_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!user.is_verified ? `
                            <button class="btn btn-success btn-sm" onclick="adminUsers.verifyUser(${user.user_id})">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${user.is_activated ? `
                            <button class="btn btn-warning btn-sm" onclick="adminUsers.deactivateUser(${user.user_id})">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : `
                            <button class="btn btn-success btn-sm" onclick="adminUsers.activateUser(${user.user_id})">
                                <i class="fas fa-check"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async viewUser(userId) {
        try {
            window.adminDashboard.showLoading();
            
            const response = await fetch(`/api/admin/users/${userId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showUserDetails(data.user);
            } else {
                window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to load user details');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            window.adminDashboard.showToast('error', 'Error', 'Failed to load user details');
        } finally {
            window.adminDashboard.hideLoading();
        }
    }

    showUserDetails(user) {
        const modalBody = document.getElementById('userDetailsBody');
        
        modalBody.innerHTML = `
            <div class="profile-image-container">
                ${user.profile_photo ? 
                    `<img src="${user.profile_photo}" alt="Profile Photo" class="profile-image" onclick="adminDashboard.showImageViewer('${user.profile_photo}', 'Profile Photo')">` : 
                    `<div class="profile-placeholder">
                        <i class="fas fa-user"></i>
                    </div>`
                }
            </div>
            
            <div class="details-section">
                <h4>Personal Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">First Name</span>
                        <span class="detail-value">${user.first_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Name</span>
                        <span class="detail-value">${user.last_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${user.userName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${user.email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone Number</span>
                        <span class="detail-value">${user.phone_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Birthday</span>
                        <span class="detail-value">${user.birthday ? this.formatDate(user.birthday) : 'Not provided'}</span>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h4>Account Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Account Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${user.is_activated ? 'active' : 'inactive'}">
                                <i class="fas ${user.is_activated ? 'fa-check-circle' : 'fa-ban'}"></i>
                                ${user.is_activated ? 'Active' : 'Inactive'}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Verification Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${user.is_verified ? 'verified' : 'pending'}">
                                <i class="fas ${user.is_verified ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${user.is_verified ? 'Verified' : 'Pending'}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Joined Date</span>
                        <span class="detail-value">${this.formatDate(user.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location</span>
                        <span class="detail-value">${user.user_location || 'Not provided'}</span>
                    </div>
                </div>
            </div>
            
            ${user.valid_id ? `
                <div class="details-section">
                    <h4>Valid ID Document</h4>
                    <div style="text-align: center;">
                        <img src="${user.valid_id}" alt="Valid ID" class="id-document" onclick="adminDashboard.showImageViewer('${user.valid_id}', 'Valid ID Document')">
                    </div>
                </div>
            ` : ''}
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="adminDashboard.closeModal(document.getElementById('userDetailsModal'))">
                    Close
                </button>
                ${!user.is_verified ? `
                    <button class="btn btn-success" onclick="adminUsers.verifyUser(${user.user_id})">
                        <i class="fas fa-check"></i> Verify User
                    </button>
                ` : ''}
                ${user.is_activated ? `
                    <button class="btn btn-warning" onclick="adminUsers.deactivateUser(${user.user_id})">
                        <i class="fas fa-ban"></i> Deactivate
                    </button>
                ` : `
                    <button class="btn btn-success" onclick="adminUsers.activateUser(${user.user_id})">
                        <i class="fas fa-check"></i> Activate
                    </button>
                `}
            </div>
        `;
        
        window.adminDashboard.showModal('userDetailsModal');
    }

    verifyUser(userId) {
        const user = this.users.find(u => u.user_id === userId);
        if (!user) return;

        window.adminDashboard.showConfirmation(
            'Verify User',
            `Verify ${user.first_name} ${user.last_name}?`,
            'This will mark the user as verified and allow them full access to the platform.',
            async () => {
                try {
                    const response = await fetch(`/api/admin/users/${userId}/verify`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'User verified successfully');
                        this.loadUsers();
                        window.adminDashboard.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to verify user');
                    }
                } catch (error) {
                    console.error('Error verifying user:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to verify user');
                }
            }
        );
    }

    deactivateUser(userId) {
        const user = this.users.find(u => u.user_id === userId);
        if (!user) return;

        window.adminDashboard.showConfirmation(
            'Deactivate User',
            `Deactivate ${user.first_name} ${user.last_name}?`,
            'This will prevent the user from accessing the platform.',
            async (reason) => {
                try {
                    const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'User deactivated successfully');
                        this.loadUsers();
                        window.adminDashboard.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to deactivate user');
                    }
                } catch (error) {
                    console.error('Error deactivating user:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to deactivate user');
                }
            },
            true // Show reason field
        );
    }

    activateUser(userId) {
        const user = this.users.find(u => u.user_id === userId);
        if (!user) return;

        window.adminDashboard.showConfirmation(
            'Activate User',
            `Activate ${user.first_name} ${user.last_name}?`,
            'This will allow the user to access the platform.',
            async () => {
                try {
                    const response = await fetch(`/api/admin/users/${userId}/activate`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.adminDashboard.showToast('success', 'Success', 'User activated successfully');
                        this.loadUsers();
                        window.adminDashboard.closeModal(document.getElementById('userDetailsModal'));
                    } else {
                        window.adminDashboard.showToast('error', 'Error', data.message || 'Failed to activate user');
                    }
                } catch (error) {
                    console.error('Error activating user:', error);
                    window.adminDashboard.showToast('error', 'Error', 'Failed to activate user');
                }
            }
        );
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminUsers = new AdminUsers();
});
