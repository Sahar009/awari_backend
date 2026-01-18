# Switching to Production Amadeus Bookings

## Quick Start Guide

### Current Setup (Development Mode)
Your system is currently in **development mode** with mock Amadeus bookings.

### How to Enable Production Mode

#### Step 1: Get Production Credentials
1. Contact Amadeus Sales: developers@amadeus.com
2. Request production API access
3. Receive production `CLIENT_ID` and `CLIENT_SECRET`

#### Step 2: Update Environment Variables
In your `.env` file, update these values:

```bash
# Replace with your PRODUCTION credentials
AMADEUS_CLIENT_ID=your_production_client_id
AMADEUS_CLIENT_SECRET=your_production_client_secret

# Enable production mode (THIS IS THE KEY!)
AMADEUS_PRODUCTION_MODE=true

# Set Node environment to production
NODE_ENV=production
```

#### Step 3: Restart Your Server
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev  # or npm start for production
```

That's it! The system will automatically:
- ✅ Make real Amadeus API calls
- ✅ Create actual bookings on Amadeus
- ✅ Use production pricing and availability

## How It Works

### Development Mode (`AMADEUS_PRODUCTION_MODE=false`)
```
User books → Mock booking created → Stored in your DB → User pays you
```
- No real Amadeus booking
- Mock booking ID: `AM-MOCK-ABC123`
- Logs show: "🧪 DEVELOPMENT (Mock bookings)"

### Production Mode (`AMADEUS_PRODUCTION_MODE=true`)
```
User books → Real Amadeus API call → Real booking created → Stored in your DB → User pays you
```
- Real Amadeus booking
- Real booking ID from Amadeus
- Logs show: "🚀 PRODUCTION (Real bookings)"

## Environment Variable Reference

| Variable | Development | Production |
|----------|------------|-----------|
| `AMADEUS_CLIENT_ID` | Test credentials | Production credentials |
| `AMADEUS_CLIENT_SECRET` | Test credentials | Production credentials |
| `AMADEUS_PRODUCTION_MODE` | `false` or empty | `true` |
| `NODE_ENV` | `development` | `production` |

## Testing the Switch

### 1. Check Current Mode
Look at server startup logs:
```
🔧 [AMADEUS SERVICE] Initialized
   Mode: 🧪 DEVELOPMENT (Mock bookings)  ← Development
   Base URL: https://test.api.amadeus.com
```

or

```
🔧 [AMADEUS SERVICE] Initialized
   Mode: 🚀 PRODUCTION (Real bookings)  ← Production
   Base URL: https://api.amadeus.com
```

### 2. Test a Booking
When a user books an Amadeus hotel, check the logs:

**Development Mode:**
```
🌐 [AMADEUS SERVICE] CREATE BOOKING REQUEST
Mode: 🧪 DEVELOPMENT (Mock)
✅ [AMADEUS SERVICE] MOCK BOOKING CREATED
Mock Booking ID: AM-MOCK-XYZ789
Note: No real booking created on Amadeus
```

**Production Mode:**
```
🌐 [AMADEUS SERVICE] CREATE BOOKING REQUEST
Mode: 🚀 PRODUCTION
🚀 [AMADEUS SERVICE] Attempting REAL Amadeus booking...
✅ [AMADEUS SERVICE] REAL BOOKING CREATED
Booking ID: AMADEUS123456
```

## Important Notes

### Before Going to Production:
- [ ] Get production credentials from Amadeus
- [ ] Sign payment agreement with Amadeus
- [ ] Test with Amadeus test cards first
- [ ] Verify booking flow end-to-end
- [ ] Set up error monitoring
- [ ] Configure webhook handlers (if needed)

### Security:
- ⚠️ **NEVER** commit production credentials to Git
- ✅ Use environment variables only
- ✅ Keep `.env` in `.gitignore`
- ✅ Use different credentials for staging/production

### Rollback:
If you need to switch back to development mode:
```bash
# In .env file
AMADEUS_PRODUCTION_MODE=false
```
Then restart the server.

## Troubleshooting

### Issue: Still seeing mock bookings in production
**Solution:** Check that `AMADEUS_PRODUCTION_MODE=true` (exactly, case-sensitive)

### Issue: Authentication errors in production
**Solution:** Verify you're using production credentials, not test credentials

### Issue: Booking fails with "Missing externalOfferId"
**Solution:** In production, you must first call Hotel Offers API to get an offer ID before booking

## Next Steps for Full Production

The current implementation handles the booking creation, but for a complete production setup, you'll also need to:

1. **Implement Hotel Offers API** - Get real-time pricing before booking
2. **Add Payment Card Handling** - Collect and validate card details
3. **Set up Webhooks** - Receive booking confirmations from Amadeus
4. **Error Handling** - Handle API failures gracefully
5. **Monitoring** - Track booking success rates

See `docs/amadeus-booking-flow.md` for detailed production implementation guide.
