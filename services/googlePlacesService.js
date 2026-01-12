import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * GooglePlacesService - Fetch real hotel images using Google Places API
 */
class GooglePlacesService {
    constructor() {
        this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    }

    /**
     * Search for a hotel and get its place_id
     */
    async searchHotel(hotelName, city) {
        if (!this.apiKey) {
            console.warn('⚠️ [GOOGLE PLACES] No API key found. Returning mock ID.');
            return { success: false, message: 'Google API key missing' };
        }

        try {
            const query = `${hotelName} ${city}`;
            console.log(`🌐 [GOOGLE PLACES] Searching for: "${query}"`);

            const response = await axios.get(`${this.baseUrl}/textsearch/json`, {
                params: {
                    query: query,
                    key: this.apiKey
                }
            });

            console.log(`🌐 [GOOGLE PLACES] Status: ${response.data.status}`);

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const bestMatch = response.data.results[0];
                return {
                    success: true,
                    placeId: bestMatch.place_id,
                    name: bestMatch.name
                };
            }

            if (response.data.status === 'ZERO_RESULTS') {
                return { success: false, message: 'No results found on Google' };
            }

            console.error('❌ [GOOGLE PLACES] API Error Details:', response.data);
            return { success: false, message: `Google API Error: ${response.data.status} - ${response.data.error_message || 'No detail'}` };
        } catch (error) {
            console.error('❌ [GOOGLE PLACES] Search failed:', error.response?.data || error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get photos for a specific place_id
     */
    async getPlacePhotos(placeId) {
        if (!this.apiKey) return [];

        try {
            const response = await axios.get(`${this.baseUrl}/details/json`, {
                params: {
                    place_id: placeId,
                    fields: 'photos',
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.result.photos) {
                return response.data.result.photos.map(photo => {
                    const reference = photo.photo_reference;
                    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${this.apiKey}`;
                });
            }

            return [];
        } catch (error) {
            console.error('❌ [GOOGLE PLACES] Details failed:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Complete flow: Search hotel -> Get Photos
     */
    async getHotelImages(hotelName, city) {
        const searchResult = await this.searchHotel(hotelName, city);
        if (searchResult.success) {
            return await this.getPlacePhotos(searchResult.placeId);
        }
        return [];
    }
}

export default new GooglePlacesService();
