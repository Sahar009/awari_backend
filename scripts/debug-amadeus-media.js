/**
 * Debug script to inspect raw Amadeus hotel-offers response
 */
import 'dotenv/config';
import amadeusService from '../services/amadeusService.js';
import axios from 'axios';

async function debugHotelOffers() {
    try {
        const token = await amadeusService.getAccessToken();
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://api.amadeus.com'
            : 'https://test.api.amadeus.com';

        const hotelList = await amadeusService.searchHotels('LOS');
        if (!hotelList.success || hotelList.data.length === 0) {
            console.error('❌ No hotels found in LOS');
            return;
        }

        for (const hotel of hotelList.data.slice(0, 5)) {
            const hotelId = hotel.externalId;
            console.log(`🏨 Inspecting hotel-offers for: ${hotelId} (${hotel.title})`);

            try {
                const response = await axios.get(`${baseUrl}/v3/shopping/hotel-offers`, {
                    params: {
                        hotelIds: hotelId,
                        adults: 1
                    },
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.data && response.data.data.length > 0) {
                    console.log('✅ Found availability! Inspecting data...');
                    console.log(JSON.stringify(response.data.data[0], null, 2));
                    return;
                }
            } catch (e) {
                console.log(`⚠️ No availability or error for ${hotelId}: ${e.message}`);
            }
        }
        console.log('❌ Could not find any hotel with availability to inspect.');

    } catch (error) {
        console.error('❌ Debug Error:', error.response?.data || error.message);
    }
}

debugHotelOffers();
