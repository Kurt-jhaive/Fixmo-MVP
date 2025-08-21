/**
 * Metro Manila Location Autocomplete with OpenStreetMap Integration
 * Uses local JSON data and displays locations on OpenStreetMap
 */

console.log('Location autocomplete module loaded successfully');

class MetroManilaAutocomplete {
    constructor(inputId, suggestionsId = null, mapContainerId = null) {
        this.inputElement = document.getElementById(inputId);
        this.suggestionsElement = suggestionsId ? document.getElementById(suggestionsId) : null;
        this.mapContainer = mapContainerId ? document.getElementById(mapContainerId) : null;
        this.inputTimer = null;
        this.selectedIndex = -1;
        this.map = null;
        this.marker = null;
        this.locationData = null;
        this.allLocations = [];
        
        // Metro Manila boundaries
        this.metroManilaBounds = {
            north: 14.7644,
            south: 14.3833,
            east: 121.1029,
            west: 120.9431
        };

        this.init();
    }

    async init() {
        if (!this.inputElement) {
            console.error('Location input element not found');
            return;
        }

        // Load location data from JSON
        await this.loadLocationData();
        
        // Initialize autocomplete
        this.initAutocomplete();
        
        // Initialize map if container provided
        if (this.mapContainer) {
            this.initMap();
        }
    }

    async loadLocationData() {
        try {
            const response = await fetch('/data/metro-manila-locations.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.locationData = await response.json();
            this.buildLocationsList();
            console.log('Metro Manila location data loaded successfully');
        } catch (error) {
            console.error('Failed to load location data:', error);
            // Fallback to basic locations
            this.initFallbackLocations();
        }
    }

    buildLocationsList() {
        this.allLocations = [];
        
        if (!this.locationData || !this.locationData.regions) {
            return;
        }

        const ncr = this.locationData.regions[0]; // NCR is the first region
        
        // Add cities
        if (ncr.cities) {
            ncr.cities.forEach(city => {
                // Add main city
                this.allLocations.push({
                    name: `${city.name}, Metro Manila`,
                    type: 'city',
                    coordinates: city.coordinates,
                    fullData: city
                });

                // Add districts if available
                if (city.districts) {
                    city.districts.forEach(district => {
                        this.allLocations.push({
                            name: `${district.name}, ${city.name}, Metro Manila`,
                            type: district.type || 'district',
                            coordinates: district.coordinates,
                            fullData: district,
                            parentCity: city.name
                        });
                    });
                }

                // Add some popular barangays
                if (city.barangays && city.barangays.length > 0) {
                    // Add first 10 barangays to avoid overwhelming the list
                    city.barangays.slice(0, 10).forEach(barangay => {
                        this.allLocations.push({
                            name: `${barangay}, ${city.name}, Metro Manila`,
                            type: 'barangay',
                            coordinates: city.coordinates, // Use city coordinates as fallback
                            fullData: { name: barangay },
                            parentCity: city.name
                        });
                    });
                }
            });
        }

        // Add municipalities
        if (ncr.municipalities) {
            ncr.municipalities.forEach(municipality => {
                this.allLocations.push({
                    name: `${municipality.name}, Metro Manila`,
                    type: 'municipality',
                    coordinates: municipality.coordinates,
                    fullData: municipality
                });

                // Add barangays
                if (municipality.barangays) {
                    municipality.barangays.forEach(barangay => {
                        this.allLocations.push({
                            name: `${barangay}, ${municipality.name}, Metro Manila`,
                            type: 'barangay',
                            coordinates: municipality.coordinates,
                            fullData: { name: barangay },
                            parentCity: municipality.name
                        });
                    });
                }
            });
        }

        console.log(`Loaded ${this.allLocations.length} Metro Manila locations`);
    }

    initFallbackLocations() {
        this.allLocations = [
            { name: 'Caloocan City, Metro Manila', type: 'city', coordinates: { lat: 14.6507, lng: 120.9672 } },
            { name: 'Las Piñas City, Metro Manila', type: 'city', coordinates: { lat: 14.4640, lng: 120.9830 } },
            { name: 'Makati City, Metro Manila', type: 'city', coordinates: { lat: 14.5547, lng: 121.0244 } },
            { name: 'Malabon City, Metro Manila', type: 'city', coordinates: { lat: 14.6570, lng: 120.9564 } },
            { name: 'Mandaluyong City, Metro Manila', type: 'city', coordinates: { lat: 14.5832, lng: 121.0409 } },
            { name: 'Manila City, Metro Manila', type: 'city', coordinates: { lat: 14.5995, lng: 120.9842 } },
            { name: 'Marikina City, Metro Manila', type: 'city', coordinates: { lat: 14.6507, lng: 121.1029 } },
            { name: 'Muntinlupa City, Metro Manila', type: 'city', coordinates: { lat: 14.3833, lng: 121.0167 } },
            { name: 'Navotas City, Metro Manila', type: 'city', coordinates: { lat: 14.6708, lng: 120.9461 } },
            { name: 'Parañaque City, Metro Manila', type: 'city', coordinates: { lat: 14.4793, lng: 121.0198 } },
            { name: 'Pasay City, Metro Manila', type: 'city', coordinates: { lat: 14.5378, lng: 120.9964 } },
            { name: 'Pasig City, Metro Manila', type: 'city', coordinates: { lat: 14.5764, lng: 121.0851 } },
            { name: 'Quezon City, Metro Manila', type: 'city', coordinates: { lat: 14.6760, lng: 121.0437 } },
            { name: 'San Juan City, Metro Manila', type: 'city', coordinates: { lat: 14.6019, lng: 121.0355 } },
            { name: 'Taguig City, Metro Manila', type: 'city', coordinates: { lat: 14.5176, lng: 121.0509 } },
            { name: 'Valenzuela City, Metro Manila', type: 'city', coordinates: { lat: 14.7000, lng: 120.9833 } },
            { name: 'Pateros, Metro Manila', type: 'municipality', coordinates: { lat: 14.5441, lng: 121.0618 } },
            
            // Popular areas
            { name: 'Bonifacio Global City, Taguig City, Metro Manila', type: 'business_district', coordinates: { lat: 14.5486, lng: 121.0508 } },
            { name: 'Ortigas Center, Pasig City, Metro Manila', type: 'business_district', coordinates: { lat: 14.5833, lng: 121.0667 } },
            { name: 'Alabang, Muntinlupa City, Metro Manila', type: 'district', coordinates: { lat: 14.4167, lng: 121.0167 } },
            { name: 'Cubao, Quezon City, Metro Manila', type: 'business_district', coordinates: { lat: 14.6198, lng: 121.0509 } },
            { name: 'Binondo, Manila City, Metro Manila', type: 'district', coordinates: { lat: 14.6001, lng: 120.9736 } },
            { name: 'Ermita, Manila City, Metro Manila', type: 'district', coordinates: { lat: 14.5827, lng: 120.9859 } },
            { name: 'Malate, Manila City, Metro Manila', type: 'district', coordinates: { lat: 14.5715, lng: 120.9830 } }
        ];
        console.log('Using fallback location data');
    }

    initAutocomplete() {
        if (!this.suggestionsElement) {
            console.warn('Suggestions container not found, using input-only mode');
            this.initInputOnlyMode();
            return;
        }

        this.inputElement.addEventListener('input', (e) => {
            clearTimeout(this.inputTimer);
            
            this.inputTimer = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();
                
                if (query.length < 2) {
                    this.hideSuggestions();
                    return;
                }

                this.searchLocations(query);
            }, 300);
        });

        this.setupKeyboardNavigation();
        this.setupEventListeners();
        
        console.log('Local JSON-based location search initialized');
    }

    initInputOnlyMode() {
        this.inputElement.addEventListener('blur', () => {
            const value = this.inputElement.value.trim();
            if (value && !this.isValidLocation()) {
                this.showError('Please enter a valid location within Metro Manila.');
            }
        });
        
        console.log('Input-only location validation initialized');
    }

    searchLocations(query) {
        const filteredLocations = this.allLocations.filter(location => 
            location.name.toLowerCase().includes(query)
        );
        
        // Sort by relevance (exact matches first, then type priority)
        filteredLocations.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            // Exact match priority
            if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
            if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
            
            // Type priority: city > business_district > district > barangay
            const typePriority = { 'city': 1, 'municipality': 2, 'business_district': 3, 'district': 4, 'barangay': 5 };
            return (typePriority[a.type] || 6) - (typePriority[b.type] || 6);
        });
        
        if (filteredLocations.length > 0) {
            this.showSuggestions(filteredLocations.slice(0, 10)); // Limit to 10 results
        } else {
            this.showNoResults();
        }
    }

    showNoResults() {
        if (!this.suggestionsElement) return;
        
        this.suggestionsElement.innerHTML = '';
        this.suggestionsElement.className = 'location-suggestions active';
        
        const noResultsElement = document.createElement('div');
        noResultsElement.className = 'location-suggestion';
        noResultsElement.innerHTML = `
            <i class="fas fa-search" style="margin-right: 8px; color: #999;"></i>
            <span style="color: #666;">No locations found in Metro Manila</span>
        `;
        noResultsElement.style.cursor = 'default';
        
        this.suggestionsElement.appendChild(noResultsElement);
        this.suggestionsElement.style.display = 'block';
        this.selectedIndex = -1;
    }

    setupKeyboardNavigation() {
        this.inputElement.addEventListener('keydown', (e) => {
            const suggestions = this.suggestionsElement?.querySelectorAll('.location-suggestion:not(.disabled)');
            if (!suggestions || suggestions.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = this.selectedIndex < suggestions.length - 1 ? this.selectedIndex + 1 : 0;
                    this.updateSuggestionSelection(suggestions);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : suggestions.length - 1;
                    this.updateSuggestionSelection(suggestions);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) {
                        suggestions[this.selectedIndex].click();
                    }
                    break;
                case 'Escape':
                    this.hideSuggestions();
                    break;
            }
        });
    }

    setupEventListeners() {
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target) && 
                !this.suggestionsElement?.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    showSuggestions(locations) {
        if (!this.suggestionsElement) return;

        this.suggestionsElement.innerHTML = '';
        this.suggestionsElement.className = 'location-suggestions active';
        
        locations.forEach((location, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'location-suggestion';
            
            // Icon based on type
            let icon = 'fa-map-marker-alt';
            switch (location.type) {
                case 'city':
                case 'municipality':
                    icon = 'fa-city';
                    break;
                case 'business_district':
                    icon = 'fa-building';
                    break;
                case 'district':
                    icon = 'fa-map-signs';
                    break;
                case 'barangay':
                    icon = 'fa-home';
                    break;
            }
            
            suggestionElement.innerHTML = `
                <i class="fas ${icon}" style="margin-right: 8px; color: #007bff;"></i>
                <div>
                    <div class="location-name">${location.name}</div>
                    <div class="location-type">${this.formatLocationType(location.type)}</div>
                </div>
            `;
            
            suggestionElement.addEventListener('click', () => {
                this.selectLocation(location);
            });
            
            this.suggestionsElement.appendChild(suggestionElement);
        });
        
        this.suggestionsElement.style.display = 'block';
        this.selectedIndex = -1;
    }

    formatLocationType(type) {
        const typeMap = {
            'city': 'City',
            'municipality': 'Municipality',
            'business_district': 'Business District',
            'district': 'District',
            'barangay': 'Barangay'
        };
        return typeMap[type] || 'Location';
    }

    hideSuggestions() {
        if (this.suggestionsElement) {
            this.suggestionsElement.style.display = 'none';
            this.suggestionsElement.className = 'location-suggestions';
        }
        this.selectedIndex = -1;
    }

    selectLocation(location) {
        this.inputElement.value = location.name;
        this.hideSuggestions();
        
        // Update map if available
        if (this.map && location.coordinates) {
            this.updateMapLocation(location.coordinates, location.name);
        }
        
        // Trigger custom event for external handlers
        this.inputElement.dispatchEvent(new CustomEvent('locationSelected', {
            detail: { location }
        }));
        
        console.log('Location selected:', location.name);
    }

    updateSuggestionSelection(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    isValidLocation() {
        const value = this.inputElement.value.trim().toLowerCase();
        return this.allLocations.some(location => 
            location.name.toLowerCase() === value
        );
    }

    onLocationSelected(location) {
        // Override this method to handle location selection
        console.log('Location selected:', location);
    }

    showError(message) {
        console.error('Location error:', message);
    }

    getValue() {
        return this.inputElement.value;
    }

    setValue(value) {
        this.inputElement.value = value;
    }

    clear() {
        this.inputElement.value = '';
        this.hideSuggestions();
    }

    disable() {
        this.inputElement.disabled = true;
    }

    enable() {
        this.inputElement.disabled = false;
    }

    // Map-related methods
    initMap() {
        if (!this.mapContainer) {
            console.warn('Map container not provided');
            return;
        }

        try {
            // Initialize Leaflet map centered on Metro Manila
            this.map = L.map(this.mapContainer).setView([14.5995, 120.9842], 11);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            // Add initial marker
            this.marker = L.marker([14.5995, 120.9842]).addTo(this.map)
                .bindPopup('Metro Manila')
                .openPopup();

            console.log('OpenStreetMap initialized successfully');
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.mapContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Map could not be loaded</p>';
        }
    }

    updateMapLocation(coordinates, locationName) {
        if (!this.map) return;

        const lat = coordinates.lat;
        const lng = coordinates.lng;

        // Update marker position
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
        }

        // Update popup content
        this.marker.bindPopup(locationName).openPopup();

        // Center map on the new location
        this.map.setView([lat, lng], 15);

        console.log(`Map updated to: ${locationName} (${lat}, ${lng})`);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetroManilaAutocomplete;
}
