const express = require("express");
const router = express.Router();
const { getDatabase } = require("../config/database");
const events = require("../config/events");
const {
  sendPaymentConfirmation,
  sendPaymentFailure,
} = require("../utils/emailService");

// Get all events
router.get("/events", (req, res) => {
  // Convert events object to array for API response
  const eventsArray = Object.values(events);
  res.json(eventsArray);
});

// Get specific event by ID
router.get("/events/:id", (req, res) => {
  const eventId = req.params.id;

  const event = events[eventId];
  if (event) {
    res.json(event);
  } else {
    res.status(404).json({ error: "Event not found" });
  }
});

// Secure payment initialization endpoint
router.post("/initiate-payment", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { formData, eventType } = req.body;

    // Validate required data
    if (!formData || !eventType) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // Get event data from config
    const eventData = events[eventType];
    if (!eventData) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    // Generate unique client reference
    const clientReference =
      "event_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Save registration to MongoDB
    try {
      const db = await getDatabase();
      const registrations = db.collection("registrations");

      const registrationData = {
        clientReference,
        eventType,
        eventName: eventData.title,
        eventPrice: eventData.price,
        eventDate: eventData.date || "September 9, 2025",
        eventLocation: eventData.location || "Accra City Hotel",
        customerInfo: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          organization: formData.organization,
        },
        paymentStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await registrations.insertOne(registrationData);
    } catch (dbError) {}

    // Extract amount from price
    const amount = parseFloat(eventData.price.replace(/[^\d.]/g, ""));

    // Format phone number to international format
    let phoneNumber = formData.phone.replace(/\D/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "233" + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith("233")) {
      phoneNumber = "233" + phoneNumber;
    }

    // Create purchase info with sensitive data handled server-side
    const purchaseInfo = {
      amount: amount, // Ensure it's a number
      purchaseDescription: `Payment of GHS ${amount.toFixed(2)} for ${
        eventData.title
      } - ${formData.fullName}`,
      customerPhoneNumber: phoneNumber, // International format
      clientReference: clientReference,
    };

    // Validate Hubtel credentials
    if (
      !process.env.HUBTEL_APP_ID ||
      !process.env.HUBTEL_API_KEY ||
      !process.env.HUBTEL_MERCHANT_ID
    ) {
      return res.status(500).json({
        error: "Payment gateway configuration error. Please contact support.",
      });
    }

    // Validate merchant account is a number
    const merchantAccount = parseInt(process.env.HUBTEL_MERCHANT_ID);
    if (isNaN(merchantAccount)) {
      return res.status(500).json({
        error: "Payment gateway configuration error. Please contact support.",
      });
    }

    // Create Hubtel Online Checkout API request
    const hubtelRequest = {
      //totalAmount: amount,
      totalAmount: 5,
      description: `Payment for ${eventData.title} - ${formData.fullName}`,
      callbackUrl:
        process.env.CALLBACK_URL ||
        `${req.protocol}://${req.get("host")}/api/payment-callback`,
      returnUrl: `${req.protocol}://${req.get(
        "host"
      )}/payment-success?ref=${clientReference}`,
      merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,
      cancellationUrl: `${req.protocol}://${req.get(
        "host"
      )}/payment-cancelled?ref=${clientReference}`,
      clientReference: clientReference,
      payeeName: formData.fullName,
      payeeMobileNumber: phoneNumber,
      payeeEmail: formData.email,
    };

    // Call Hubtel Online Checkout API
    try {
      const hubtelResponse = await fetch(
        "https://payproxyapi.hubtel.com/items/initiate",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
              `${process.env.HUBTEL_APP_ID}:${process.env.HUBTEL_API_KEY}`
            ).toString("base64")}`,
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify(hubtelRequest),
        }
      );

      if (!hubtelResponse.ok) {
        throw new Error(`Hubtel API error: ${hubtelResponse.status}`);
      }

      const hubtelData = await hubtelResponse.json();

      if (hubtelData.responseCode !== "0000") {
        throw new Error(`Hubtel API error: ${hubtelData.status}`);
      }

      // Return the checkout URL to the client
      res.json({
        success: true,
        checkoutUrl: hubtelData.data.checkoutUrl,
        checkoutId: hubtelData.data.checkoutId,
        clientReference: clientReference,
      });
    } catch (hubtelError) {
      res.status(500).json({
        error: "Failed to initialize payment with Hubtel",
        details: hubtelError.message,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// Payment callback endpoint for Hubtel
router.post("/payment-callback", async (req, res) => {
  const callbackId = `callback_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Temporary logging for testing
  console.log(`[${callbackId}] 🔔 CALLBACK RECEIVED`);
  console.log(
    `[${callbackId}] 📦 Request Body:`,
    JSON.stringify(req.body, null, 2)
  );

  try {
    const paymentData = req.body;

    // Validate required fields for Hubtel Online Checkout API
    if (
      !paymentData.Data ||
      !paymentData.Data.ClientReference ||
      !paymentData.Data.Status
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid callback data",
      });
    }

    // Extract data from Hubtel Online Checkout API response
    const hubtelData = paymentData.Data;
    const clientReference = hubtelData.ClientReference;
    const paymentStatus = hubtelData.Status;

    // Check if this callback has already been processed
    try {
      const db = await getDatabase();
      const registrations = db.collection("registrations");

      const existingRegistration = await registrations.findOne({
        clientReference: clientReference,
      });

      if (!existingRegistration) {
        return res.status(404).json({
          status: "error",
          message: "Registration not found",
        });
      }

      // Check if payment status is already final (completed/failed)
      if (
        existingRegistration.paymentStatus === "completed" ||
        existingRegistration.paymentStatus === "failed"
      ) {
        return res.status(200).json({
          status: "success",
          message: "Payment already processed",
        });
      }
    } catch (dbError) {
      return res.status(500).json({
        status: "error",
        message: "Database error",
      });
    }

    if (paymentStatus === "Success") {
      // Update database with payment status
      try {
        const db = await getDatabase();
        const registrations = db.collection("registrations");

        await registrations.updateOne(
          { clientReference: clientReference },
          {
            $set: {
              paymentStatus: "completed",
              paymentData: {
                checkoutId: hubtelData.CheckoutId,
                salesInvoiceId: hubtelData.SalesInvoiceId,
                amount: hubtelData.Amount,
                customerPhoneNumber: hubtelData.CustomerPhoneNumber,
                paymentDetails: hubtelData.PaymentDetails,
                description: hubtelData.Description,
                completedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          }
        );

        // Send confirmation email to customer
        try {
          const emailResult = await sendPaymentConfirmation(
            existingRegistration,
            hubtelData
          );
          if (emailResult.success) {
            console.log(
              `[${callbackId}] ✅ Confirmation email sent successfully`
            );
          } else {
            console.log(
              `[${callbackId}] ⚠️ Email sending failed:`,
              emailResult.error
            );
          }
        } catch (emailError) {
          console.log(
            `[${callbackId}] ⚠️ Email sending error:`,
            emailError.message
          );
        }
      } catch (dbError) {
        // Database update failed
      }
    } else {
      // Update database with failed payment status
      try {
        const db = await getDatabase();
        const registrations = db.collection("registrations");

        await registrations.updateOne(
          { clientReference: clientReference },
          {
            $set: {
              paymentStatus: "failed",
              paymentData: {
                checkoutId: hubtelData.CheckoutId,
                salesInvoiceId: hubtelData.SalesInvoiceId,
                amount: hubtelData.Amount,
                customerPhoneNumber: hubtelData.CustomerPhoneNumber,
                description: hubtelData.Description,
                failedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          }
        );

        // Send failure email to customer
        try {
          const emailResult = await sendPaymentFailure(
            existingRegistration,
            hubtelData
          );
          if (emailResult.success) {
            console.log(`[${callbackId}] ✅ Failure email sent successfully`);
          } else {
            console.log(
              `[${callbackId}] ⚠️ Email sending failed:`,
              emailResult.error
            );
          }
        } catch (emailError) {
          console.log(
            `[${callbackId}] ⚠️ Email sending error:`,
            emailError.message
          );
        }
      } catch (dbError) {
        // Database update failed
      }
    }

    // Respond to Hubtel
    console.log(`[${callbackId}] ✅ CALLBACK PROCESSED SUCCESSFULLY`);
    res.status(200).json({
      status: "success",
      message: "Payment callback received successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.get("/hubtel-config", (req, res) => {
  try {
    const config = {
      appId: process.env.HUBTEL_APP_ID,
      branding: process.env.HUBTEL_BRANDING || "enabled",
      integrationType: process.env.HUBTEL_INTEGRATION_TYPE || "External",
      callbackUrl:
        process.env.CALLBACK_URL ||
        `${req.protocol}://${req.get("host")}/api/payment-callback`,
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to load configuration" });
  }
});

// Get all registrations (for admin purposes)
router.get("/registrations", async (req, res) => {
  try {
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const allRegistrations = await registrations
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: allRegistrations.length,
      registrations: allRegistrations,
    });
  } catch (error) {
    // Return empty array if database is not available
    res.json({
      success: true,
      count: 0,
      registrations: [],
      message: "Database temporarily unavailable. Showing empty list.",
    });
  }
});

// Get registration by client reference
router.get("/registration/:clientReference", async (req, res) => {
  try {
    const { clientReference } = req.params;
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({
      success: true,
      registration,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch registration" });
  }
});

// Transaction status check endpoint
router.get("/transaction-status/:clientReference", async (req, res) => {
  const { clientReference } = req.params;

  try {
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // TODO: Verify with Hubtel API for real-time status
    // This would make an API call to Hubtel to get the latest transaction status
    // const hubtelStatus = await verifyWithHubtelAPI(clientReference);
    // if (hubtelStatus && hubtelStatus !== registration.paymentStatus) {
    //   // Update local database with latest status from Hubtel
    //   await registrations.updateOne(
    //     { clientReference },
    //     { $set: { paymentStatus: hubtelStatus, updatedAt: new Date() } }
    //   );
    //   registration.paymentStatus = hubtelStatus;
    // }

    res.json({
      status: registration.paymentStatus,
      clientReference: clientReference,
      registration: registration,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check transaction status" });
  }
});

// Database health check endpoint
router.get("/health", async (req, res) => {
  try {
    const db = await getDatabase();
    await db.admin().ping();

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test endpoint to simulate Hubtel callback (for testing only)
router.post("/test-callback", async (req, res) => {
  const testCallbackData = {
    ResponseCode: "0000",
    Status: "Success",
    Data: {
      CheckoutId: "test_checkout_123",
      SalesInvoiceId: "test_invoice_456",
      ClientReference: req.body.clientReference || "test_ref_789",
      Status: "Success",
      Amount: 1500,
      CustomerPhoneNumber: "233200000000",
      PaymentDetails: {
        MobileMoneyNumber: "233200000000",
        PaymentType: "mobilemoney",
        Channel: "mtn-gh",
      },
      Description: "Test payment completed successfully",
    },
  };

  // Forward to the actual callback endpoint
  const response = await fetch(
    `${req.protocol}://${req.get("host")}/api/payment-callback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCallbackData),
    }
  );

  const result = await response.json();
  res.json({
    test: true,
    callbackResult: result,
    testData: testCallbackData,
  });
});

// Test email endpoint (for testing email configuration)
router.post("/test-email", async (req, res) => {
  try {
    const { email, type = "success", clientReference } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email address is required",
        example: {
          email: "test@example.com",
          type: "success",
          clientReference: "test123",
        },
      });
    }

    // Create test registration data
    const testRegistration = {
      customerInfo: {
        fullName: "Test User",
        email: email,
      },
      eventName: "CEO Roundtable: Lead the Business, Scale to Legacy",
      clientReference: clientReference || "test_email_" + Date.now(),
      eventDate: "September 9, 2025",
      eventLocation: "Accra City Hotel",
    };

    // Create test payment data
    const testPaymentData = {
      amount: 1500,
      paymentDetails: {
        PaymentType: "mobilemoney",
      },
    };

    let emailResult;
    if (type === "success") {
      emailResult = await sendPaymentConfirmation(
        testRegistration,
        testPaymentData
      );
    } else {
      emailResult = await sendPaymentFailure(testRegistration, testPaymentData);
    }

    res.json({
      success: true,
      message: `Test ${type} email sent successfully`,
      emailResult: emailResult,
      testData: {
        type: type,
        registration: testRegistration,
        payment: testPaymentData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Email test failed",
    });
  }
});

// Registration verification endpoint
router.get("/verify/:clientReference", async (req, res) => {
  try {
    const { clientReference } = req.params;

    // Find registration in database
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
        clientReference: clientReference,
      });
    }

    // Check if payment was successful
    if (registration.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
        clientReference: clientReference,
        paymentStatus: registration.paymentStatus,
      });
    }

    res.json({
      success: true,
      message: "Registration verified successfully",
      registration: {
        fullName: registration.customerInfo.fullName,
        email: registration.customerInfo.email,
        eventName: registration.eventName,
        clientReference: registration.clientReference,
        amount: registration.amount,
        paymentStatus: registration.paymentStatus,
        registrationDate: registration.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Verification failed",
    });
  }
});

module.exports = router;
