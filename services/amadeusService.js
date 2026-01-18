import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AmadeusService - Adapter for interacting with Amadeus Hotel Booking API
 */
class AmadeusService {
    constructor() {
        this.clientId = process.env.AMADEUS_CLIENT_ID;
        this.clientSecret = process.env.AMADEUS_CLIENT_SECRET;
        this.baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://api.amadeus.com'
            : 'https://test.api.amadeus.com';

        // Production mode flag - controls whether to make real Amadeus bookings
        this.productionMode = process.env.AMADEUS_PRODUCTION_MODE === 'true';

        this.accessToken = null;
        this.tokenExpiry = null;

        // Log mode on initialization
        console.log('🔧 [AMADEUS SERVICE] Initialized');
        console.log('   Mode:', this.productionMode ? '🚀 PRODUCTION (Real bookings)' : '🧪 DEVELOPMENT (Mock bookings)');
        console.log('   Base URL:', this.baseUrl);
    }

    /**
     * Get OAuth2 Access Token
     */
    async getAccessToken() {
        // Return cached token if valid
        if (this.accessToken && this.tokenExpiry > Date.now()) {
            return this.accessToken;
        }

        console.log('\n========================================');
        console.log('🔑 [AMADEUS SERVICE] AUTHENTICATION REQUEST');
        console.log('========================================');
        console.log('Base URL:', this.baseUrl);
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Client ID exists:', !!this.clientId);
        console.log('Client ID length:', this.clientId?.length || 0);
        console.log('Client ID prefix:', this.clientId?.substring(0, 8) + '...');
        console.log('Client Secret exists:', !!this.clientSecret);
        console.log('Client Secret length:', this.clientSecret?.length || 0);
        console.log('Endpoint:', `${this.baseUrl}/v1/security/oauth2/token`);

        try {
            const response = await axios.post(
                `${this.baseUrl}/v1/security/oauth2/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Buffer of 10 seconds
            this.tokenExpiry = Date.now() + (response.data.expires_in - 10) * 1000;

            console.log('\n✅ [AMADEUS SERVICE] AUTHENTICATION SUCCESSFUL');
            console.log('Token expires in:', response.data.expires_in, 'seconds');
            console.log('========================================\n');

            return this.accessToken;
        } catch (error) {
            console.error('\n❌ [AMADEUS SERVICE] AUTHENTICATION FAILED');
            console.error('========================================');
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            console.error('Response Status:', error.response?.status);
            console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('Request URL:', `${this.baseUrl}/v1/security/oauth2/token`);
            console.error('========================================\n');
            throw new Error('Could not authenticate with Amadeus API');
        }
    }

    /**
     * Search for hotels by city code (e.g., LON, NYC)
     */
    async searchHotels(cityCode) {
        const token = await this.getAccessToken();
        console.log('\n========================================');
        console.log('🌐 [AMADEUS SERVICE] HOTEL SEARCH REQUEST');
        console.log('========================================');
        console.log('City Code:', cityCode);
        console.log('Endpoint:', `${this.baseUrl}/v1/reference-data/locations/hotels/by-city`);
        console.log('Environment:', process.env.NODE_ENV || 'development');

        try {
            const response = await axios.get(`${this.baseUrl}/v1/reference-data/locations/hotels/by-city`, {
                params: { cityCode },
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('\n✅ [AMADEUS SERVICE] HOTEL SEARCH RESPONSE');
            console.log('========================================');
            console.log('Status:', response.status);
            console.log('Total Hotels Found:', response.data.data?.length || 0);
            console.log('\n📦 RAW API RESPONSE:');
            console.log(JSON.stringify(response.data, null, 2));

            if (response.data.data && response.data.data.length > 0) {
                console.log('\n🏨 SAMPLE HOTEL DATA (First 3):');
                response.data.data.slice(0, 3).forEach((hotel, index) => {
                    console.log(`\n--- Hotel ${index + 1} ---`);
                    console.log('Hotel ID:', hotel.hotelId);
                    console.log('Name:', hotel.name);
                    console.log('IATA Code:', hotel.iataCode);
                    console.log('Geo Code:', hotel.geoCode);
                    console.log('Address:', hotel.address);
                    console.log('Full Object:', JSON.stringify(hotel, null, 2));
                });
            }
            console.log('========================================\n');

            return {
                success: true,
                data: response.data.data.map(hotel => ({
                    externalId: hotel.hotelId,
                    title: hotel.name,
                    source: 'amadeus',
                    rawData: hotel // Include raw data for debugging
                }))
            };
        } catch (error) {
            console.error('\n❌ [AMADEUS SERVICE] HOTEL SEARCH FAILED');
            console.error('========================================');
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            console.error('Response Status:', error.response?.status);
            console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('========================================\n');
            return { success: false, message: 'Failed to search hotels on Amadeus' };
        }
    }

    /**
     * Create a booking on Amadeus
     * Behavior depends on AMADEUS_PRODUCTION_MODE:
     * - false (development): Returns mock booking ID
     * - true (production): Makes real API call to Amadeus
     */
    async createBooking(bookingData) {
        console.log('\n========================================');
        console.log('🌐 [AMADEUS SERVICE] CREATE BOOKING REQUEST');
        console.log('========================================');
        console.log('Mode:', this.productionMode ? '🚀 PRODUCTION' : '🧪 DEVELOPMENT (Mock)');
        console.log('Property:', bookingData.propertyTitle || 'Unknown');
        console.log('Guest:', bookingData.guestName);
        console.log('Dates:', bookingData.checkInDate, 'to', bookingData.checkOutDate);

        // DEVELOPMENT MODE: Return mock booking
        if (!this.productionMode) {
            console.log('\n✅ [AMADEUS SERVICE] MOCK BOOKING CREATED');
            console.log('========================================');
            const mockBookingId = `AM-MOCK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            console.log('Mock Booking ID:', mockBookingId);
            console.log('Status: Confirmed (Mock)');
            console.log('Note: No real booking created on Amadeus');
            console.log('========================================\n');

            return {
                success: true,
                externalBookingId: mockBookingId,
                externalStatus: 'confirmed',
                message: 'Booking successfully created (Mock - Development Mode)',
                isMock: true
            };
        }

        // PRODUCTION MODE: Make real Amadeus API call
        console.log('\n🚀 [AMADEUS SERVICE] Attempting REAL Amadeus booking...');

        try {
            const token = await this.getAccessToken();

            // Validate required data for production
            if (!bookingData.externalOfferId) {
                throw new Error('Missing externalOfferId - must get offer from Hotel Offers API first');
            }

            // Real API Call to Amadeus Booking API
            const response = await axios.post(
                `${this.baseUrl}/v1/booking/hotel-bookings`,
                {
                    data: {
                        offerId: bookingData.externalOfferId,
                        guests: [
                            {
                                name: {
                                    firstName: bookingData.guestName?.split(' ')[0] || 'Guest',
                                    lastName: bookingData.guestName?.split(' ')[1] || 'User'
                                },
                                contact: {
                                    phone: bookingData.guestPhone || '+1234567890',
                                    email: bookingData.guestEmail || 'guest@example.com'
                                }
                            }
                        ],
                        payments: [
                            {
                                method: 'creditCard',
                                card: {
                                    vendorCode: bookingData.cardVendor || 'VI',
                                    cardNumber: bookingData.cardNumber,
                                    expiryDate: bookingData.cardExpiry
                                }
                            }
                        ]
                    }
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            console.log('\n✅ [AMADEUS SERVICE] REAL BOOKING CREATED');
            console.log('========================================');
            console.log('Booking ID:', response.data.data[0].id);
            console.log('Status:', response.data.data[0].bookingStatus);
            console.log('Full Response:', JSON.stringify(response.data, null, 2));
            console.log('========================================\n');

            return {
                success: true,
                externalBookingId: response.data.data[0].id,
                externalStatus: response.data.data[0].bookingStatus || 'confirmed',
                message: 'Booking successfully created on Amadeus',
                isMock: false,
                rawResponse: response.data
            };
        } catch (error) {
            console.error('\n❌ [AMADEUS SERVICE] REAL BOOKING FAILED');
            console.error('========================================');
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            console.error('Response Status:', error.response?.status);
            console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('========================================\n');

            return {
                success: false,
                message: 'Failed to create booking on Amadeus',
                details: error.response?.data,
                error: error.message
            };
        }
    }

    /**
     * Check real-time availability for a hotel on Amadeus
     */
    async checkAvailability(externalId, checkInDate, checkOutDate) {
        console.log('\n========================================');
        console.log('🌐 [AMADEUS SERVICE] AVAILABILITY CHECK REQUEST');
        console.log('========================================');
        console.log('Mode:', this.productionMode ? '🚀 PRODUCTION' : '🧪 DEVELOPMENT (Mock)');
        console.log('Hotel ID:', externalId);
        console.log('Check-in Date:', checkInDate);
        console.log('Check-out Date:', checkOutDate);
        console.log('Endpoint:', `${this.baseUrl}/v3/shopping/hotel-offers`);

        try {
            // DEVELOPMENT MODE: Return mock availability
            if (!this.productionMode) {
                console.log('\n✅ [AMADEUS SERVICE] MOCK AVAILABILITY CHECK');
                console.log('Result: Available (Mock)');
                console.log('========================================\n');
                return {
                    success: true,
                    available: true,
                    isMock: true,
                    message: 'Availability check (Mock - Development Mode)'
                };
            }

            // PRODUCTION MODE: Make real API call
            const token = await this.getAccessToken();

            // Real API Call: Amadeus Shopping API (Hotel Search / Hotel Offers)
            // Note: Hotel ID must be valid Amadeus Hotel ID
            const response = await axios.get(`${this.baseUrl}/v3/shopping/hotel-offers`, {
                params: {
                    hotelIds: externalId,
                    checkInDate,
                    checkOutDate,
                    adults: 1 // Default
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('\n✅ [AMADEUS SERVICE] AVAILABILITY RESPONSE');
            console.log('========================================');
            console.log('Status:', response.status);
            console.log('Offers Found:', response.data?.data?.length || 0);
            console.log('\n📦 RAW AVAILABILITY RESPONSE:');
            console.log(JSON.stringify(response.data, null, 2));

            if (response.data?.data?.[0]?.offers) {
                console.log('\n💰 OFFER DETAILS:');
                response.data.data[0].offers.slice(0, 2).forEach((offer, index) => {
                    console.log(`\n--- Offer ${index + 1} ---`);
                    console.log('Offer ID:', offer.id);
                    console.log('Price:', offer.price);
                    console.log('Room:', offer.room);
                    console.log('Full Offer:', JSON.stringify(offer, null, 2));
                });
            }
            console.log('========================================\n');

            // If we get data back, it means there are offers available
            return {
                success: true,
                available: response.data?.data?.length > 0,
                offers: response.data?.data?.[0]?.offers || []
            };
        } catch (error) {
            console.error('\n❌ [AMADEUS SERVICE] AVAILABILITY CHECK FAILED');
            console.error('========================================');
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            console.error('Response Status:', error.response?.status);
            console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('========================================\n');
            // Fallback to true if it's just a rate limit or temp error, but log it
            return { success: false, available: true, message: 'External check failed, falling back to cached availability' };
        }
    }
}

export default new AmadeusService();
