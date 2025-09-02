# 🔍 Hubtel Transaction Status Check Implementation

## Overview

This implementation provides the mandatory Hubtel Transaction Status Check API functionality as required by Hubtel. It allows merchants to check the status of transactions in rare instances where the final status is not received from Hubtel after five (5) minutes.

## 🚀 Features

- **Real-time Status Verification**: Check transaction status directly with Hubtel API
- **Automatic Database Updates**: Sync local database with Hubtel's latest status
- **Multiple Identifier Support**: Support for clientReference, hubtelTransactionId, and networkTransactionId
- **Error Handling**: Graceful fallback to local status when Hubtel API is unavailable
- **Comprehensive Logging**: Detailed logging for debugging and monitoring
- **Frontend Integration**: JavaScript utility for status polling

## 📋 API Endpoints

### 1. Transaction Status Check
```
GET /api/transaction-status/:clientReference
```

**Note:** This endpoint uses Hubtel's RMS API which doesn't require IP whitelisting.

**Query Parameters:**
- `hubtelTransactionId` (optional): Hubtel transaction ID
- `networkTransactionId` (optional): Network transaction ID

**Response:**
```json
{
  "status": "completed",
  "clientReference": "ref_123456",
  "registration": { /* full registration data */ },
  "source": "hubtel",
  "hubtelData": {
    "date": "2024-04-25T21:45:48.4740964Z",
    "status": "Paid",
    "transactionId": "7fd01221faeb41469daec7b3561bddc5",
    "externalTransactionId": "0000006824852622",
    "paymentMethod": "mobilemoney",
    "clientReference": "ref_123456",
    "currencyCode": null,
    "amount": 0.1,
    "charges": 0.02,
    "amountAfterCharges": 0.08,
    "isFulfilled": null
  },
  "hubtelConfigured": true
}
```

### 2. Test Hubtel Status Check
```
POST /api/test-hubtel-status
```

**Request Body:**
```json
{
  "clientReference": "ref_123456",
  "hubtelTransactionId": "optional_hubtel_id",
  "networkTransactionId": "optional_network_id"
}
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Hubtel Configuration
HUBTEL_MERCHANT_ID=11684
HUBTEL_AUTH_TOKEN=V25aTnVjZmNiOTU3Yw==
```

### Getting Your Merchant ID

1. The default Merchant ID (11684) is already configured
2. If you need to use a different Merchant ID, update the `HUBTEL_MERCHANT_ID` environment variable
3. No IP whitelisting is required for this endpoint

## 🛠️ Implementation Details

### Backend Service (`utils/hubtelService.js`)

The `HubtelService` class provides:

- **Basic Authentication**: Creates proper Authorization headers
- **HTTP Client**: Handles HTTPS requests to Hubtel API
- **Status Mapping**: Converts Hubtel statuses to internal statuses
- **Error Handling**: Comprehensive error handling and logging

### Status Mapping

| Hubtel Status | Internal Status |
|---------------|-----------------|
| Paid          | completed       |
| Unpaid        | pending         |
| Refunded      | refunded        |
| Failed        | failed          |
| Cancelled     | cancelled       |

### Database Updates

When a status check is performed:

1. **Status Comparison**: Compares local status with Hubtel status
2. **Automatic Updates**: Updates local database if status differs
3. **Audit Trail**: Records last check time and Hubtel data
4. **Fallback**: Returns local status if Hubtel check fails

## 🎯 Frontend Integration

### JavaScript Utility (`public/js/transaction-status.js`)

The `TransactionStatusChecker` class provides:

- **Single Status Check**: Check status once
- **Polling**: Automatic polling with configurable intervals
- **Status Display**: Helper methods for UI display
- **Error Handling**: Comprehensive error handling

### Usage Example

```javascript
// Initialize the checker
const statusChecker = new TransactionStatusChecker();

// Check status once
const result = await statusChecker.checkStatus('ref_123456');

// Start polling
statusChecker.startPolling(
  'ref_123456',
  (result) => {
    // Status update callback
    console.log('Status updated:', result.status);
  },
  (result) => {
    // Polling complete callback
    console.log('Final status:', result.status);
  },
  (error) => {
    // Error callback
    console.error('Polling error:', error);
  }
);
```

## 🔒 Security Considerations

### IP Whitelisting

- **No IP whitelisting required** for this endpoint
- Uses Hubtel's RMS API which is publicly accessible
- Works from any server location

### Authentication

- Uses Basic Authentication with a pre-configured token
- Token is stored securely in environment variables
- No need to manage individual API credentials

### Error Handling

- Graceful fallback to local status when Hubtel API is unavailable
- Comprehensive error logging for debugging
- No sensitive data exposed in error responses

## 📊 Monitoring and Logging

### Console Logs

The implementation provides detailed console logging:

- `🔍 Checking Hubtel transaction status for: [reference]`
- `✅ Hubtel status check successful for [reference]`
- `❌ Hubtel status check failed for [reference]`
- `🔄 Updating local status for [reference]: [old] → [new]`

### Database Audit Trail

Each status check updates the database with:

- `lastHubtelCheck`: Timestamp of last check
- `hubtelData`: Raw response from Hubtel API
- `paymentStatus`: Updated status if different

## 🧪 Testing

### Test Endpoint

Use the test endpoint to verify your configuration:

```bash
curl -X POST http://localhost:3000/api/test-hubtel-status \
  -H "Content-Type: application/json" \
  -d '{"clientReference": "test_ref_123"}'
```

### Manual Testing

1. Create a test transaction
2. Use the transaction status endpoint to check status
3. Verify the response includes Hubtel data
4. Check that local database is updated if status differs

## 🚨 Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   - Check that the merchant ID is correct
   - Verify the authorization token is valid

2. **Credentials Not Configured**
   - Check that HUBTEL_MERCHANT_ID is set
   - Verify HUBTEL_AUTH_TOKEN is configured

3. **Timeout Errors**
   - Network connectivity issues
   - Hubtel API may be experiencing issues

4. **Invalid Response**
   - Check that your POS Sales ID is correct
   - Verify the client reference format

### Debug Mode

Enable detailed logging by checking the console output for:
- Configuration warnings
- API request/response details
- Status comparison logs
- Database update confirmations

## 📈 Performance Considerations

- **Caching**: Consider implementing caching for frequently checked transactions
- **Rate Limiting**: Hubtel may have rate limits on status check requests
- **Polling Intervals**: Use appropriate intervals to avoid excessive API calls
- **Timeout Handling**: 30-second timeout for API requests

## 🔄 Future Enhancements

- **Webhook Integration**: Real-time status updates via webhooks
- **Batch Status Checks**: Check multiple transactions at once
- **Status History**: Track status changes over time
- **Notification System**: Email/SMS notifications for status changes
- **Dashboard Integration**: Admin dashboard for transaction monitoring
