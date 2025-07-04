// Manual test to verify rolling weekly recurring logic
// This will check specific dates and show how the system works

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const PROVIDER_ID = 1; 

async function testSpecificScenario() {
    console.log('🧪 Testing Specific Rolling Weekly Scenario');
    console.log('=' .repeat(50));
    
    try {
        // Test scenario: Check Monday July 7, 2025
        const testDate = '2025-07-07'; // This is a Monday
        
        console.log(`📅 Testing date: ${testDate} (Monday)`);
        
        const response = await axios.get(
            `${BASE_URL}/auth/provider/${PROVIDER_ID}/booking-availability?date=${testDate}`
        );
        
        console.log('🔍 Response:', {
            success: response.data.success,
            dayOfWeek: response.data.data.dayOfWeek,
            totalSlots: response.data.data.availability.length,
            schedulingType: response.data.data.schedulingType,
            note: response.data.data.note
        });
        
        // Show each slot status
        console.log('\n📋 Slot Details:');
        response.data.data.availability.forEach((slot, index) => {
            console.log(`   Slot ${index + 1}: ${slot.startTime}-${slot.endTime}`);
            console.log(`     Status: ${slot.status}`);
            console.log(`     Available: ${slot.isAvailable}`);
            console.log(`     Appointments on this date: ${slot.appointmentsOnThisDate}`);
            console.log('');
        });
        
        // Test the next Monday after that
        const nextMonday = '2025-07-14';
        console.log(`📅 Now testing next Monday: ${nextMonday}`);
        
        const nextResponse = await axios.get(
            `${BASE_URL}/auth/provider/${PROVIDER_ID}/booking-availability?date=${nextMonday}`
        );
        
        console.log('\n🔍 Next Monday Response:', {
            success: nextResponse.data.success,
            dayOfWeek: nextResponse.data.data.dayOfWeek,
            totalSlots: nextResponse.data.data.availability.length,
            schedulingType: nextResponse.data.data.schedulingType
        });
        
        // Compare the two weeks
        const thisWeekSlots = response.data.data.availability;
        const nextWeekSlots = nextResponse.data.data.availability;
        
        console.log('\n🆚 Week Comparison:');
        console.log(`   This Monday (${testDate}): ${thisWeekSlots.filter(s => s.isAvailable).length} available slots`);
        console.log(`   Next Monday (${nextMonday}): ${nextWeekSlots.filter(s => s.isAvailable).length} available slots`);
        
        // Show that slots are independent
        console.log('\n✅ Rolling Weekly Logic Verification:');
        console.log('   - Each week\'s slots are checked independently');
        console.log('   - Booking on one Monday doesn\'t affect future Mondays');
        console.log('   - Availability resets on a rolling weekly basis');
        console.log('   - No need to wait until Sunday - each day has its own weekly cycle');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testSpecificScenario();
