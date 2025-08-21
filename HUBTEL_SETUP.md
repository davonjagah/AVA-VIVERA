# Hubtel Payment Integration Setup Guide

## Overview
This guide will help you configure the Hubtel payment gateway for your Value Creation Summit registration system with **secure environment variable configuration**.

## Prerequisites
1. Hubtel merchant account
2. Your Hubtel credentials (Merchant Account ID and Basic Auth)
3. A publicly accessible domain for callback URLs

## Step 1: Get Your Hubtel Credentials

### App ID
1. Log into your Hubtel dashboard
2. Navigate to your app settings
3. Copy your App ID

### API Key
1. In your Hubtel dashboard, find your API credentials
2. Copy your API Key

**⚠️ IMPORTANT:** The basicAuth field in the Hubtel configuration should be a Base64 encoded string of your credentials in the format `appId:apiKey`. The system automatically handles this encoding.

## Step 2: Set Up Environment Variables

### Create .env file
Create a `.env` file in your project root (copy from `env.example`):

```bash
cp env.example .env
```

### Update .env with your credentials
Edit the `.env` file and update the following values:

```env
# Hubtel Configuration
HUBTEL_APP_ID=your-app-id-here
HUBTEL_API_KEY=your-api-key-here
HUBTEL_BRANDING=enabled
HUBTEL_INTEGRATION_TYPE=External

# Server Configuration
PORT=3000
NODE_ENV=development

# Callback URL (will be auto-generated based on domain)
CALLBACK_URL=https://ava-vivera.vercel.app/api/payment-callback

# MongoDB Configuration
MONGODB_URI=your-mongodb-atlas-connection-string-here
MONGODB_DB_NAME=value-creation-summit
```

**⚠️ IMPORTANT:** Never commit your `.env` file to version control. It's already in `.gitignore`.

## Step 3: Configure Callback URL

1. In your Hubtel dashboard, set your callback URL to:
   ```
   https://ava-vivera.vercel.app/api/payment-callback
   ```

2. This is your actual domain for the Value Creation Summit website.

## Step 4: Deploy with Environment Variables

### For Vercel Deployment
1. In your Vercel dashboard, go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `HUBTEL_APP_ID`
   - `HUBTEL_API_KEY`
   - `HUBTEL_BRANDING`
   - `HUBTEL_INTEGRATION_TYPE`
   - `CALLBACK_URL`
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`

### For Local Development
1. Make sure your `.env` file is in the project root
2. Start the server: `npm run dev`

## Step 5: Test the Integration

1. Deploy your updated code
2. Test the registration flow:
   - Fill out the registration form
   - Click "Proceed to Payment"
   - Verify the Hubtel iframe loads correctly
   - Test a payment (use test credentials if available)

## Step 5: Monitor Payments

### Payment Callbacks
- All payment notifications will be sent to `/api/payment-callback`
- Check your server logs for payment status updates
- Implement email notifications for successful payments

### Transaction Status Check
- Use the endpoint `/api/transaction-status/:clientReference` to check payment status
- Implement this for cases where callbacks fail

## Important Notes

### Security ✅
- ✅ Hubtel credentials are now stored in environment variables
- ✅ No sensitive data in client-side code
- ✅ Server-side payment initialization
- ✅ Always verify payment signatures in production
- ✅ .env file is in .gitignore

### Testing
- Use Hubtel's test environment for development
- Test with small amounts first
- Verify all callback scenarios

### Production Checklist
- [ ] Updated Hubtel credentials
- [ ] Set correct callback URL in Hubtel dashboard
- [ ] Tested payment flow end-to-end
- [ ] Implemented email notifications
- [ ] Set up payment monitoring
- [ ] Configured error handling

## Support

For Hubtel-specific issues:
- Contact Hubtel support
- Check Hubtel documentation
- Verify your account status

For application issues:
- Check server logs
- Verify API endpoints
- Test with different browsers/devices

## File Structure

```
├── .env                          # Environment variables (not in git)
├── env.example                   # Example environment file
├── public/js/register.js         # Payment integration logic
├── routes/api.js                 # Callback endpoints & secure payment init
└── views/register.html           # Registration page
```

## API Endpoints

- `POST /api/initiate-payment` - Secure payment initialization (server-side)
- `POST /api/payment-callback` - Hubtel payment notifications
- `GET /api/registrations` - Get all registrations (admin)
- `GET /api/registration/:clientReference` - Get specific registration
- `GET /api/transaction-status/:clientReference` - Check payment status
- `GET /api/hubtel-config` - Get non-sensitive Hubtel configuration
- `GET /register?event=sme|ceo|wealth` - Registration pages 