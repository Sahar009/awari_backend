# Amadeus Booking & Payment Flow Documentation

## Overview
This document clarifies how the Amadeus integration works in terms of bookings and payments.

## Current Implementation (Test Mode)

### What Happens When a User Books an Amadeus Hotel:

1. **User browses** → Sees Amadeus hotels in search results
2. **User selects dates** → System checks availability (currently mocked in test mode)
3. **User books** → Booking is created in YOUR database
4. **Amadeus sync attempt** → `amadeusService.createBooking()` is called
5. **Mock response** → Returns a fake booking ID (e.g., `AM-XYZ123`)
6. **Payment** → User pays YOU via Paystack
7. **Money flow** → Goes to YOUR Paystack account

### Important Notes:

- ❌ **No actual booking is created on Amadeus**
- ❌ **No money goes to Amadeus**
- ✅ **Booking exists only in your database**
- ✅ **You receive the full payment**

## Why Test Mode Doesn't Create Real Bookings

### Amadeus Test API Limitations:
1. **No booking permissions** - Test credentials can only search hotels
2. **Multi-step flow required** - Real bookings need:
   - Step 1: Search hotels by city
   - Step 2: Get hotel offers (with dates, pricing)
   - Step 3: Select specific offer
   - Step 4: Create booking with offer ID + payment details
3. **Payment card required** - Production bookings need real credit card info

### Current Code Behavior:
```javascript
// In amadeusService.js line 154-162
if (!this.clientId || this.clientId.includes('YOUR_')) {
    console.log('⚠️ Using mock booking due to placeholder keys');
    return {
        success: true,
        externalBookingId: `AM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        externalStatus: 'confirmed',
        message: 'Booking successfully synchronized with Amadeus (Mock)'
    };
}
```

## Production Implementation (Future)

### Prerequisites:
1. **Amadeus Production Credentials**
   - Apply for production API access
   - Get approved corporate account
   - Receive production client ID and secret

2. **Payment Agreement with Amadeus**
   - Choose payment model (see below)
   - Sign contract
   - Set up billing

3. **Technical Implementation**
   - Implement full booking flow (search → offers → book)
   - Add payment card handling
   - Set up webhook for booking confirmations

### Payment Models:

#### Option A: Affiliate/Commission Model (Recommended)
**How it works:**
- Amadeus provides you with **discounted rates**
- You display **marked-up prices** to customers
- You keep the **difference as profit**
- No direct payment to Amadeus needed

**Example:**
- Amadeus rate: ₦50,000/night
- Your price: ₦65,000/night
- Your profit: ₦15,000/night

**Pros:**
- Simple accounting
- No monthly bills from Amadeus
- Immediate profit on each booking

**Cons:**
- Need to manage pricing strategy
- Must stay competitive with other platforms

#### Option B: Direct Billing Model
**How it works:**
- You charge customers full price
- Amadeus charges YOU for each booking
- You pay Amadeus monthly/quarterly
- Requires credit card on file with Amadeus

**Example:**
- Customer pays you: ₦65,000
- Amadeus bills you: ₦55,000
- Your profit: ₦10,000

**Pros:**
- Amadeus handles pricing
- Less pricing management

**Cons:**
- Monthly invoices to track
- Cash flow considerations
- Credit card required

## Recommended Next Steps

### For Development/Testing:
1. ✅ Keep using test mode with mock bookings
2. ✅ Store bookings in your database
3. ✅ Collect payments via Paystack
4. ✅ Mark bookings as "Amadeus (Test)" in admin panel

### For Production:
1. **Contact Amadeus Sales**
   - Email: developers@amadeus.com
   - Explain your use case
   - Request production access

2. **Choose Payment Model**
   - Discuss with Amadeus account manager
   - Review contract terms
   - Set up billing

3. **Implement Full Flow**
   - Use Hotel Offers API for pricing
   - Implement real booking creation
   - Add payment card processing
   - Set up confirmation webhooks

4. **Testing**
   - Use Amadeus test cards
   - Verify booking flow
   - Test payment settlement
   - Confirm booking confirmations

## API Endpoints Reference

### Currently Used:
- `POST /v1/security/oauth2/token` - Authentication ✅
- `GET /v1/reference-data/locations/hotels/by-city` - Search hotels ✅

### Needed for Production:
- `GET /v2/shopping/hotel-offers` - Get offers with pricing ❌
- `POST /v1/booking/hotel-bookings` - Create booking ❌
- `GET /v1/booking/hotel-bookings/{id}` - Get booking details ❌

## Questions to Ask Amadeus

When you contact Amadeus for production access, ask:

1. **Pricing Model**
   - "Do you offer affiliate/commission pricing?"
   - "What are the typical commission rates?"
   - "Is there a minimum booking volume requirement?"

2. **Payment**
   - "How does payment settlement work?"
   - "Do you bill monthly or per-booking?"
   - "What payment methods do you accept?"

3. **Technical**
   - "What's the approval process for production API?"
   - "Do you provide a sandbox for testing bookings?"
   - "What webhook events are available?"

4. **Support**
   - "What support is included?"
   - "Is there a dedicated account manager?"
   - "What are the SLA guarantees?"

## Summary

**Current State:**
- ✅ Can search Amadeus hotels
- ✅ Can display hotels to users
- ✅ Can accept bookings (stored locally)
- ✅ Can collect payments (via Paystack)
- ❌ Cannot create real Amadeus bookings
- ❌ No payment to Amadeus

**To Go Live:**
- Need production API credentials
- Need payment agreement with Amadeus
- Need to implement full booking flow
- Need to handle payment settlement

**Recommendation:**
Continue using test mode for development. When ready to launch, contact Amadeus sales to discuss production access and payment terms.
