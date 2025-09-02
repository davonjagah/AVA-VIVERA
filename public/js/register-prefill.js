// Pre-filled registration page functionality
document.addEventListener("DOMContentLoaded", function () {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventType = urlParams.get("event");
  const clientReference = urlParams.get("ref");

  if (!eventType || !clientReference) {
    showError(
      "Missing required parameters. Please use the link from your email."
    );
    return;
  }

  // Load customer data and populate form
  loadCustomerData(clientReference, eventType);
});

async function loadCustomerData(clientReference, eventType) {
  try {
    // Show loading state
    showLoading();

    // Fetch customer data from the database
    const response = await fetch(`/api/registrations/${clientReference}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to load customer data");
    }

    const registration = data.registration;

    // Verify this is the correct registration
    if (registration.eventType !== eventType) {
      throw new Error("Event type mismatch");
    }

    if (registration.paymentStatus !== "pending") {
      throw new Error("This registration is not pending payment");
    }

    // Populate the form with customer data
    populateForm(registration);

    // Load event details
    loadEventDetails(eventType);

    // Hide loading and show form
    hideLoading();
    showForm();
  } catch (error) {
    console.error("Error loading customer data:", error);
    hideLoading();
    showError(error.message);
  }
}

function populateForm(registration) {
  // Populate customer information
  document.getElementById("fullName").value =
    registration.customerInfo.fullName;
  document.getElementById("email").value = registration.customerInfo.email;
  document.getElementById("phone").value = registration.customerInfo.phone;
  document.getElementById("organization").value =
    registration.customerInfo.organization;

  // Handle AGI membership
  if (registration.customerInfo.agiMember) {
    document.getElementById("agiMember").checked = true;
    document.getElementById("agiMembershipGroup").style.display = "block";
  }

  // Populate event information
  document.getElementById("event").value = registration.eventName;
  document.getElementById("price").value = registration.eventPrice;
}

function loadEventDetails(eventType) {
  // Get event details from events config
  const event = window.eventsConfig[eventType];
  if (event) {
    document.getElementById(
      "eventTitle"
    ).textContent = `Complete Registration - ${event.title}`;
    document.getElementById("eventSubtitle").textContent = event.description;
    document.getElementById(
      "eventDetails"
    ).textContent = `${event.date} • ${event.time} • ${event.location} • ${event.price}`;
  }
}

// Form submission handler
document
  .getElementById("registrationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
      // Show loading state
      const submitBtn = document.querySelector(".btn-primary");
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";

      // Get form data
      const formData = {
        fullName: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        organization: document.getElementById("organization").value,
        agiMember: document.getElementById("agiMember").checked,
      };

      // Get event type from URL
      const eventType = new URLSearchParams(window.location.search).get(
        "event"
      );

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
      submitBtn.disabled = false;
      submitBtn.textContent = "Proceed to Payment";
    }
  });

function showPaymentSection(paymentData) {
  // Hide the form
  document.getElementById("registrationForm").style.display = "none";

  // Show payment section
  const paymentSection = document.getElementById("paymentSection");
  paymentSection.style.display = "block";

  // Update payment details
  document.getElementById("paymentAmount").textContent =
    paymentData.amount || "N/A";
  document.getElementById("paymentEvent").textContent =
    paymentData.eventName || "N/A";

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

function showLoading() {
  const container = document.querySelector(".registration-card");
  container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading your registration details...</p>
        </div>
    `;
}

function hideLoading() {
  // Loading will be replaced by form content
}

function showForm() {
  // Form is already visible after loading
}

function showError(message) {
  const container = document.querySelector(".registration-card");
  container.innerHTML = `
        <div class="error-container">
            <h2>❌ Error</h2>
            <p>${message}</p>
            <button onclick="window.history.back()" class="btn-secondary">Go Back</button>
        </div>
    `;
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
    
    .loading-container {
        text-align: center;
        padding: 60px 20px;
    }
    
    .loading-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #44b678;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
