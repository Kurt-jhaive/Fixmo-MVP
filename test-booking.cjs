async function testBooking() {
    try {
        // First, let's test the login to get a token
        console.log('🔐 Testing customer login...');
        const loginResponse = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'testcustomer@example.com',
                password: 'test123'
            })
        });

        if (!loginResponse.ok) {
            console.error('❌ Login failed:', loginResponse.status, await loginResponse.text());
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login successful!');
        console.log('  User ID:', loginData.userId);
        console.log('  Token:', loginData.token.substring(0, 20) + '...');

        // Test booking for Provider 2 on Monday (July 7, 2025) at 10:00 - should match exact slot
        console.log('\n📅 Testing booking for exact availability slot...');
        console.log('  Provider: 2 (Francisco Saldi)');
        console.log('  Date: 2025-07-07 (Monday)');
        console.log('  Time: 10:00');
        console.log('  Expected: SUCCESS (matches availability slot: Monday 10:00-11:00)');

        const bookingResponse = await fetch('http://localhost:3000/auth/book-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({
                customer_id: loginData.userId,
                provider_id: 2,
                scheduled_date: '2025-07-07',
                scheduled_time: '10:00',
                service_description: 'Test exact slot booking - 10:00 slot',
                estimated_price: 100
            })
        });

        const bookingData = await bookingResponse.text();
        console.log('\n📋 Booking Response:');
        console.log('  Status:', bookingResponse.status);
        console.log('  Response:', bookingData);

        if (bookingResponse.ok) {
            console.log('✅ Booking successful! The exact slot system is working.');
        } else {
            console.log('❌ Booking failed. Let\'s check the server logs.');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testBooking();
