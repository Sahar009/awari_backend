/**
 * Debug Google Places search
 */
import 'dotenv/config';
import googlePlacesService from '../services/googlePlacesService.js';

async function testSearch() {
    const hotel = 'INTERCONTINENTAL LAGOS';
    const city = 'Lagos';

    console.log(`🔍 Testing search for: ${hotel}, ${city}`);
    const result = await googlePlacesService.searchHotel(hotel, city);
    console.log('📦 Search Result:', JSON.stringify(result, null, 2));

    if (result.success) {
        console.log(`📸 Fetching photos for: ${result.placeId}`);
        const photos = await googlePlacesService.getPlacePhotos(result.placeId);
        console.log('🖼️ Photos found:', photos.length);
        if (photos.length > 0) {
            console.log('🔗 First photo URL:', photos[0]);
        }
    }
}

testSearch();
