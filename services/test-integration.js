import dotenv from 'dotenv';
dotenv.config();

import { User, Property, Booking } from '../schema/index.js';
import { createBooking } from './bookingService.js';
import sequelize from '../database/db.js';

async function testIntegration() {
    console.log('🧪 Starting integration test for Booking.com...');

    try {
        // 1. Get or create a test user
        const [user] = await User.findOrCreate({
            where: { email: 'test_integrator@example.com' },
            defaults: {
                firstName: 'Test',
                lastName: 'Integrator',
                passwordHash: 'password123',
                status: 'active',
                role: 'renter'
            }
        });
        console.log('👤 Test User:', user.id);

        // 2. Create an external property
        const property = await Property.create({
            ownerId: user.id,
            title: 'Mock Amadeus Hotel',
            slug: `mock-amadeus-${Date.now()}`,
            description: 'A hotel from Amadeus API',
            propertyType: 'hotel',
            listingType: 'hotel',
            price: 60000,
            address: '456 Amadeus Blvd',
            city: 'London',
            state: 'Greater London',
            country: 'UK',
            source: 'amadeus',
            externalId: 'AMA_12345'
        });
        console.log('🏨 External Property created:', property.id);

        // 3. Attempt to book it
        const bookingData = {
            propertyId: property.id,
            bookingType: 'shortlet',
            checkInDate: '2026-02-01',
            checkOutDate: '2026-02-05',
            numberOfNights: 4,
            numberOfGuests: 2,
            basePrice: 50000,
            totalPrice: 200000,
            currency: 'NGN',
            guestName: 'Jane Doe',
            guestEmail: 'jane@example.com'
        };

        console.log('📅 Attempting to book external property...');
        const result = await createBooking(user.id, bookingData);

        if (result.success) {
            console.log('✅ Local booking created:', result.data.booking.id);

            // Verify external sync
            const updatedBooking = await Booking.findByPk(result.data.booking.id);
            console.log('🔗 External Booking ID:', updatedBooking.externalBookingId);
            console.log('📊 External Status:', updatedBooking.externalStatus);

            if (updatedBooking.externalBookingId) {
                console.log('🎉 INTEGRATION SUCCESSFUL!');
            } else {
                console.error('❌ Integration failed: No externalBookingId found.');
            }
        } else {
            console.error('❌ Booking failed:', result.message);
        }

    } catch (error) {
        console.error('💥 Test Error:', error);
    } finally {
        // Clean up or just exit
        // await sequelize.close();
        process.exit();
    }
}

testIntegration();
