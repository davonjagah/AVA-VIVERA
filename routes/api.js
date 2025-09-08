const express = require("express");
const router = express.Router();
const { getDatabase } = require("../config/database");
const events = require("../config/events");
const {
  sendPaymentConfirmation,
  sendPaymentFailure,
  sendPaymentReminder,
} = require("../utils/emailService");
const QRCode = require("qrcode");

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
          agiMember: formData.agiMember === "on" || formData.agiMember === true,
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
      totalAmount: amount,
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

    console.log(`[${callbackId}] 📋 Extracted Data:`, {
      clientReference,
      paymentStatus,
      amount: hubtelData.Amount,
      checkoutId: hubtelData.CheckoutId,
    });

    // Check if this callback has already been processed
    let existingRegistration;
    try {
      const db = await getDatabase();
      const registrations = db.collection("registrations");

      existingRegistration = await registrations.findOne({
        clientReference: clientReference,
      });

      if (!existingRegistration) {
        console.log(
          `[${callbackId}] ❌ Registration not found for clientReference: ${clientReference}`
        );
        return res.status(404).json({
          status: "error",
          message: "Registration not found",
        });
      }

      console.log(`[${callbackId}] ✅ Registration found:`, {
        clientReference: existingRegistration.clientReference,
        eventName: existingRegistration.eventName,
        paymentStatus: existingRegistration.paymentStatus,
      });

      // Check if payment status is already final (completed/failed)
      if (
        existingRegistration.paymentStatus === "completed" ||
        existingRegistration.paymentStatus === "failed"
      ) {
        console.log(
          `[${callbackId}] ⚠️ Payment already processed with status: ${existingRegistration.paymentStatus}`
        );
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
      console.log(`[${callbackId}] 💰 Processing successful payment`);
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

        console.log(
          `[${callbackId}] ✅ Database updated successfully for payment completion`
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
        console.log(
          `[${callbackId}] ❌ Database update failed:`,
          dbError.message
        );
        return res.status(500).json({
          status: "error",
          message: "Database update failed",
        });
      }
    } else {
      console.log(
        `[${callbackId}] ❌ Processing failed payment with status: ${paymentStatus}`
      );
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

        console.log(
          `[${callbackId}] ✅ Database updated successfully for payment failure`
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
        console.log(
          `[${callbackId}] ❌ Database update failed:`,
          dbError.message
        );
        return res.status(500).json({
          status: "error",
          message: "Database update failed",
        });
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
    console.error("Error fetching registrations:", error);
    // Return empty array if database is not available
    res.json({
      success: true,
      count: 0,
      registrations: [],
      message: "Database temporarily unavailable. Showing empty list.",
    });
  }
});

// Get specific registration by client reference
router.get("/registrations/:clientReference", async (req, res) => {
  try {
    const { clientReference } = req.params;

    if (!clientReference) {
      return res.status(400).json({
        success: false,
        error: "clientReference is required",
      });
    }

    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
      });
    }

    res.json({
      success: true,
      registration: registration,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch registration",
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

// Offline registration endpoint
router.post("/offline-registration", async (req, res) => {
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

    // Generate unique client reference with "Offline" prefix
    const clientReference =
      "Offline_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Extract amount from price
    const amount = parseFloat(eventData.price.replace(/[^\d.]/g, ""));

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
          agiMember: formData.agiMember || false,
        },
        paymentStatus: "completed", // Offline registrations are marked as completed
        paymentData: {
          amount: amount,
          description: `Offline registration for ${eventData.title} - ${formData.fullName}`,
          completedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await registrations.insertOne(registrationData);

      // Send confirmation email
      try {
        const emailResult = await sendPaymentConfirmation(registrationData, {
          Amount: amount,
        });
        if (emailResult.success) {
          console.log(
            `✅ Offline registration email sent successfully to ${formData.email}`
          );
        } else {
          console.log(
            `⚠️ Email sending failed for offline registration: ${emailResult.error}`
          );
        }
      } catch (emailError) {
        console.log(
          `⚠️ Email sending error for offline registration: ${emailError.message}`
        );
      }

      res.json({
        success: true,
        message: "Offline registration created successfully",
        clientReference: clientReference,
      });
    } catch (dbError) {
      console.error("Database error for offline registration:", dbError);
      res.status(500).json({ error: "Database error" });
    }
  } catch (error) {
    console.error("Offline registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Transaction status check endpoint
router.get("/transaction-status/:clientReference", async (req, res) => {
  const { clientReference } = req.params;
  const { hubtelTransactionId, networkTransactionId } = req.query;

  try {
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Import Hubtel service
    const hubtelService = require("../utils/hubtelService");

    // Check if Hubtel service is configured
    if (!hubtelService.isConfigured()) {
      console.warn(
        `⚠️ Hubtel service not configured, returning local status for ${clientReference}`
      );
      return res.json({
        status: registration.paymentStatus,
        clientReference: clientReference,
        registration: registration,
        source: "local",
        hubtelConfigured: false,
      });
    }

    // Verify with Hubtel API for real-time status
    console.log(
      `🔍 Checking Hubtel status for transaction: ${clientReference}`
    );
    const hubtelResult = await hubtelService.checkTransactionStatus(
      clientReference,
      hubtelTransactionId,
      networkTransactionId
    );

    if (hubtelResult.success) {
      const hubtelStatus = hubtelService.mapHubtelStatus(
        hubtelResult.data.TransactionStatus
      );
      const localStatus = registration.paymentStatus;

      console.log(`📊 Status comparison for ${clientReference}:`, {
        local: localStatus,
        hubtel: hubtelStatus,
        hubtelRaw: hubtelResult.data.TransactionStatus,
      });

      // Only update database if transaction is not already completed in our database
      if (localStatus !== "completed") {
        if (hubtelStatus !== localStatus) {
          console.log(
            `🔄 Updating local status for ${clientReference}: ${localStatus} → ${hubtelStatus}`
          );

          await registrations.updateOne(
            { clientReference },
            {
              $set: {
                paymentStatus: hubtelStatus,
                updatedAt: new Date(),
                lastHubtelCheck: new Date(),
                hubtelData: hubtelResult.data,
              },
            }
          );

          // Update the registration object for response
          registration.paymentStatus = hubtelStatus;
          registration.lastHubtelCheck = new Date();
          registration.hubtelData = hubtelResult.data;
        } else {
          // Just update the last check time
          await registrations.updateOne(
            { clientReference },
            {
              $set: {
                lastHubtelCheck: new Date(),
                hubtelData: hubtelResult.data,
              },
            }
          );
        }
      } else {
        // Transaction is already completed in our database, just update check time
        console.log(
          `ℹ️ Transaction ${clientReference} already completed in database, only updating check time`
        );

        await registrations.updateOne(
          { clientReference },
          {
            $set: {
              lastHubtelCheck: new Date(),
              hubtelData: hubtelResult.data,
            },
          }
        );
      }

      res.json({
        status: hubtelStatus,
        clientReference: clientReference,
        registration: registration,
        source: "hubtel",
        hubtelData: hubtelResult.data,
        hubtelConfigured: true,
      });
    } else {
      console.error(
        `❌ Hubtel status check failed for ${clientReference}:`,
        hubtelResult.error
      );

      // Return local status if Hubtel check fails
      res.json({
        status: registration.paymentStatus,
        clientReference: clientReference,
        registration: registration,
        source: "local",
        hubtelConfigured: true,
        hubtelError: hubtelResult.error,
        hubtelResponseCode: hubtelResult.responseCode,
      });
    }
  } catch (error) {
    console.error(
      `❌ Transaction status check error for ${clientReference}:`,
      error
    );
    res.status(500).json({
      error: "Failed to check transaction status",
      details: error.message,
    });
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

// Get pending registrations for admin
router.get("/pending-registrations", async (req, res) => {
  try {
    const db = await getDatabase();
    const registrations = db.collection("registrations");

    const pendingRegistrations = await registrations
      .find({ paymentStatus: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: pendingRegistrations.length,
      registrations: pendingRegistrations,
    });
  } catch (error) {
    console.error("Error fetching pending registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending registrations",
    });
  }
});

// Send payment reminder email
router.post("/send-payment-reminder", async (req, res) => {
  console.log("📧 API: Payment reminder request received");
  console.log("📧 Request body:", req.body);

  try {
    const { clientReference } = req.body;

    if (!clientReference) {
      console.error("❌ API: Missing clientReference in request");
      return res.status(400).json({
        success: false,
        error: "clientReference is required",
      });
    }

    console.log(
      "📧 API: Looking up registration for clientReference:",
      clientReference
    );

    const db = await getDatabase();
    const registrations = db.collection("registrations");

    // Find the registration
    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      console.error(
        "❌ API: Registration not found for clientReference:",
        clientReference
      );
      return res.status(404).json({
        success: false,
        error: "Registration not found",
      });
    }

    console.log("📧 API: Registration found:", {
      clientReference: registration.clientReference,
      customerName: registration.customerInfo.fullName,
      customerEmail: registration.customerInfo.email,
      eventType: registration.eventType,
      paymentStatus: registration.paymentStatus,
    });

    if (registration.paymentStatus !== "pending") {
      console.error(
        "❌ API: Cannot send reminder - payment status is not pending:",
        registration.paymentStatus
      );
      return res.status(400).json({
        success: false,
        error: "Can only send reminders for pending registrations",
      });
    }

    console.log(
      "📧 API: Payment status is pending, proceeding to send reminder"
    );

    // Send the reminder email
    console.log("📧 API: Calling sendPaymentReminder function...");
    const emailResult = await sendPaymentReminder(registration);
    console.log("📧 API: sendPaymentReminder result:", emailResult);

    if (emailResult.success) {
      console.log("✅ API: Email sent successfully, updating database...");

      // Update the registration to track reminder sent
      const updateResult = await registrations.updateOne(
        { clientReference },
        {
          $set: {
            lastReminderSent: new Date(),
            reminderCount: (registration.reminderCount || 0) + 1,
          },
        }
      );

      console.log("✅ API: Database updated successfully:", updateResult);

      res.json({
        success: true,
        message: "Payment reminder sent successfully",
        emailResult,
        clientReference,
        databaseUpdate: updateResult,
      });
    } else {
      console.error("❌ API: Failed to send payment reminder");
      console.error("❌ API: Email error:", emailResult.error);

      res.status(500).json({
        success: false,
        error: "Failed to send payment reminder",
        emailError: emailResult.error,
      });
    }
  } catch (error) {
    console.error("❌ API: Error in send-payment-reminder endpoint:", error);
    console.error("❌ API: Error stack:", error.stack);

    res.status(500).json({
      success: false,
      error: "Failed to send payment reminder",
      details: error.message,
    });
  }
});

// Send success email to deferred and completed registrations
router.post("/send-success-email", async (req, res) => {
  console.log("📧 API: Success email request received");
  console.log("📧 Request body:", req.body);

  try {
    const { clientReference } = req.body;

    if (!clientReference) {
      console.error("❌ API: Missing clientReference in request");
      return res.status(400).json({
        success: false,
        error: "clientReference is required",
      });
    }

    console.log(
      "📧 API: Looking up registration for clientReference:",
      clientReference
    );

    const db = await getDatabase();
    const registrations = db.collection("registrations");

    // Find the registration
    const registration = await registrations.findOne({ clientReference });

    if (!registration) {
      console.error(
        "❌ API: Registration not found for clientReference:",
        clientReference
      );
      return res.status(404).json({
        success: false,
        error: "Registration not found",
      });
    }

    console.log("📧 API: Registration found:", {
      clientReference: registration.clientReference,
      customerName: registration.customerInfo.fullName,
      customerEmail: registration.customerInfo.email,
      eventType: registration.eventType,
      paymentStatus: registration.paymentStatus,
    });

    // Only allow success emails for deferred and completed registrations
    if (!["deferred", "completed"].includes(registration.paymentStatus)) {
      console.error(
        "❌ API: Cannot send success email - payment status is not deferred or completed:",
        registration.paymentStatus
      );
      return res.status(400).json({
        success: false,
        error:
          "Can only send success emails for deferred or completed registrations",
      });
    }

    console.log(
      "📧 API: Payment status is eligible, proceeding to send success email"
    );

    // Create payment data for the email
    const paymentData = {
      Amount:
        registration.paymentData?.amount ||
        registration.eventPrice?.replace(/[^\d.]/g, "") ||
        0,
    };

    // Send the success email
    console.log("📧 API: Calling sendPaymentConfirmation function...");
    const emailResult = await sendPaymentConfirmation(
      registration,
      paymentData
    );
    console.log("📧 API: sendPaymentConfirmation result:", emailResult);

    if (emailResult.success) {
      console.log(
        "✅ API: Success email sent successfully, updating database..."
      );

      // Update the registration to track success email sent
      const updateResult = await registrations.updateOne(
        { clientReference },
        {
          $set: {
            lastSuccessEmailSent: new Date(),
            successEmailCount: (registration.successEmailCount || 0) + 1,
          },
        }
      );

      console.log("✅ API: Database updated successfully:", updateResult);

      res.json({
        success: true,
        message: "Success email sent successfully",
        emailResult,
        clientReference,
        databaseUpdate: updateResult,
      });
    } else {
      console.error("❌ API: Failed to send success email");
      console.error("❌ API: Email error:", emailResult.error);

      res.status(500).json({
        success: false,
        error: "Failed to send success email",
        emailError: emailResult.error,
      });
    }
  } catch (error) {
    console.error("❌ API: Error in send-success-email endpoint:", error);
    console.error("❌ API: Error stack:", error.stack);

    res.status(500).json({
      success: false,
      error: "Failed to send success email",
      details: error.message,
    });
  }
});

// Test Hubtel transaction status check endpoint
router.post("/test-hubtel-status", async (req, res) => {
  try {
    const { clientReference, hubtelTransactionId, networkTransactionId } =
      req.body;

    if (!clientReference) {
      return res.status(400).json({
        success: false,
        error: "clientReference is required",
      });
    }

    const hubtelService = require("../utils/hubtelService");

    if (!hubtelService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error:
          "Hubtel service not configured. Please set HUBTEL_APP_ID, HUBTEL_API_KEY, and HUBTEL_MERCHANT_ID environment variables.",
      });
    }

    console.log(`🧪 Testing Hubtel status check for: ${clientReference}`);

    const result = await hubtelService.checkTransactionStatus(
      clientReference,
      hubtelTransactionId,
      networkTransactionId
    );

    res.json({
      success: true,
      test: true,
      clientReference,
      hubtelResult: result,
      configured: hubtelService.isConfigured(),
    });
  } catch (error) {
    console.error("Test Hubtel status check error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Simple test endpoint to verify Hubtel API directly
router.get("/test-hubtel-direct/:clientReference", async (req, res) => {
  try {
    const { clientReference } = req.params;
    const https = require("https");

    // Use the same authentication as payment initiation
    const appId = process.env.HUBTEL_APP_ID;
    const apiKey = process.env.HUBTEL_API_KEY;

    if (!appId || !apiKey) {
      return res.status(400).json({
        error: "HUBTEL_APP_ID and HUBTEL_API_KEY must be configured",
      });
    }

    const credentials = `${appId}:${apiKey}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const authHeader = `Basic ${base64Credentials}`;

    console.log("🔧 Using Hubtel credentials:", {
      appId: appId ? "configured" : "missing",
      apiKey: apiKey ? "configured" : "missing",
      authHeader: authHeader.substring(0, 20) + "...",
    });

    const results = [];

    const merchantId = process.env.HUBTEL_MERCHANT_ID || "11684";

    const options = {
      hostname: "rmsc.hubtel.com",
      port: 443,
      path: `/v1/merchantaccount/merchants/${merchantId}/transactions/status?clientReference=${clientReference}`,
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "AVA-VIVERA/1.0",
      },
    };

    console.log("🔧 Testing Hubtel API with correct credentials:", {
      hostname: options.hostname,
      path: options.path,
      authorization: options.headers.Authorization.substring(0, 20) + "...",
    });

    const result = await new Promise((resolve) => {
      const request = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          console.log("🔧 Hubtel API Response:", {
            statusCode: response.statusCode,
            data: data,
          });

          resolve({
            statusCode: response.statusCode,
            data: data,
            parsed: data
              ? (() => {
                  try {
                    return JSON.parse(data);
                  } catch (e) {
                    return null;
                  }
                })()
              : null,
          });
        });
      });

      request.on("error", (error) => {
        console.error("Hubtel API Error:", error);
        resolve({
          error: error.message,
        });
      });

      request.end();
    });

    results.push(result);

    res.json({
      clientReference,
      results,
    });
  } catch (error) {
    console.error("Direct test error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
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

    // Check if payment was successful (completed or deferred)
    if (
      registration.paymentStatus !== "completed" &&
      registration.paymentStatus !== "deferred"
    ) {
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
        amount: registration.paymentData?.amount || registration.amount,
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

// Generate QR code for event registration
router.get("/qr-code/:eventType", async (req, res) => {
  try {
    const { eventType } = req.params;
    const { size = 200, format = "png" } = req.query;

    // Validate event type
    if (!events[eventType]) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    // Generate registration URL
    const baseUrl =
      process.env.BASE_URL ||
      "https://valuecreationsummit.accessviewafrica.com";
    const registrationUrl = `${baseUrl}/register?event=${eventType}`;

    // Generate QR code
    const qrCodeBuffer = await QRCode.toBuffer(registrationUrl, {
      type: `image/${format}`,
      width: parseInt(size),
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Set appropriate headers
    res.set({
      "Content-Type": `image/${format}`,
      "Content-Length": qrCodeBuffer.length,
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.send(qrCodeBuffer);
  } catch (error) {
    console.error("QR code generation failed:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Generate QR code for main page
router.get("/qr-code", async (req, res) => {
  try {
    const { size = 200, format = "png" } = req.query;

    // Generate main page URL
    const baseUrl =
      process.env.BASE_URL ||
      "https://valuecreationsummit.accessviewafrica.com";
    const mainUrl = `${baseUrl}/`;

    // Generate QR code
    const qrCodeBuffer = await QRCode.toBuffer(mainUrl, {
      type: `image/${format}`,
      width: parseInt(size),
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Set appropriate headers
    res.set({
      "Content-Type": `image/${format}`,
      "Content-Length": qrCodeBuffer.length,
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.send(qrCodeBuffer);
  } catch (error) {
    console.error("QR code generation failed:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Get QR code data as base64 for frontend use
router.get("/qr-data/:eventType", async (req, res) => {
  try {
    const { eventType } = req.params;
    const { size = 200 } = req.query;

    // Validate event type
    if (!events[eventType]) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    // Generate registration URL
    const baseUrl =
      process.env.BASE_URL ||
      "https://valuecreationsummit.accessviewafrica.com";
    const registrationUrl = `${baseUrl}/register?event=${eventType}`;

    // Generate QR code as base64
    const qrCodeDataURL = await QRCode.toDataURL(registrationUrl, {
      width: parseInt(size),
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    res.json({
      success: true,
      eventType,
      url: registrationUrl,
      qrCode: qrCodeDataURL,
      eventData: events[eventType],
    });
  } catch (error) {
    console.error("QR code generation failed:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Get all QR codes data
router.get("/qr-codes", async (req, res) => {
  try {
    const { size = 200 } = req.query;
    const baseUrl =
      process.env.BASE_URL ||
      "https://valuecreationsummit.accessviewafrica.com";

    const qrCodes = [];

    // Generate QR codes for all events
    for (const [eventType, eventData] of Object.entries(events)) {
      const registrationUrl = `${baseUrl}/register?event=${eventType}`;

      const qrCodeDataURL = await QRCode.toDataURL(registrationUrl, {
        width: parseInt(size),
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      qrCodes.push({
        eventType,
        eventData,
        url: registrationUrl,
        qrCode: qrCodeDataURL,
      });
    }

    // Generate main page QR code
    const mainUrl = `${baseUrl}/`;
    const mainQRCode = await QRCode.toDataURL(mainUrl, {
      width: parseInt(size),
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    res.json({
      success: true,
      events: qrCodes,
      mainPage: {
        url: mainUrl,
        qrCode: mainQRCode,
      },
    });
  } catch (error) {
    console.error("QR codes generation failed:", error);
    res.status(500).json({ error: "Failed to generate QR codes" });
  }
});

module.exports = router;
