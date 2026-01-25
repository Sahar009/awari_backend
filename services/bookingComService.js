/**
 * BookingComService - Adapter for interacting with Booking.com API
 * 
 * Note: This is an initial implementation with mock responses.
 * To use real data, replace the mock logic with actual API calls to Booking.com Connectivity API.
 */
import { sendTemplateNotification } from './notificationService.js';
import Booking from '../schema/Booking.js';
import User from '../schema/User.js';
import Property from '../schema/Property.js';
class BookingComService {
    constructor() {
        this.apiKey = process.env.BOOKING_COM_API_KEY;
        this.affiliateId = process.env.BOOKING_COM_AFFILIATE_ID;
        this.baseUrl = 'https://distribution-xml.booking.com/2.0/json'; // Example URL
    }

    /**
     * Search for hotels on Booking.com
     */
    async searchHotels(searchParams) {
        console.log('🌐 [BOOKING.COM SERVICE] Searching hotels:', searchParams);

        // Mock response
        return {
            success: true,
            data: [
                {
                    externalId: 'bc_12345',
                    title: 'Grace Plaza (via Booking.com)',
                    description: 'Luxury hotel found on Booking.com',
                    price: 45000,
                    currency: 'NGN',
                    address: '123 Booking Street, Lagos',
                    city: 'Lagos',
                    country: 'Nigeria',
                    source: 'booking_com'
                }
            ]
        };
    }

    /**
     * Get hotel details from Booking.com
     */
    async getHotelDetails(externalId) {
        console.log('🌐 [BOOKING.COM SERVICE] Getting details for:', externalId);

        // Mock response
        return {
            success: true,
            data: {
                externalId,
                title: 'Grace Plaza (via Booking.com)',
                description: 'Complete details from Booking.com API',
                source: 'booking_com'
            }
        };
    }

    /**
     * Create a booking on Booking.com
     */
    async createBooking(bookingData) {
        console.log('🌐 [BOOKING.COM SERVICE] Creating external booking:', bookingData);

        // In a real implementation, you would:
        // 1. Post to Booking.com API
        // 2. Receive a reservation ID

        // Mock successful booking
        const mockExternalId = `BK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Send notifications to both user and owner
        try {
            console.log('📧 [BOOKING.COM SERVICE] Attempting to send notifications...');

            // Fetch complete booking data with relations for notifications
            // Note: In real implementation, you would use the localBookingId from bookingData
            if (bookingData.localBookingId) {
                const completeBooking = await Booking.findByPk(bookingData.localBookingId, {
                    include: [
                        {
                            model: Property,
                            as: 'property',
                            include: [{
                                model: User,
                                as: 'owner',
                                attributes: ['id', 'firstName', 'lastName', 'email']
                            }]
                        },
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'firstName', 'lastName', 'email']
                        }
                    ]
                });

                if (completeBooking && completeBooking.user && completeBooking.property?.owner) {
                    // Send notifications
                    await sendTemplateNotification('BOOKING_CREATED_GUEST', completeBooking.user, {
                        booking: completeBooking,
                        property: completeBooking.property
                    });
                    console.log('✅ [BOOKING.COM SERVICE] Guest notification sent');

                    await sendTemplateNotification('BOOKING_CREATED_OWNER', completeBooking.property.owner, {
                        booking: completeBooking,
                        property: completeBooking.property,
                        user: completeBooking.user
                    });
                    console.log('✅ [BOOKING.COM SERVICE] Owner notification sent');
                } else {
                    console.warn('⚠️ [BOOKING.COM SERVICE] Could not find complete booking data for notifications');
                }
            }
        } catch (notificationError) {
            console.error('⚠️ [BOOKING.COM SERVICE] Failed to send notifications:', notificationError);
        }

        return {
            success: true,
            externalBookingId: mockExternalId,
            externalStatus: 'confirmed',
            message: 'Booking successfully synchronized with Booking.com'
        };
    }

    /**
     * Cancel a booking on Booking.com
     */
    async cancelBooking(externalBookingId) {
        console.log('🌐 [BOOKING.COM SERVICE] Cancelling external booking:', externalBookingId);

        return {
            success: true,
            externalStatus: 'cancelled'
        };
    }
}

export default new BookingComService();
