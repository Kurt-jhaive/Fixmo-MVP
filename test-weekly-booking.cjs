async function testWeeklyBooking() {
    try {
        console.log('🧪 Testing weekly booking system...');
        
        const baseURL = 'http://localhost:3000';
        
        // Test booking data - using next Monday
        const nextMonday = new Date();
        const daysToAdd = (1 - nextMonday.getDay() + 7) % 7; // Get next Monday
        if (daysToAdd === 0) nextMonday.setDate(nextMonday.getDate() + 7); // If today is Monday, get next Monday
        else nextMonday.setDate(nextMonday.getDate() + daysToAdd);
        
        const bookingData = {
            customer_id: 1,
            provider_id: 2, // Francisco Saldi
            service_listing_id: 2,
            scheduled_date: nextMonday.toISOString().split('T')[0], // YYYY-MM-DD format
            scheduled_time: '10:00', // Changed to available time slot
            service_description: 'Weekly booking test',
            final_price: 100
        };
        
        console.log('📅 Booking for next Monday:', bookingData.scheduled_date);
        console.log('🕘 Time slot:', bookingData.scheduled_time);
        
        // Make the booking request
        const response = await fetch(`${baseURL}/auth/book-appointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        console.log('📊 Booking Response Status:', response.status);
        console.log('📊 Booking Response:', JSON.stringify(result, null, 2));
        
        if (result.appointment) {
            console.log('✅ Weekly booking successful!');
            console.log('📅 Appointment ID:', result.appointment.appointment_id);
            console.log('📅 Scheduled for:', result.appointment.scheduled_date);
            console.log('📅 Status:', result.appointment.appointment_status);
            
            // Try to book the same weekly slot again to test double booking prevention
            console.log('\n🔄 Testing double booking prevention...');
            
            const secondBookingData = {
                ...bookingData,
                customer_id: 2, // Different customer trying to book same weekly slot
                service_description: 'Attempting double booking'
            };
            
            const secondResponse = await fetch(`${baseURL}/auth/book-appointment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(secondBookingData)
            });
            
            const secondResult = await secondResponse.json();
            
            console.log('📊 Second Booking Status:', secondResponse.status);
            console.log('📊 Second Booking Response:', JSON.stringify(secondResult, null, 2));
            
            if (secondResponse.status === 400 && secondResult.message.includes('booked')) {
                console.log('✅ Double booking prevention working correctly!');
            } else {
                console.log('❌ Double booking prevention may not be working');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testWeeklyBooking();
