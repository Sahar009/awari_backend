/**
 * Enhanced test script to view detailed Amadeus API responses
 * Shows all available fields and data structure
 * Usage: node scripts/test-amadeus-detailed.js
 */

import 'dotenv/config';
import amadeusService from '../services/amadeusService.js';

async function testAmadeusDetailed() {
    try {
        console.log('\n========================================');
        console.log('🔍 DETAILED AMADEUS API RESPONSE VIEWER');
        console.log('========================================\n');

        // Test authentication
        console.log('Step 1: Testing Authentication...');
        const token = await amadeusService.getAccessToken();
        console.log('✅ Authentication successful\n');

        // Search hotels
        console.log('Step 2: Searching Hotels in Lagos (LOS)...');
        const result = await amadeusService.searchHotels('LOS');

        if (!result.success) {
            console.error('❌ Hotel search failed:', result.message);
            process.exit(1);
        }

        const hotels = result.data;
        console.log(`✅ Found ${hotels.length} hotels\n`);

        // Detailed field analysis
        console.log('========================================');
        console.log('📊 DETAILED FIELD ANALYSIS');
        console.log('========================================\n');

        // Show first 5 hotels in detail
        hotels.slice(0, 5).forEach((hotel, index) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`HOTEL ${index + 1}: ${hotel.title}`);
            console.log('='.repeat(60));

            console.log('\n📋 BASIC INFORMATION:');
            console.log('  External ID:', hotel.externalId);
            console.log('  Name:', hotel.title);
            console.log('  Source:', hotel.source);

            if (hotel.rawData) {
                console.log('\n🏨 RAW AMADEUS DATA:');
                console.log('  Hotel ID:', hotel.rawData.hotelId);
                console.log('  Name:', hotel.rawData.name);
                console.log('  Chain Code:', hotel.rawData.chainCode || 'N/A');
                console.log('  IATA Code:', hotel.rawData.iataCode);
                console.log('  Dupe ID:', hotel.rawData.dupeId);

                if (hotel.rawData.geoCode) {
                    console.log('\n📍 LOCATION (GeoCode):');
                    console.log('  Latitude:', hotel.rawData.geoCode.latitude);
                    console.log('  Longitude:', hotel.rawData.geoCode.longitude);
                }

                if (hotel.rawData.address) {
                    console.log('\n🏠 ADDRESS:');
                    console.log('  Country Code:', hotel.rawData.address.countryCode);
                    console.log('  City Code:', hotel.rawData.address.cityCode || 'N/A');
                    console.log('  State Code:', hotel.rawData.address.stateCode || 'N/A');
                    console.log('  Postal Code:', hotel.rawData.address.postalCode || 'N/A');
                }

                console.log('\n📦 COMPLETE RAW DATA OBJECT:');
                console.log(JSON.stringify(hotel.rawData, null, 2));
            }
        });

        // Summary of available fields
        console.log('\n\n========================================');
        console.log('📝 SUMMARY OF AVAILABLE FIELDS');
        console.log('========================================\n');

        const sampleHotel = hotels[0]?.rawData;
        if (sampleHotel) {
            console.log('Fields available in Amadeus response:');
            Object.keys(sampleHotel).forEach(key => {
                const value = sampleHotel[key];
                const type = typeof value;
                const isObject = type === 'object' && value !== null;
                console.log(`  • ${key}: ${type}${isObject ? ` (${Object.keys(value).join(', ')})` : ''}`);
            });
        }

        console.log('\n\n========================================');
        console.log('💡 RECOMMENDATIONS');
        console.log('========================================\n');
        console.log('Based on the available data, you could store:');
        console.log('  ✓ chainCode - Hotel chain identifier');
        console.log('  ✓ iataCode - IATA location code');
        console.log('  ✓ geoCode - Exact latitude/longitude');
        console.log('  ✓ dupeId - Duplicate identifier');
        console.log('  ✓ address details - Country, city, state codes');
        console.log('\nNote: Amadeus does NOT provide:');
        console.log('  ✗ Hotel images (use Google Places)');
        console.log('  ✗ Star ratings (need Hotel Offers API)');
        console.log('  ✗ Amenities (need Hotel Offers API)');
        console.log('  ✗ Pricing (need Hotel Offers API with dates)\n');

    } catch (error) {
        console.error('\n💥 Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testAmadeusDetailed();
