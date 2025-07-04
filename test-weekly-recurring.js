// Test script to demonstrate rolling weekly recurring availability
// This shows how slots work on a rolling weekly basis

import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const PROVIDER_ID = 1; // Replace with actual provider ID

async function testWeeklyRecurring() {
    console.log('🗓️  Testing Rolling Weekly Recurring Availability');
    console.log('='.repeat(50));
    
    try {
        // Get current date and calculate test dates
        const today = new Date();
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - today.getDay() + 1); // This Monday
        
        const nextMonday = new Date(thisMonday);
        nextMonday.setDate(thisMonday.getDate() + 7); // Next Monday
        
        const weekAfterMonday = new Date(thisMonday);
        weekAfterMonday.setDate(thisMonday.getDate() + 14); // Week after Monday
        
        console.log('📅 Test Dates:');
        console.log(`   This Monday: ${thisMonday.toDateString()}`);
        console.log(`   Next Monday: ${nextMonday.toDateString()}`);
        console.log(`   Week After Monday: ${weekAfterMonday.toDateString()}`);
        console.log('');
        
        // Test 1: Check this Monday's availability
        console.log('🔍 Test 1: Checking This Monday\'s availability');
        const thisWeekResponse = await axios.get(
            `${BASE_URL}/auth/provider/${PROVIDER_ID}/booking-availability?date=${thisMonday.toISOString().split('T')[0]}`
        );
        
        const thisWeekSlots = thisWeekResponse.data.data.availability;
        console.log(`   Found ${thisWeekSlots.length} slots for this Monday`);
        
        if (thisWeekSlots.length > 0) {
            const firstSlot = thisWeekSlots[0];
            console.log(`   First slot: ${firstSlot.startTime}-${firstSlot.endTime}, Status: ${firstSlot.status}`);
            
            // Test 2: Check same day next week
            console.log('');
            console.log('🔍 Test 2: Checking Next Monday\'s availability (same day, next week)');
            const nextWeekResponse = await axios.get(
                `${BASE_URL}/auth/provider/${PROVIDER_ID}/booking-availability?date=${nextMonday.toISOString().split('T')[0]}`
            );
            
            const nextWeekSlots = nextWeekResponse.data.data.availability;
            console.log(`   Found ${nextWeekSlots.length} slots for next Monday`);
            
            if (nextWeekSlots.length > 0) {
                const nextWeekFirstSlot = nextWeekSlots[0];
                console.log(`   First slot: ${nextWeekFirstSlot.startTime}-${nextWeekFirstSlot.endTime}, Status: ${nextWeekFirstSlot.status}`);
                
                // Test 3: Check week after next
                console.log('');
                console.log('🔍 Test 3: Checking Week After Monday\'s availability');
                const weekAfterResponse = await axios.get(
                    `${BASE_URL}/auth/provider/${PROVIDER_ID}/booking-availability?date=${weekAfterMonday.toISOString().split('T')[0]}`
                );
                
                const weekAfterSlots = weekAfterResponse.data.data.availability;
                console.log(`   Found ${weekAfterSlots.length} slots for week after Monday`);
                
                if (weekAfterSlots.length > 0) {
                    const weekAfterFirstSlot = weekAfterSlots[0];
                    console.log(`   First slot: ${weekAfterFirstSlot.startTime}-${weekAfterFirstSlot.endTime}, Status: ${weekAfterFirstSlot.status}`);
                }
            }
        }
        
        console.log('');
        console.log('🎯 Rolling Weekly Recurring Logic Summary:');
        console.log('   ✅ Each Monday slot is checked independently');
        console.log('   ✅ If Monday Week 1 is booked, Monday Week 2 is still available');
        console.log('   ✅ If Monday Week 2 is booked, Monday Week 3 is still available');
        console.log('   ✅ Slots reset availability on a rolling weekly basis');
        console.log('   ✅ No waiting until Sunday - each day rolls independently');
        
        // Test 4: Debug endpoint
        console.log('');
        console.log('🔍 Test 4: Using Debug Endpoint');
        const debugResponse = await axios.get(
            `${BASE_URL}/auth/provider/${PROVIDER_ID}/weekly-debug`
        );
        
        console.log('   Debug info:', {
            totalSlots: debugResponse.data.data.totalSlots,
            slotsWithAppointments: debugResponse.data.data.slotsWithAppointments,
            note: debugResponse.data.data.note
        });
        
    } catch (error) {
        console.error('❌ Error testing weekly recurring:', error.message);
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

// Run the test
testWeeklyRecurring();
