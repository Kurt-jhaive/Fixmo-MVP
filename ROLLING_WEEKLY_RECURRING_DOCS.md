# Rolling Weekly Recurring Availability System

## Overview
The Fixmo booking system implements a **rolling weekly recurring availability** system. This means that time slots are available on a weekly basis, but they recur independently for each day - not on a fixed weekly schedule.

## How It Works

### Key Concept: Day-Independent Rolling Recurrence
- Each day of the week has its own independent rolling cycle
- When a slot is booked for a specific date, it only affects that specific date
- The same slot becomes available again for the next week's occurrence of that day

### Example Scenario
```
Monday Week 1 (July 7, 2025):
- 9:00 AM slot gets booked ❌

Tuesday Week 1 (July 8, 2025):
- Monday Week 2 (July 14, 2025) 9:00 AM slot is already available ✅
- No need to wait until Sunday to reset

Monday Week 2 (July 14, 2025):
- 9:00 AM slot is available ✅ (independent from Week 1)
```

## Implementation Details

### Database Structure
- `availability` table stores weekly time slots (dayOfWeek + startTime + endTime)
- `appointments` table stores actual bookings with specific dates
- No `isBooked` field - booking status is calculated dynamically

### Booking Logic
1. **Slot Definition**: Availability slots are defined by day of week and time range
2. **Booking Check**: When checking availability for a specific date:
   - Find all slots for that day of the week
   - Check if any appointments exist for that EXACT date
   - Mark slots as booked only if appointments exist for that specific date
3. **Rolling Availability**: Slots are available for future occurrences of the same day

### API Endpoints

#### Get Booking Availability
```
GET /auth/provider/:providerId/booking-availability?date=2025-07-07
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "date": "2025-07-07",
    "dayOfWeek": "Monday",
    "schedulingType": "weekly-recurring",
    "note": "Weekly recurring availability: Slots automatically become available again each week",
    "availability": [
      {
        "availability_id": 1,
        "dayOfWeek": "Monday",
        "startTime": "09:00",
        "endTime": "10:00",
        "isAvailable": true,
        "status": "available",
        "appointmentsOnThisDate": 0
      }
    ]
  }
}
```

#### Debug Endpoint
```
GET /auth/provider/:providerId/weekly-debug
```

## Status Values
- **`available`**: Slot is open for booking
- **`booked`**: Slot has an active appointment for this specific date
- **`past`**: Slot is in the past (date has passed or time has passed for today)

## Benefits

### For Customers
- ✅ Easy to understand: Monday 9 AM is always Monday 9 AM
- ✅ Predictable availability: know when slots will be available
- ✅ No waiting periods: slots become available immediately for future weeks

### For Providers
- ✅ Flexible scheduling: set weekly availability once
- ✅ No manual slot management: system handles recurrence automatically
- ✅ Consistent booking patterns: regular customers can book same slots

### For System
- ✅ Scalable: doesn't require creating infinite future slots
- ✅ Clean data: no duplicate slot records
- ✅ Flexible: can easily modify weekly patterns

## Testing the System

### Manual Testing
1. Book a slot for Monday Week 1
2. Check availability for Monday Week 2 (should be available)
3. Check availability for Monday Week 3 (should be available)
4. Verify that Tuesday of Week 1 already shows Monday Week 2 as available

### Automated Testing
Use the provided test scripts:
- `test-weekly-recurring.js` - General rolling weekly test
- `test-specific-scenario.js` - Specific date scenario test

## Common Questions

**Q: What happens if I book Monday 9 AM for this week?**
A: Only that specific Monday date is marked as booked. Next Monday's 9 AM slot is still available.

**Q: When do slots become available for next week?**
A: Immediately! As soon as the current day passes, the same day next week is available for booking.

**Q: Do I need to wait until Sunday for slots to reset?**
A: No! Each day rolls independently. Monday slots for next week are available as soon as this Monday passes.

**Q: Can I book multiple weeks in advance?**
A: Yes! You can book any Monday 9 AM slot for any future Monday, as long as that specific date isn't already booked.

## Technical Implementation

The core logic is in `authCustomerController.js`:

```javascript
// Only check appointments for the SPECIFIC DATE requested
const availability = await prisma.availability.findMany({
    where: {
        provider_id: parseInt(providerId),
        dayOfWeek: dayOfWeek,
        availability_isActive: true
    },
    include: {
        appointments: {
            where: {
                scheduled_date: {
                    gte: startOfDay,
                    lt: endOfDay
                },
                appointment_status: {
                    in: ['accepted', 'pending', 'approved', 'confirmed']
                }
            }
        }
    }
});
```

This ensures that only appointments for the exact date being checked affect the availability status.
