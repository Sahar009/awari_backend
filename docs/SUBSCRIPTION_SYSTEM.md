# Subscription Management System Documentation

## Overview

The subscription management system allows landlords and agents to subscribe to different plans (Basic, Premium, Enterprise) to list and manage properties on the platform. The system handles subscription creation, payment processing, activation, renewal, and cancellation.

## Features

- ✅ Three predefined subscription plans (Basic, Premium, Enterprise)
- ✅ Custom subscription plans support
- ✅ Monthly and yearly billing cycles
- ✅ Automatic subscription activation after payment
- ✅ Subscription renewal and cancellation
- ✅ Subscription limits enforcement (properties, photos, featured)
- ✅ Payment integration with Paystack
- ✅ Auto-renewal support
- ✅ Subscription status tracking

## Subscription Plans

### Basic Plan
- **Monthly Price**: ₦5,000
- **Yearly Price**: ₦50,000
- **Max Properties**: 5
- **Max Photos per Property**: 10
- **Featured Properties**: 0
- **Priority Support**: No
- **Analytics Access**: No

### Premium Plan
- **Monthly Price**: ₦15,000
- **Yearly Price**: ₦150,000
- **Max Properties**: 20
- **Max Photos per Property**: 25
- **Featured Properties**: 3
- **Priority Support**: Yes
- **Analytics Access**: Yes

### Enterprise Plan
- **Monthly Price**: ₦50,000
- **Yearly Price**: ₦500,000
- **Max Properties**: Unlimited (-1)
- **Max Photos per Property**: 50
- **Featured Properties**: Unlimited (-1)
- **Priority Support**: Yes
- **Analytics Access**: Yes

## API Endpoints

### Public Endpoints

#### Get All Plans
```
GET /api/subscriptions/plans
```
Returns all available subscription plans.

#### Get Plan Details
```
GET /api/subscriptions/plans/:planType
```
Returns details for a specific plan type (basic, premium, enterprise).

### Authenticated Endpoints

#### Get My Subscription
```
GET /api/subscriptions/my-subscription
Authorization: Bearer <token>
```
Returns the current user's active subscription.

#### Check Subscription Limits
```
GET /api/subscriptions/limits?limitType=properties
Authorization: Bearer <token>
```
Check subscription limits for properties, photos, or featured properties.

#### Create Subscription
```
POST /api/subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "planType": "premium",
  "billingCycle": "monthly",
  "autoRenew": true
}
```

#### Get Subscriptions
```
GET /api/subscriptions?page=1&limit=20&status=active&planType=premium
Authorization: Bearer <token>
```
Get all subscriptions (admin can see all, users see only their own).

#### Get Subscription by ID
```
GET /api/subscriptions/:subscriptionId
Authorization: Bearer <token>
```

#### Update Subscription
```
PUT /api/subscriptions/:subscriptionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "autoRenew": false,
  "billingCycle": "yearly"
}
```

#### Activate Subscription
```
POST /api/subscriptions/:subscriptionId/activate
Authorization: Bearer <token>
```
Activate a subscription (usually called automatically after payment).

#### Cancel Subscription
```
POST /api/subscriptions/:subscriptionId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancellationReason": "No longer needed"
}
```

#### Renew Subscription
```
POST /api/subscriptions/:subscriptionId/renew
Authorization: Bearer <token>
Content-Type: application/json

{
  "billingCycle": "yearly" // Optional
}
```

#### Initialize Subscription Payment
```
POST /api/subscriptions/:subscriptionId/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "callbackUrl": "https://example.com/callback",
  "channels": ["card", "bank"]
}
```

Returns payment authorization URL and reference.

## Subscription Flow

### 1. Create Subscription
1. User selects a plan (basic, premium, enterprise, or custom)
2. User chooses billing cycle (monthly or yearly)
3. Subscription is created with status `pending`
4. User is redirected to payment

### 2. Payment Processing
1. User initializes payment via `/api/subscriptions/:id/payment`
2. Payment is processed through Paystack
3. User completes payment on Paystack
4. Paystack webhook notifies backend
5. Subscription is automatically activated

### 3. Subscription Activation
- Status changes from `pending` to `active`
- End date is calculated based on billing cycle
- Next billing date is set if auto-renewal is enabled
- User receives notification

### 4. Subscription Management
- User can view subscription details
- User can cancel subscription
- User can renew expired subscription
- User can update auto-renewal settings

## Payment Integration

### Paystack Integration
- Subscription payments are processed through Paystack
- Payment webhook automatically activates subscription
- Payment records are linked to subscriptions
- Failed payments keep subscription in `pending` status

### Payment Flow
1. User creates subscription → Status: `pending`
2. User initializes payment → Payment record created
3. User pays via Paystack → Payment status: `completed`
4. Webhook received → Subscription activated → Status: `active`

## Subscription Limits

The system enforces limits based on subscription plan:

- **Properties**: Maximum number of active properties
- **Photos**: Maximum photos per property
- **Featured**: Maximum featured properties

Use `/api/subscriptions/limits?limitType=properties` to check current usage.

## Database Schema

### Subscription Model
- `id` - UUID primary key
- `userId` - User ID (foreign key)
- `planName` - Plan name
- `planType` - basic, premium, enterprise, custom
- `status` - active, inactive, cancelled, expired, pending
- `startDate` - Subscription start date
- `endDate` - Subscription end date
- `billingCycle` - monthly, yearly, custom
- `monthlyPrice` - Monthly price
- `yearlyPrice` - Yearly price
- `maxProperties` - Maximum properties allowed
- `maxPhotosPerProperty` - Maximum photos per property
- `featuredProperties` - Featured properties allowed
- `prioritySupport` - Priority support access
- `analyticsAccess` - Analytics access
- `autoRenew` - Auto-renewal enabled
- `nextBillingDate` - Next billing date
- `cancelledAt` - Cancellation timestamp
- `cancellationReason` - Reason for cancellation
- `features` - JSON array of plan features
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Security

- All endpoints require JWT authentication
- Users can only view/manage their own subscriptions
- Admins can view/manage all subscriptions
- Payment authorization checks prevent unauthorized payments
- Subscription limits are enforced at property creation

## Notifications

Users receive notifications for:
- Subscription activation
- Subscription cancellation
- Subscription renewal
- Payment success/failure
- Subscription expiration warnings

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Validation errors if any
}
```

## Testing

Test the subscription system using:
1. Create a subscription
2. Initialize payment
3. Complete payment via Paystack test mode
4. Verify subscription activation
5. Test limits enforcement
6. Test cancellation and renewal

## Future Enhancements

- [ ] Subscription upgrade/downgrade
- [ ] Prorated billing for mid-cycle changes
- [ ] Subscription usage analytics
- [ ] Automated billing reminders
- [ ] Subscription gift cards
- [ ] Team/organization subscriptions
- [ ] Subscription add-ons
- [ ] Free trial periods

