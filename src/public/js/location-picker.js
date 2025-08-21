/**
 * GPS Location Picker Component
 * Uses free OpenStreetMap with Leaflet for location selection
 */

class LocationPicker {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            defaultZoom: 15,
            defaultLat: 14.5995, // Manila default
            defaultLng: 120.9842,
            showSearchBox: true,
            allowManualPin: true,
            showCurrentLocation: true,
            onLocationSelect: null,
            ...options
        };
        
        this.map = null;
        this.marker = null;
        this.selectedLocation = null;
        this.watchId = null;
        
        this.init();
    }

    async init() {
        await this.loadLeafletCSS();
        await this.loadLeafletJS();
        this.createMapContainer();
        this.initializeMap();
        this.setupLocationControls();
    }

    loadLeafletCSS() {
        return new Promise((resolve) => {
            if (document.querySelector('link[href*="leaflet.css"]')) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.onload = resolve;
            document.head.appendChild(link);
        });
    }

    loadLeafletJS() {
        return new Promise((resolve) => {
            if (window.L) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    createMapContainer() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container with ID '${this.containerId}' not found`);
        }

        container.innerHTML = `
            <div class="location-picker-wrapper">
                ${this.options.showSearchBox ? `
                    <div class="location-search-box">
                        <input type="text" id="${this.containerId}-search" placeholder="Location will be set based on your address selection..." class="location-search-input" readonly>
                        <button type="button" id="${this.containerId}-search-btn" class="location-search-btn" style="display: none;">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                ` : ''}
                
                <div class="location-controls">
                    ${this.options.showCurrentLocation ? `
                        <button type="button" id="${this.containerId}-current-location" class="location-btn current-location-btn">
                            <i class="fas fa-crosshairs"></i>
                            Use Current Location
                        </button>
                    ` : ''}
                </div>
                
                <div class="location-instructions">
                    <small class="form-text">
                        <i class="fas fa-info-circle"></i>
                        <strong>Location Selection (Required):</strong><br>
                        • Your location is automatically set based on your address selections above<br>
                        • You can drag the pin or click elsewhere on the map for precise positioning<br>
                        • Use "Current Location" for GPS positioning (requires secure connection)<br>
                        • <strong>A pinned location is required to complete registration</strong>
                    </small>
                </div>
                
                <div id="${this.containerId}-map" class="location-map"></div>
                
                <div class="location-info">
                    <div id="${this.containerId}-coordinates" class="location-coordinates"></div>
                    <div id="${this.containerId}-address" class="location-address"></div>
                </div>
            </div>
        `;
    }

    initializeMap() {
        const mapElement = document.getElementById(`${this.containerId}-map`);
        
        this.map = L.map(mapElement).setView([this.options.defaultLat, this.options.defaultLng], this.options.defaultZoom);
        
        // Add OpenStreetMap tiles (free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add click handler for manual pin placement
        if (this.options.allowManualPin) {
            this.map.on('click', (e) => {
                this.setLocation(e.latlng.lat, e.latlng.lng);
            });
        }
    }

    setupLocationControls() {
        // Search functionality
        if (this.options.showSearchBox) {
            const searchInput = document.getElementById(`${this.containerId}-search`);
            // Search button is hidden as it's now read-only and auto-updated
        }

        // Current location
        if (this.options.showCurrentLocation) {
            const currentLocationBtn = document.getElementById(`${this.containerId}-current-location`);
            currentLocationBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }
    }

    async searchLocation(query) {
        try {
            // Use Nominatim API (free) for geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                this.setLocation(lat, lng);
                this.map.setView([lat, lng], 16);
            } else {
                this.showError('Location not found. Please try a different search term.');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            return;
        }

        const currentLocationBtn = document.getElementById(`${this.containerId}-current-location`);
        const originalText = currentLocationBtn.innerHTML;
        currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        currentLocationBtn.disabled = true;

        // Check if we're on HTTP and show a warning
        if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            this.showError('Geolocation requires HTTPS. Please use the search box or manually click on the map to set your location.');
            currentLocationBtn.innerHTML = originalText;
            currentLocationBtn.disabled = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                this.setLocation(lat, lng);
                this.map.setView([lat, lng], 16);
                
                currentLocationBtn.innerHTML = originalText;
                currentLocationBtn.disabled = false;
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Unable to get your location. ';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access or use the search box to find your location.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable. Please use the search box or click on the map.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out. Please try the search box or click on the map.';
                        break;
                    default:
                        errorMessage += 'Please use the search box or click on the map to set your location.';
                        break;
                }
                
                this.showError(errorMessage);
                currentLocationBtn.innerHTML = originalText;
                currentLocationBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    setLocation(lat, lng) {
        // Remove existing marker
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        // Add new marker
        this.marker = L.marker([lat, lng], {
            draggable: true
        }).addTo(this.map);

        // Handle marker drag
        this.marker.on('dragend', (e) => {
            const position = e.target.getLatLng();
            this.setLocation(position.lat, position.lng);
        });

        // Update selected location
        this.selectedLocation = { lat, lng };
        
        // Update coordinates display
        this.updateLocationDisplay(lat, lng);
        
        // Get address (reverse geocoding)
        this.reverseGeocode(lat, lng);
        
        // Call callback if provided
        if (this.options.onLocationSelect) {
            this.options.onLocationSelect({
                lat,
                lng,
                latLng: `${lat}, ${lng}`
            });
        }
    }

    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            if (data && data.display_name) {
                this.updateAddressDisplay(data.display_name);
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }

    updateLocationDisplay(lat, lng) {
        const coordinatesElement = document.getElementById(`${this.containerId}-coordinates`);
        if (coordinatesElement) {
            coordinatesElement.innerHTML = `
                <strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
            `;
        }
    }

    updateAddressDisplay(address) {
        const addressElement = document.getElementById(`${this.containerId}-address`);
        if (addressElement) {
            addressElement.innerHTML = `
                <strong>Address:</strong> ${address}
            `;
        }
    }

    showError(message) {
        // Create or update error message
        let errorElement = document.getElementById(`${this.containerId}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${this.containerId}-error`;
            errorElement.className = 'location-error';
            
            const wrapper = document.querySelector(`#${this.containerId} .location-picker-wrapper`);
            wrapper.insertBefore(errorElement, wrapper.firstChild);
        }
        
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> ${message}
        `;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    // Public methods
    getSelectedLocation() {
        return this.selectedLocation;
    }

    setSelectedLocation(lat, lng) {
        this.setLocation(lat, lng);
        this.map.setView([lat, lng], 16);
    }

    // New method to update search text based on address components
    updateAddressFromComboBox(district, city, barangay, streetAddress) {
        const addressParts = [];
        
        // Build address string from components
        if (streetAddress && streetAddress.trim()) {
            addressParts.push(streetAddress.trim());
        }
        if (barangay && barangay.trim()) {
            addressParts.push(barangay.trim());
        }
        if (city && city.trim()) {
            addressParts.push(city.trim());
        }
        if (district && district.trim()) {
            addressParts.push(district.trim());
        }
        
        const fullAddress = addressParts.join(', ');
        
        // Update the search input
        const searchInput = document.getElementById(`${this.containerId}-search`);
        if (searchInput) {
            searchInput.value = fullAddress;
        }
        
        // Automatically search for this location if we have enough information
        if (fullAddress.length > 0) {
            this.searchLocation(fullAddress);
        }
    }

    // Method to check if location is selected (for validation)
    isLocationSelected() {
        return this.selectedLocation !== null;
    }

    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        if (this.map) {
            this.map.remove();
        }
    }
}

// Export for use in other files
window.LocationPicker = LocationPicker;
