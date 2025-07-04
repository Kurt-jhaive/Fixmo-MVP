// Test the full login flow
import fetch from 'node-fetch';

async function testLoginFlow() {
    try {
        // Step 1: Login
        console.log('=== Step 1: Login ===');
        const loginResponse = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'testuser@example.com',
                password: 'testpassword123'
            })
        });

        if (!loginResponse.ok) {
            const error = await loginResponse.json();
            console.log('Login failed:', error);
            return;
        }

        const loginData = await loginResponse.json();
        console.log('Login successful:', loginData);
        
        const token = loginData.token;
        const userId = loginData.userId;
        
        // Step 2: Test protected endpoints
        console.log('\n=== Step 2: Test Protected Endpoints ===');
        
        // Test bookings endpoint
        const bookingsResponse = await fetch('http://localhost:3000/auth/bookings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Bookings endpoint status:', bookingsResponse.status);
        
        if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            console.log('Bookings data:', bookingsData);
        } else {
            const error = await bookingsResponse.json();
            console.log('Bookings error:', error);
        }
        
        // Test user profile endpoint
        const profileResponse = await fetch(`http://localhost:3000/auth/user-profile/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Profile endpoint status:', profileResponse.status);
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Profile data:', profileData);
        } else {
            const error = await profileResponse.json();
            console.log('Profile error:', error);
        }
        
    } catch (error) {
        console.error('Error testing login flow:', error);
    }
}

testLoginFlow();
