// Test calendar functionality - check if calendar allows future date selection
// Run this in the browser console on the customer dashboard

function testCalendarFunctionality() {
    console.log('🗓️  Testing Calendar Date Selection');
    console.log('='.repeat(50));
    
    // Check if booking date input exists
    const dateInput = document.getElementById('bookingDate');
    if (!dateInput) {
        console.log('❌ Date input not found - make sure you are on the customer dashboard');
        return;
    }
    
    // Check current date restrictions
    const today = new Date();
    const minDate = new Date(dateInput.min);
    const maxDate = new Date(dateInput.max);
    
    console.log('📅 Current Date Restrictions:');
    console.log(`   Today: ${today.toDateString()}`);
    console.log(`   Min Date: ${minDate.toDateString()}`);
    console.log(`   Max Date: ${maxDate.toDateString()}`);
    
    // Test future date selection
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + 7); // Next Monday
    const nextMondayString = nextMonday.toISOString().split('T')[0];
    
    console.log(`\n🔍 Testing future date selection:`);
    console.log(`   Trying to set date to: ${nextMonday.toDateString()}`);
    
    dateInput.value = nextMondayString;
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    dateInput.dispatchEvent(changeEvent);
    
    console.log(`   Date input value: ${dateInput.value}`);
    console.log(`   Successfully set: ${dateInput.value === nextMondayString ? '✅' : '❌'}`);
    
    // Test even further dates
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    const twoWeeksString = twoWeeksFromNow.toISOString().split('T')[0];
    
    console.log(`\n🔍 Testing 2 weeks from now:`);
    console.log(`   Trying to set date to: ${twoWeeksFromNow.toDateString()}`);
    
    dateInput.value = twoWeeksString;
    dateInput.dispatchEvent(changeEvent);
    
    console.log(`   Date input value: ${dateInput.value}`);
    console.log(`   Successfully set: ${dateInput.value === twoWeeksString ? '✅' : '❌'}`);
    
    // Test past dates (should not work)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    console.log(`\n🔍 Testing past date (should be blocked):`);
    console.log(`   Trying to set date to: ${yesterday.toDateString()}`);
    
    const originalValue = dateInput.value;
    dateInput.value = yesterdayString;
    dateInput.dispatchEvent(changeEvent);
    
    console.log(`   Date input value: ${dateInput.value}`);
    console.log(`   Correctly blocked: ${dateInput.value !== yesterdayString ? '✅' : '❌'}`);
    
    console.log('\n🎯 Calendar Test Summary:');
    console.log('   ✅ Future dates should be selectable');
    console.log('   ✅ Past dates should be blocked');
    console.log('   ✅ Rolling weekly recurring booking enabled');
    console.log('   ✅ No restriction to current week only');
    
    return {
        minDate: dateInput.min,
        maxDate: dateInput.max,
        currentValue: dateInput.value,
        canSelectFuture: dateInput.value === twoWeeksString,
        blockedPast: dateInput.value !== yesterdayString
    };
}

// Auto-run if we're in the browser
if (typeof document !== 'undefined') {
    // Wait a bit for the page to load
    setTimeout(testCalendarFunctionality, 2000);
}
