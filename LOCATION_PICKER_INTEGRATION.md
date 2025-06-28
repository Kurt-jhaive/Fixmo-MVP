# Updated Location Picker Integration Guide

## Changes Made

The LocationPicker component has been updated to be **non-optional** and automatically integrate with address combo boxes:

### Key Changes:
1. **Removed "Clear Location" button** - Location selection is now required
2. **Made search field read-only** - It automatically updates based on combo box selections
3. **Hidden search button** - Search is triggered automatically when address changes
4. **Added validation method** - `isLocationSelected()` to check if location is pinned
5. **New integration method** - `updateAddressFromComboBox()` to connect with address fields

## Usage with Address Combo Boxes

### HTML Structure
```html
<!-- Address combo boxes -->
<select id="district" name="district">
    <option value="">Select District</option>
    <!-- options -->
</select>

<select id="city" name="city">
    <option value="">Select City</option>
    <!-- options -->
</select>

<select id="barangay" name="barangay">
    <option value="">Select Barangay</option>
    <!-- options -->
</select>

<input type="text" id="street_address" name="street_address" placeholder="Street Address">

<!-- Location picker container -->
<div id="location-picker"></div>
```

### JavaScript Integration
```javascript
// Initialize location picker
const locationPicker = new LocationPicker('location-picker', {
    onLocationSelect: (location) => {
        if (location) {
            console.log('Location selected:', location);
            // Store location for form submission
            document.getElementById('exact_location').value = JSON.stringify(location);
        }
    }
});

// Connect combo boxes to location picker
function updateLocationFromAddress() {
    const district = document.getElementById('district').value;
    const city = document.getElementById('city').value;
    const barangay = document.getElementById('barangay').value;
    const streetAddress = document.getElementById('street_address').value;
    
    // Update location picker with current address selections
    locationPicker.updateAddressFromComboBox(district, city, barangay, streetAddress);
}

// Add event listeners to all address fields
document.getElementById('district').addEventListener('change', updateLocationFromAddress);
document.getElementById('city').addEventListener('change', updateLocationFromAddress);
document.getElementById('barangay').addEventListener('change', updateLocationFromAddress);
document.getElementById('street_address').addEventListener('input', updateLocationFromAddress);

// Form validation before submission
function validateLocationBeforeSubmit(event) {
    if (!locationPicker.isLocationSelected()) {
        event.preventDefault();
        alert('Please select your location on the map. This is required for registration.');
        return false;
    }
    return true;
}

// Add to form submit handler
document.getElementById('registration-form').addEventListener('submit', validateLocationBeforeSubmit);
```

## Features

### Automatic Location Updates
- When user selects district, city, barangay, or enters street address
- The search field automatically shows the combined address
- Location is automatically searched and pinned on the map

### Read-only Search Field
- User cannot manually type in the search field
- It only reflects the combo box selections
- Prevents confusion and ensures consistency

### Required Location Selection
- No "Clear Location" button available
- User must have a pinned location to proceed
- Validation method available: `isLocationSelected()`

### User Interaction Options
1. **Automatic pinning** from address combo box selections
2. **GPS location** using "Use Current Location" button
3. **Manual adjustment** by dragging the pin or clicking on map

## Methods Available

### `updateAddressFromComboBox(district, city, barangay, streetAddress)`
Updates the location picker based on address combo box selections.

### `isLocationSelected()`
Returns `true` if a location is currently pinned, `false` otherwise.

### `getSelectedLocation()`
Returns the current selected location object: `{lat, lng}` or `null`.

### `setSelectedLocation(lat, lng)`
Programmatically set a location on the map.

## Form Integration

Make sure to include a hidden field to store the exact location:
```html
<input type="hidden" id="exact_location" name="exact_location">
```

The location data will be stored as JSON string in the format:
```json
{
    "lat": 14.5995,
    "lng": 120.9842,
    "latLng": "14.5995, 120.9842"
}
```
