// Test script for email functionality
require('dotenv').config();
const { sendPaymentConfirmation, sendPaymentFailure } = require('./utils/emailService');

async function testEmail() {
  console.log('Testing email functionality...');
  
  // Test registration data
  const testRegistration = {
    customerInfo: {
      fullName: "John Doe",
      email: "test@example.com",
    },
    eventName: "CEO Roundtable: Lead the Business, Scale to Legacy",
    clientReference: "test_" + Date.now(),
    eventDate: "September 9, 2025",
    eventLocation: "Accra City Hotel",
  };

  const testPaymentData = {
    amount: 2500,
    paymentDetails: {
      PaymentType: "mobilemoney",
    },
  };

  try {
    console.log('Sending test success email...');
    const successResult = await sendPaymentConfirmation(testRegistration, testPaymentData);
    console.log('Success email result:', successResult);
    
    console.log('Sending test failure email...');
    const failureResult = await sendPaymentFailure(testRegistration, testPaymentData);
    console.log('Failure email result:', failureResult);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmail();
