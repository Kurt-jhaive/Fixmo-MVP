// Test the login endpoint
import fetch from 'node-fetch';

async function testLogin() {
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'testuser@example.com',
                password: 'testpassword123'
            })
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data);
            
            // Check if the expected fields are present
            if (data.token && data.userId && data.userName) {
                console.log('✓ All expected fields are present');
                console.log('Token:', data.token.substring(0, 20) + '...');
                console.log('User ID:', data.userId);
                console.log('User Name:', data.userName);
            } else {
                console.log('✗ Missing expected fields');
            }
        } else {
            const error = await response.json();
            console.log('Login failed:', error);
        }
    } catch (error) {
        console.error('Error testing login:', error);
    }
}

testLogin();
