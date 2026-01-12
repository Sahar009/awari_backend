/**
 * Inspect Amadeus property media in DB
 */
import 'dotenv/config';
import { Property, PropertyMedia } from '../schema/index.js';
import sequelize from '../database/db.js';

async function inspectMedia() {
    try {
        await sequelize.authenticate();
        const amadeusProperties = await Property.findAll({
            where: { source: 'amadeus' },
            include: [{ model: PropertyMedia, as: 'media' }]
        });

        console.log(`🔍 Found ${amadeusProperties.length} Amadeus properties.`);

        for (const p of amadeusProperties) {
            console.log(`🏨 Hotel: ${p.title} (ID: ${p.id})`);
            if (p.media && p.media.length > 0) {
                p.media.forEach((m, i) => {
                    console.log(`  📸 Image ${i + 1}: ${m.url.substring(0, 80)}${m.url.length > 80 ? '...' : ''}`);
                });
            } else {
                console.log('  ❌ No media found.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

inspectMedia();
