// Test booking to see the exact error
const API_BASE = 'http://localhost:3000';

async function quickBookingTest() {
    try {
        console.log('🔍 Quick test to trigger the 500 error...');
        
        const bookingData = {
            customer_id: 1,
            provider_id: 2,
            service_listing_id: 2,
            scheduled_date: '2025-07-07',
            scheduled_time: '08:00',
            service_description: 'Test booking',
            final_price: 100
        };
        
        console.log('Sending booking request...');
        
        const response = await fetch(`${API_BASE}/auth/book-appointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', result);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

quickBookingTest();
