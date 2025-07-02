// Test booking request to debug the 400 error
async function testBooking() {
    try {
        console.log('🧪 Testing booking request...');
        
        // Test data that should work
        const bookingData = {
            customer_id: 1, // Assuming customer ID 1 exists
            provider_id: 2, // Francisco Saldi - owns the service listings  
            service_listing_id: 2, // Using existing service listing ID
            scheduled_date: '2025-07-03', // Tomorrow
            scheduled_time: '09:00',
            service_description: 'Test booking',
            final_price: 100
        };

        console.log('📤 Sending booking data:', JSON.stringify(bookingData, null, 2));

        const response = await fetch('http://localhost:3000/auth/book-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📥 Response body:', responseText);

        if (!response.ok) {
            console.error('❌ Request failed with status:', response.status);
            try {
                const errorData = JSON.parse(responseText);
                console.error('❌ Error details:', errorData);
            } catch (e) {
                console.error('❌ Raw error response:', responseText);
            }
        } else {
            console.log('✅ Booking successful!');
        }

    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

testBooking();
