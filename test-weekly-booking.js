const API_BASE = 'http://localhost:3000';

async function testWeeklyBooking() {
    try {
        console.log('🧪 Testing Weekly Booking System...\n');
        
        // Test 1: Get provider availability for a Monday
        console.log('📅 Test 1: Getting Monday availability for Provider 2');
        const mondayDate = '2025-07-07'; // This is a Monday
        
        const availabilityResponse = await fetch(
            `${API_BASE}/auth/provider/2/booking-availability?date=${mondayDate}`
        );
        const availabilityData = await availabilityResponse.json();
        
        console.log('Monday availability response:', JSON.stringify(availabilityData, null, 2));
        
        if (availabilityData.success && availabilityData.data.availability.length > 0) {
            const firstAvailableSlot = availabilityData.data.availability.find(slot => slot.status === 'available');
            
            if (firstAvailableSlot) {
                console.log(`\n✅ Found available slot: ${firstAvailableSlot.startTime} - ${firstAvailableSlot.endTime}`);
                
                // Test 2: Book the first available slot
                console.log(`\n📝 Test 2: Booking the ${firstAvailableSlot.startTime} slot on Monday`);
                
                const bookingData = {
                    customer_id: 1, // Assuming customer ID 1 exists
                    provider_id: 2,
                    service_listing_id: 2, // Use an existing service listing
                    scheduled_date: mondayDate,
                    scheduled_time: firstAvailableSlot.startTime,
                    service_description: 'Weekly booking test',
                    final_price: 100
                };
                
                console.log('Booking data:', JSON.stringify(bookingData, null, 2));
                
                const bookingResponse = await fetch(`${API_BASE}/auth/book-appointment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });
                
                const bookingResult = await bookingResponse.json();
                console.log('Booking response:', JSON.stringify(bookingResult, null, 2));
                
                if (bookingResult.message === 'Appointment booked successfully') {
                    console.log('✅ Booking successful!');
                    
                    // Test 3: Try to book the same weekly slot again (should fail)
                    console.log(`\n🚫 Test 3: Trying to book the same weekly slot again (should fail)`);
                    
                    const duplicateBookingResponse = await fetch(`${API_BASE}/auth/book-appointment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...bookingData,
                            customer_id: 1, // Different customer
                            service_description: 'Duplicate weekly booking test'
                        })
                    });
                    
                    const duplicateResult = await duplicateBookingResponse.json();
                    console.log('Duplicate booking response:', JSON.stringify(duplicateResult, null, 2));
                    
                    if (duplicateResult.message && duplicateResult.message.includes('booked')) {
                        console.log('✅ Correctly prevented duplicate weekly booking!');
                    } else {
                        console.log('❌ Duplicate booking prevention failed');
                    }
                    
                    // Test 4: Check availability again to see if slot is marked as booked
                    console.log(`\n🔍 Test 4: Checking if the weekly slot is now marked as booked`);
                    
                    const updatedAvailabilityResponse = await fetch(
                        `${API_BASE}/auth/provider/2/booking-availability?date=${mondayDate}`
                    );
                    const updatedAvailabilityData = await updatedAvailabilityResponse.json();
                    
                    if (updatedAvailabilityData.success) {
                        const bookedSlot = updatedAvailabilityData.data.availability.find(
                            slot => slot.startTime === firstAvailableSlot.startTime
                        );
                        
                        if (bookedSlot && bookedSlot.status === 'booked') {
                            console.log('✅ Weekly slot correctly marked as booked!');
                            console.log(`Slot status: ${bookedSlot.status}`);
                        } else {
                            console.log('❌ Weekly slot booking status not updated correctly');
                            console.log('Slot details:', bookedSlot);
                        }
                    }
                    
                } else {
                    console.log('❌ Booking failed:', bookingResult.message);
                }
                
            } else {
                console.log('❌ No available slots found on Monday');
            }
        } else {
            console.log('❌ Failed to get availability or no slots available');
        }
        
        // Test 5: Try booking on a different day (Tuesday)
        console.log(`\n📅 Test 5: Testing Tuesday availability`);
        const tuesdayDate = '2025-07-08'; // This is a Tuesday
        
        const tuesdayAvailabilityResponse = await fetch(
            `${API_BASE}/auth/provider/2/booking-availability?date=${tuesdayDate}`
        );
        const tuesdayAvailabilityData = await tuesdayAvailabilityResponse.json();
        
        console.log('Tuesday availability:', JSON.stringify(tuesdayAvailabilityData, null, 2));
        
        if (tuesdayAvailabilityData.success && tuesdayAvailabilityData.data.availability.length > 0) {
            console.log('✅ Tuesday availability loaded correctly');
            console.log(`Available slots on Tuesday: ${tuesdayAvailabilityData.data.availability.length}`);
        }
        
        console.log('\n🎉 Weekly booking system test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testWeeklyBooking();
