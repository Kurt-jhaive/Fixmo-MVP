async function testServer() {
    try {
        console.log('Testing server connection...');
        const response = await fetch('http://localhost:3000/', {
            method: 'GET'
        });
        
        console.log('Server response status:', response.status);
        const text = await response.text();
        console.log('Server response text:', text.substring(0, 100) + '...');
        
    } catch (error) {
        console.error('Server test error:', error.message);
    }
}

testServer();
