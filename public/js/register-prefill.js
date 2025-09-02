// Pre-filled registration page functionality
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded");

  // Get all URL parameters
  const urlParams = new URLSearchParams(window.location.search);

  // Check if we have the required parameters
  if (!urlParams.get("event") || !urlParams.get("ref")) {
    showError(
      "Missing required parameters. Please use the link from your email."
    );
    return;
  }

  // Pre-fill the form with URL parameters
  populateFormFromURL(urlParams);

  // Load event details
  loadEventDetails(urlParams.get("event"));
});

function populateFormFromURL(urlParams) {
  try {
    console.log("Populating form from URL parameters");

    // Get all the customer details from URL
    const customerData = {
      fullName: urlParams.get("fullName") || "",
      email: urlParams.get("email") || "",
      phone: urlParams.get("phone") || "",
      organization: urlParams.get("organization") || "",
      agiMember: urlParams.get("agiMember") === "true",
      eventName: urlParams.get("eventName") || "",
      eventPrice: urlParams.get("eventPrice") || "",
      eventDate: urlParams.get("eventDate") || "",
      eventLocation: urlParams.get("eventLocation") || "",
    };

    console.log("Customer data from URL:", customerData);

    // Populate form fields
    const fullNameEl = document.getElementById("fullName");
    const emailEl = document.getElementById("email");
    const phoneEl = document.getElementById("phone");
    const organizationEl = document.getElementById("organization");
    const eventEl = document.getElementById("event");
    const priceEl = document.getElementById("price");
    const agiMemberEl = document.getElementById("agiMember");
    const agiMembershipGroupEl = document.getElementById("agiMembershipGroup");

    // Set values if elements exist
    if (fullNameEl) fullNameEl.value = customerData.fullName;
    if (emailEl) emailEl.value = customerData.email;
    if (phoneEl) phoneEl.value = customerData.phone;
    if (organizationEl) organizationEl.value = customerData.organization;
    if (eventEl) eventEl.value = customerData.eventName;
    if (priceEl) priceEl.value = customerData.eventPrice;

    // Handle AGI membership
    if (agiMemberEl && customerData.agiMember) {
      agiMemberEl.checked = true;
      if (agiMembershipGroupEl) agiMembershipGroupEl.style.display = "block";
    }

    console.log("Form populated successfully");
  } catch (error) {
    console.error("Error populating form:", error);
    showError("Error loading form data. Please refresh the page.");
  }
}

function loadEventDetails(eventType) {
  try {
    // Get event details from events config
    if (window.events && window.events[eventType]) {
      const event = window.events[eventType];
      const eventTitleEl = document.getElementById("eventTitle");
      const eventSubtitleEl = document.getElementById("eventSubtitle");
      const eventDetailsEl = document.getElementById("eventDetails");

      if (eventTitleEl) {
        eventTitleEl.textContent = `Complete Registration - ${event.eventName}`;
      }
      if (eventSubtitleEl) {
        eventSubtitleEl.textContent = event.subtitle;
      }
      if (eventDetailsEl) {
        eventDetailsEl.textContent = event.details;
      }
    } else {
      console.warn("Events config not loaded or event not found:", eventType);
    }
  } catch (error) {
    console.error("Error loading event details:", error);
  }
}

// Form submission handler
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registrationForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }
});

async function handleFormSubmit(e) {
  e.preventDefault();

  try {
    // Show loading state
    const submitBtn = document.querySelector(".btn-primary");
    if (!submitBtn) return;

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    // Get form data
    const formData = {
      fullName: document.getElementById("fullName")?.value || "",
      email: document.getElementById("email")?.value || "",
      phone: document.getElementById("phone")?.value || "",
      organization: document.getElementById("organization")?.value || "",
      agiMember: document.getElementById("agiMember")?.checked || false,
    };

    // Get event type from URL
    const eventType = new URLSearchParams(window.location.search).get("event");

    // Initiate payment
    const response = await fetch("/api/initiate-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        formData,
        eventType,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Show payment section
      showPaymentSection(result);
    } else {
      throw new Error(result.error || "Failed to initiate payment");
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    alert("Error initiating payment: " + error.message);

    // Reset button
    const submitBtn = document.querySelector(".btn-primary");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Proceed to Payment";
    }
  }
}

function showPaymentSection(paymentData) {
  // Hide the form
  const form = document.getElementById("registrationForm");
  if (form) form.style.display = "none";

  // Show payment section
  const paymentSection = document.getElementById("paymentSection");
  if (paymentSection) paymentSection.style.display = "block";

  // Update payment details
  const paymentAmountEl = document.getElementById("paymentAmount");
  const paymentEventEl = document.getElementById("paymentEvent");

  if (paymentAmountEl)
    paymentAmountEl.textContent = paymentData.amount || "N/A";
  if (paymentEventEl)
    paymentEventEl.textContent = paymentData.eventName || "N/A";

  // Initialize Hubtel checkout
  if (window.HubtelCheckout) {
    initializeHubtelCheckout(paymentData);
  } else {
    // Fallback if Hubtel SDK is not loaded
    showFallbackPayment(paymentData);
  }
}

function initializeHubtelCheckout(paymentData) {
  try {
    const checkout = new window.HubtelCheckout({
      merchantId: paymentData.merchantId || "11684",
      customerEmail: paymentData.customerEmail,
      customerMsisdn: paymentData.customerMsisdn,
      amount: paymentData.amount,
      description: paymentData.description,
      clientReference: paymentData.clientReference,
      callbackUrl: `${window.location.origin}/api/payment-callback`,
      returnUrl: `${window.location.origin}/verify/${paymentData.clientReference}`,
    });

    checkout.open();
  } catch (error) {
    console.error("Hubtel checkout error:", error);
    showFallbackPayment(paymentData);
  }
}

function showFallbackPayment(paymentData) {
  const iframeContainer = document.getElementById("hubtel-checkout-iframe");
  if (iframeContainer) {
    iframeContainer.innerHTML = `
        <div class="fallback-payment">
            <h4>Payment Gateway</h4>
            <p>You will be redirected to the secure payment gateway to complete your transaction.</p>
            <p><strong>Amount:</strong> ${paymentData.amount}</p>
            <p><strong>Reference:</strong> ${paymentData.clientReference}</p>
            <button onclick="window.location.href='/verify/${paymentData.clientReference}'" class="btn-primary">
                Check Payment Status
            </button>
        </div>
    `;
  }
}

function showError(message) {
  const container = document.querySelector(".registration-card");
  if (container) {
    container.innerHTML = `
        <div class="error-container">
            <h2>❌ Error</h2>
            <p>${message}</p>
            <button onclick="window.location.back()" class="btn-secondary">Go Back</button>
        </div>
    `;
  }
}

// Add some CSS for the new elements
const style = document.createElement("style");
style.textContent = `
    .prefill-notice {
        background: #e8f5e8;
        border: 1px solid #4caf50;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        text-align: center;
    }
    
    .prefill-notice p {
        margin: 0;
        color: #2e7d32;
        font-weight: 600;
    }
    
    .error-container {
        text-align: center;
        padding: 60px 20px;
        color: #e74c3c;
    }
    
    .fallback-payment {
        text-align: center;
        padding: 30px;
        background: #f9f9f9;
        border-radius: 8px;
    }
    
    .fallback-payment h4 {
        margin-top: 0;
        color: #2d8659;
    }
`;
document.head.appendChild(style);
