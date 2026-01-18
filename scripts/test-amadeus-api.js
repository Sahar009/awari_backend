/**
 * Quick test script to see Amadeus API response
 * Usage: node scripts/test-amadeus-api.js
 */

import 'dotenv/config';
import amadeusService from '../services/amadeusService.js';

async function testAmadeusAPI() {
    try {
        console.log('\n🚀 TESTING AMADEUS API');
        console.log('==========================================\n');

        // Test 1: Search Hotels
        console.log('TEST 1: Searching hotels in Lagos (LOS)...\n');
        const searchResult = await amadeusService.searchHotels('LOS');

        if (searchResult.success) {
            console.log('\n✅ Search completed successfully!');
            console.log(`Found ${searchResult.data.length} hotels\n`);
        } else {
            console.log('\n❌ Search failed:', searchResult.message);
        }

        // Test 2: Check Availability (if we have hotels)
        if (searchResult.success && searchResult.data.length > 0) {
            const firstHotel = searchResult.data[0];
            console.log('\n\nTEST 2: Checking availability for first hotel...');
            console.log('Hotel:', firstHotel.title);
            console.log('Hotel ID:', firstHotel.externalId);

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);

            const checkIn = tomorrow.toISOString().split('T')[0];
            const checkOut = dayAfter.toISOString().split('T')[0];

            console.log('Check-in:', checkIn);
            console.log('Check-out:', checkOut);
            console.log('');

            const availResult = await amadeusService.checkAvailability(
                firstHotel.externalId,
                checkIn,
                checkOut
            );

            if (availResult.success) {
                console.log('\n✅ Availability check completed!');
                console.log('Available:', availResult.available);
                console.log('Offers found:', availResult.offers?.length || 0);
            } else {
                console.log('\n❌ Availability check failed:', availResult.message);
            }
        }

        console.log('\n\n==========================================');
        console.log('🏁 TEST COMPLETE');
        console.log('==========================================\n');

    } catch (error) {
        console.error('\n💥 TEST ERROR:', error.message);
        console.error(error);
    } finally {
        process.exit();
    }
}

testAmadeusAPI();
