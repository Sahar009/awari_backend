/**
 * Script to import real hotel data from Amadeus API with REAL Google Images
 * Usage: node scripts/import-amadeus-hotels.js
 */

import 'dotenv/config';
import amadeusService from '../services/amadeusService.js';
import googlePlacesService from '../services/googlePlacesService.js';
import { Property, User, PropertyMedia } from '../schema/index.js';
import sequelize from '../database/db.js';

// Curated fallback generic images (only if really needed, but better to skip)
const GENERIC_PLACEHOLDER = '/assets/images/houseimg (1).jpg';

async function importHotels() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // 1. Get Amadeus system user as owner for these properties
        const owner = await User.findOne({ where: { email: 'amadeus@system.awarihome.com' } });

        if (!owner) {
            console.error('❌ Amadeus system user not found.');
            console.error('   Please run: node scripts/create-amadeus-user.js');
            process.exit(1);
        }
        console.log(`👤 Using Amadeus system user: ${owner.email} (${owner.id})`);

        // 2. Fetch real hotels from Amadeus (Lagos - LOS)
        console.log('\n========================================');
        console.log('🌐 FETCHING HOTELS FROM AMADEUS');
        console.log('========================================');
        console.log('City Code: LOS (Lagos)');
        console.log('Timestamp:', new Date().toISOString());

        const amadeusResult = await amadeusService.searchHotels('LOS');

        if (!amadeusResult.success) {
            console.error('❌ Amadeus search failed:', amadeusResult.message);
            process.exit(1);
        }

        const hotels = amadeusResult.data;
        console.log('\n✅ AMADEUS SEARCH SUCCESSFUL');
        console.log('========================================');
        console.log(`🏨 Total Hotels Found: ${hotels.length}`);

        console.log('\n📋 HOTEL DATA STRUCTURE (First 5):');
        hotels.slice(0, 5).forEach((hotel, index) => {
            console.log(`\n--- Hotel ${index + 1} ---`);
            console.log('External ID:', hotel.externalId);
            console.log('Title:', hotel.title);
            console.log('Source:', hotel.source);
            if (hotel.rawData) {
                console.log('Raw Data Keys:', Object.keys(hotel.rawData));
                console.log('Full Raw Data:', JSON.stringify(hotel.rawData, null, 2));
            }
        });
        console.log('========================================\n');

        // 3. Clean up existing Amadeus properties and their media
        console.log('🧹 Aggressive cleanup of existing Amadeus properties...');
        const existingAmadeusProperties = await Property.findAll({
            where: { source: 'amadeus' }
        });

        for (const p of existingAmadeusProperties) {
            console.log(`🗑️ Deleting property and media for: ${p.title}`);
            await PropertyMedia.destroy({ where: { propertyId: p.id } });
            await p.destroy();
        }

        // 4. Import hotels
        console.log('🚀 Importing hotels with REAL Google images (No Unsplash fallbacks)...');
        let importedCount = 0;

        for (let i = 0; i < hotels.length; i++) {
            const hotel = hotels[i];
            try {
                console.log(`🏨 Processing: ${hotel.title}...`);

                // Fetch real images from Google Places
                let images = await googlePlacesService.getHotelImages(hotel.title, 'Lagos');
                const hasGoogleImages = images && images.length > 0;

                if (!hasGoogleImages) {
                    console.log(`⏭️ Skipping ${hotel.title} - No real images found on Google.`);
                    continue;
                }

                console.log(`✅ Found ${images.length} images on Google for ${hotel.title}`);

                // Create the property
                const property = await Property.create({
                    ownerId: owner.id,
                    title: hotel.title,
                    slug: `${hotel.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${hotel.externalId}`,
                    description: `Experience the finest hospitality at ${hotel.title}. Sourced via Amadeus. This premium hotel offers exceptional service and comfort in the heart of Lagos, Nigeria.`,
                    propertyType: 'hotel',
                    listingType: 'hotel',
                    status: 'active',
                    price: 65000 + (Math.random() * 80000), // Dynamic pricing
                    currency: 'NGN',
                    address: hotel.address || 'Street Address, Lagos',
                    city: 'Lagos',
                    state: 'Lagos',
                    country: 'Nigeria',
                    source: 'amadeus',
                    externalId: hotel.externalId,
                    amenities: ['wifi', 'concierge', 'room_service', 'restaurant', 'air_conditioning', 'swimming_pool'],
                    furnished: true,
                    minStayNights: 1
                });

                // Create media entries
                for (let j = 0; j < Math.min(images.length, 10); j++) {
                    await PropertyMedia.create({
                        propertyId: property.id,
                        mediaType: 'image',
                        url: images[j],
                        isPrimary: j === 0,
                        isActive: true,
                        order: j
                    });
                }

                importedCount++;
                if (importedCount >= 20) break; // Manageable total
            } catch (err) {
                console.error(`⚠️ Failed to import hotel ${hotel.title}:`, err.message);
            }
        }

        console.log(`✅ Successfully imported ${importedCount} Amadeus hotels with REAL images!`);

    } catch (error) {
        console.error('💥 Import Error:', error);
    } finally {
        await sequelize.close();
        console.log('🔚 Database connection closed');
        process.exit();
    }
}

importHotels();
