const express = require("express");
const router = express.Router();
const { getDatabase } = require("../config/database");

// Get all events
router.get("/events", (req, res) => {
  const events = [
    {
      id: "sme",
      title: "SMEs Connect: Beyond Profit - Building Legacies",
      date: "September 8, 2025",
      time: "9:00 AM",
      location: "Accra City Hotel",
      price: "1,500 GHS",
      description:
        "Calling All SME Owners & Entrepreneurs! Are you ready to transform your business from surviving to thriving?",
    },
    {
      id: "ceo",
      title: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
      date: "September 9, 2025",
      time: "9:00 AM - 3:00 PM",
      location: "Accra City Hotel",
      price: "2,500 GHS",
      description:
        "The greatest shift in your business won't come from more capital or a bigger team — it'll come from you becoming a better leader.",
    },
    {
      id: "wealth",
      title: "Wealth Creation Strategies Masterclass",
      date: "September 12, 2025",
      time: "10:00 AM",
      location: "Accra City Hotel",
      price: "1,200 GHS",
      description:
        "Ready to transform your life and business? Join us for Wealth Creation Strategies, a premium event where you'll gain actionable insights to scale your enterprise.",
    },
  ];

  res.json(events);
});

// Get specific event by ID
router.get("/events/:id", (req, res) => {
  const eventId = req.params.id;
  const events = {
    sme: {
      id: "sme",
      title: "SMEs Connect: Beyond Profit - Building Legacies",
      date: "September 8, 2025",
      time: "9:00 AM",
      location: "Accra City Hotel",
      price: "1,500 GHS",
      description:
        "Calling All SME Owners & Entrepreneurs! Are you ready to transform your business from surviving to thriving?",
    },
    ceo: {
      id: "ceo",
      title: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
      date: "September 9, 2025",
      time: "9:00 AM - 3:00 PM",
      location: "Accra City Hotel",
      price: "2,500 GHS",
      description:
        "The greatest shift in your business won't come from more capital or a bigger team — it'll come from you becoming a better leader.",
    },
    wealth: {
      id: "wealth",
      title: "Wealth Creation Strategies Masterclass",
      date: "September 12, 2025",
      time: "10:00 AM",
      location: "Accra City Hotel",
      price: "1,200 GHS",
      description:
        "Ready to transform your life and business? Join us for Wealth Creation Strategies, a premium event where you'll gain actionable insights to scale your enterprise.",
    },
  };

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

  console.log(`[${requestId}] 🚀 Payment initialization started`);

  try {
    const { formData, eventType } = req.body;

    console.log(`[${requestId}] 📋 Request data:`, {
      eventType: eventType || "undefined",
      formData: formData
        ? {
            ...formData,
            phone: formData.phone ? "***" + formData.phone.slice(-4) : "N/A",
          }
        : "undefined",
    });

    // Validate required data
    if (!formData || !eventType) {
      console.log(`[${requestId}] ❌ Validation failed: Missing required data`);
      return res.status(400).json({ error: "Missing required data" });
    }

    console.log(`[${requestId}] ✅ Validation passed`);

    // Get event data
    const events = {
      sme: {
        eventName: "SMEs Connect: Beyond Profit - Building Legacies",
        price: "1,500 GHS",
      },
      ceo: {
        eventName: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
        price: "2,500 GHS",
      },
      wealth: {
        eventName: "Wealth Creation Strategies Masterclass",
        price: "1,200 GHS",
      },
    };

    console.log(`[${requestId}] 🎯 Event type: ${eventType}`);

    const eventData = events[eventType];
    if (!eventData) {
      console.log(`[${requestId}] ❌ Invalid event type: ${eventType}`);
      return res.status(400).json({ error: "Invalid event type" });
    }

    console.log(`[${requestId}] ✅ Event data loaded:`, {
      eventName: eventData.eventName,
      price: eventData.price,
    });

    // Generate unique client reference
    const clientReference =
      "event_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    console.log(
      `[${requestId}] 🔑 Generated client reference: ${clientReference}`
    );

    // Save registration to MongoDB
    try {
      console.log(`[${requestId}] 💾 Saving registration to database...`);

      const db = await getDatabase();
      const registrations = db.collection("registrations");

      const registrationData = {
        clientReference,
        eventType,
        eventName: eventData.eventName,
        eventPrice: eventData.price,
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

      const result = await registrations.insertOne(registrationData);
      console.log(
        `[${requestId}] ✅ Registration saved to database with ID: ${result.insertedId}`
      );
    } catch (dbError) {
      console.error(`[${requestId}] ❌ Database save error:`, dbError);
      // Continue with payment even if database save fails
    }

    // Extract amount from price
    const amount = parseFloat(eventData.price.replace(/[^\d.]/g, ""));
    console.log(`[${requestId}] 💰 Amount extracted: GHS ${amount}`);

    // Create purchase info with sensitive data handled server-side
    const purchaseInfo = {
      amount: amount,
      purchaseDescription: `Payment of GHS ${amount.toFixed(2)} for ${
        eventData.eventName
      } - ${formData.fullName}`,
      customerPhoneNumber: formData.phone.replace(/\D/g, ""),
      clientReference: clientReference,
    };

    console.log(`[${requestId}] 📝 Purchase info created:`, {
      amount: purchaseInfo.amount,
      description: purchaseInfo.purchaseDescription,
      clientReference: purchaseInfo.clientReference,
      phone: "***" + purchaseInfo.customerPhoneNumber.slice(-4),
    });

    // Create config with sensitive credentials from environment
    const config = {
      branding: process.env.HUBTEL_BRANDING || "enabled",
      callbackUrl:
        process.env.CALLBACK_URL ||
        `${req.protocol}://${req.get("host")}/api/payment-callback`,
      merchantAccount: process.env.HUBTEL_APP_ID, // Use APP_ID as merchantAccount
      basicAuth: process.env.HUBTEL_API_KEY, // Use API_KEY as basicAuthç
    };

    console.log(`[${requestId}] ⚙️ Config created:`, {
      branding: config.branding,
      callbackUrl: config.callbackUrl,
      merchantAccount: config.merchantAccount
        ? "***" + config.merchantAccount.slice(-4)
        : "NOT_SET",
      basicAuth: config.basicAuth
        ? "***" + config.basicAuth.slice(-4)
        : "NOT_SET",
    });

    // Return the payment configuration to the client
    console.log(
      `[${requestId}] ✅ Payment initialization completed successfully`
    );
    res.json({
      success: true,
      purchaseInfo,
      config,
      clientReference,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Payment initiation error:`, error);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// Payment callback endpoint for Hubtel
router.post("/payment-callback", async (req, res) => {
  const callbackId = `callback_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  console.log(`[${callbackId}] 🔔 Payment callback received from Hubtel`);

  try {
    const paymentData = req.body;

    // Validate required fields
    if (!paymentData.clientReference || !paymentData.status) {
      console.log(
        `[${callbackId}] ❌ Invalid callback data: Missing required fields`
      );
      return res.status(400).json({
        status: "error",
        message: "Invalid callback data",
      });
    }

    console.log(`[${callbackId}] 📋 Callback data:`, {
      status: paymentData.status,
      clientReference: paymentData.clientReference,
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      customerPhone: paymentData.customerPhoneNumber
        ? "***" + paymentData.customerPhoneNumber.slice(-4)
        : "N/A",
      paymentMethod: paymentData.paymentMethod,
      timestamp: new Date().toISOString(),
    });

    // Check if this callback has already been processed
    try {
      const db = await getDatabase();
      const registrations = db.collection("registrations");

      const existingRegistration = await registrations.findOne({
        clientReference: paymentData.clientReference,
      });

      if (!existingRegistration) {
        console.log(
          `[${callbackId}] ❌ Registration not found for client reference: ${paymentData.clientReference}`
        );
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
        console.log(
          `[${callbackId}] ⚠️ Payment already processed for client reference: ${paymentData.clientReference} (Status: ${existingRegistration.paymentStatus})`
        );
        return res.status(200).json({
          status: "success",
          message: "Payment already processed",
        });
      }
    } catch (dbError) {
      console.error(`[${callbackId}] ❌ Database check error:`, dbError);
      return res.status(500).json({
        status: "error",
        message: "Database error",
      });
    }

    // TODO: Verify payment signature/authenticity with Hubtel
    // This should be implemented based on Hubtel's security requirements
    // const isValidSignature = verifyHubtelSignature(paymentData, req.headers);
    // if (!isValidSignature) {
    //   console.log(`[${callbackId}] ❌ Invalid payment signature`);
    //   return res.status(401).json({ status: "error", message: "Invalid signature" });
    // }

    if (paymentData.status === "success") {
      console.log(
        `[${callbackId}] ✅ Payment successful for client reference: ${paymentData.clientReference}`
      );

      // Update database with payment status
      try {
        const db = await getDatabase();
        const registrations = db.collection("registrations");

        await registrations.updateOne(
          { clientReference: paymentData.clientReference },
          {
            $set: {
              paymentStatus: "completed",
              paymentData: {
                transactionId: paymentData.transactionId,
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                completedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          }
        );

        console.log(`[${callbackId}] ✅ Database updated with payment success`);
        // TODO: Send confirmation email to customer
      } catch (dbError) {
        console.error(`[${callbackId}] ❌ Database update error:`, dbError);
      }
    } else {
      console.log(
        `[${callbackId}] ❌ Payment failed for client reference: ${paymentData.clientReference}`
      );

      // Update database with failed payment status
      try {
        const db = await getDatabase();
        const registrations = db.collection("registrations");

        await registrations.updateOne(
          { clientReference: paymentData.clientReference },
          {
            $set: {
              paymentStatus: "failed",
              paymentData: {
                transactionId: paymentData.transactionId,
                error: paymentData.error || "Payment failed",
                failedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          }
        );

        console.log(`[${callbackId}] ✅ Database updated with payment failure`);
      } catch (dbError) {
        console.error(`[${callbackId}] ❌ Database update error:`, dbError);
      }
    }

    // Respond to Hubtel
    console.log(`[${callbackId}] 📤 Responding to Hubtel: success`);
    res.status(200).json({
      status: "success",
      message: "Payment callback received successfully",
    });
  } catch (error) {
    console.error(`[${callbackId}] ❌ Payment callback error:`, error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Secure Hubtel configuration endpoint
router.get("/hubtel-config", (req, res) => {
  try {
    // Only return non-sensitive configuration
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
    console.error("Error getting Hubtel config:", error);
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
    res.status(500).json({ error: "Failed to fetch registrations" });
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
    console.error("Error fetching registration:", error);
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
    console.error("Error checking transaction status:", error);
    res.status(500).json({ error: "Failed to check transaction status" });
  }
});

module.exports = router;
