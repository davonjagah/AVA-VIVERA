// Pre-filled registration page functionality
let isFormReady = false;
let pendingRegistration = null;

// Test function to check DOM elements
function testDOMElements() {
  console.log("=== DOM ELEMENT TEST ===");
  console.log("Document ready state:", document.readyState);
  console.log("Body exists:", !!document.body);
  console.log("Container exists:", !!document.querySelector(".container"));
  console.log(
    "Registration card exists:",
    !!document.querySelector(".registration-card")
  );
  console.log("Form exists:", !!document.getElementById("registrationForm"));

  const testElements = [
    "fullName",
    "email",
    "phone",
    "organization",
    "event",
    "price",
  ];
  testElements.forEach((id) => {
    const el = document.getElementById(id);
    console.log(`Element ${id}:`, el ? "FOUND" : "NOT FOUND", el);
  });
  console.log("=== END TEST ===");
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded");
  testDOMElements();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventType = urlParams.get("event");
  const clientReference = urlParams.get("ref");

  console.log("URL Params:", { eventType, clientReference });

  if (!eventType || !clientReference) {
    showError(
      "Missing required parameters. Please use the link from your email."
    );
    return;
  }

  // Wait for all resources to load
  window.addEventListener("load", function () {
    console.log("Window loaded, checking form elements");
    testDOMElements();
    checkFormElementsAndLoad(eventType, clientReference);
  });

  // Also try after a delay as backup
  setTimeout(() => {
    if (!isFormReady) {
      console.log("Fallback: checking form elements after delay");
      testDOMElements();
      checkFormElementsAndLoad(eventType, clientReference);
    }
  }, 1000);
});

function checkFormElementsAndLoad(eventType, clientReference) {
  console.log("Checking form elements...");

  // Check if events config is loaded
  if (!window.events) {
    console.error("Events config not loaded yet");
    setTimeout(() => checkFormElementsAndLoad(eventType, clientReference), 500);
    return;
  }

  // Check if all required form elements exist
  const requiredElements = [
    "fullName",
    "email",
    "phone",
    "organization",
    "event",
    "price",
    "agiMember",
    "agiMembershipGroup",
  ];

  const missingElements = [];
  const foundElements = {};

  requiredElements.forEach((id) => {
    const element = document.getElementById(id);
    foundElements[id] = element;
    if (!element) {
      missingElements.push(id);
    } else {
      console.log(`Element ${id} found:`, element);
      console.log(`Element ${id} visible:`, element.offsetParent !== null);
      console.log(
        `Element ${id} display:`,
        window.getComputedStyle(element).display
      );
    }
  });

  console.log("All elements status:", foundElements);

  if (missingElements.length > 0) {
    console.error("Missing form elements:", missingElements);

    // Try to create missing elements as fallback
    if (missingElements.length > 0) {
      console.log("Attempting to create missing elements...");
      createMissingElements(missingElements);

      // Check again after creating elements
      setTimeout(
        () => checkFormElementsAndLoad(eventType, clientReference),
        100
      );
      return;
    }

    // If still missing, try again after a delay
    setTimeout(() => checkFormElementsAndLoad(eventType, clientReference), 500);
    return;
  }

  console.log("All form elements found, proceeding to load data");
  isFormReady = true;

  // Load customer data and populate form
  loadCustomerData(clientReference, eventType);
}

function createMissingElements(missingIds) {
  const form = document.getElementById("registrationForm");
  if (!form) {
    console.error("Form not found, cannot create elements");
    return;
  }

  missingIds.forEach((id) => {
    if (id === "agiMembershipGroup") {
      // Create the AGI membership group
      const groupDiv = document.createElement("div");
      groupDiv.className = "form-group";
      groupDiv.id = "agiMembershipGroup";
      groupDiv.style.display = "none";

      const checkboxGroup = document.createElement("div");
      checkboxGroup.className = "checkbox-group";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "agiMember";
      checkbox.name = "agiMember";
      checkbox.disabled = true;

      const label = document.createElement("label");
      label.htmlFor = "agiMember";
      label.textContent =
        "I am a member of AGI (Association of Ghana Industries)";

      checkboxGroup.appendChild(checkbox);
      checkboxGroup.appendChild(label);
      groupDiv.appendChild(checkboxGroup);

      // Insert before the event field
      const eventField = document.getElementById("event");
      if (eventField && eventField.parentNode) {
        eventField.parentNode.parentNode.insertBefore(
          groupDiv,
          eventField.parentNode
        );
      }
    } else {
      // Create a simple input field
      const formGroup = document.createElement("div");
      formGroup.className = "form-group";

      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = id.charAt(0).toUpperCase() + id.slice(1) + " *";

      const input = document.createElement("input");
      input.type = id === "email" ? "email" : "text";
      input.id = id;
      input.name = id;
      input.required = true;
      input.readOnly = true;

      formGroup.appendChild(label);
      formGroup.appendChild(input);

      // Insert before the event field
      const eventField = document.getElementById("event");
      if (eventField && eventField.parentNode) {
        eventField.parentNode.parentNode.insertBefore(
          formGroup,
          eventField.parentNode
        );
      }
    }

    console.log(`Created element: ${id}`);
  });
}

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

    // Store registration for later use
    pendingRegistration = registration;

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
  try {
    console.log("Populating form with registration:", registration);

    // Populate customer information
    const fullNameEl = document.getElementById("fullName");
    const emailEl = document.getElementById("email");
    const phoneEl = document.getElementById("phone");
    const organizationEl = document.getElementById("organization");
    const eventEl = document.getElementById("event");
    const priceEl = document.getElementById("price");
    const agiMemberEl = document.getElementById("agiMember");
    const agiMembershipGroupEl = document.getElementById("agiMembershipGroup");

    console.log("Form elements found:", {
      fullName: !!fullNameEl,
      email: !!emailEl,
      phone: !!phoneEl,
      organization: !!organizationEl,
      event: !!eventEl,
      price: !!priceEl,
      agiMember: !!agiMemberEl,
      agiMembershipGroup: !!agiMembershipGroupEl,
    });

    if (fullNameEl) fullNameEl.value = registration.customerInfo.fullName;
    if (emailEl) emailEl.value = registration.customerInfo.email;
    if (phoneEl) phoneEl.value = registration.customerInfo.phone;
    if (organizationEl)
      organizationEl.value = registration.customerInfo.organization;
    if (eventEl) eventEl.value = registration.eventName;
    if (priceEl) priceEl.value = registration.eventPrice;

    // Handle AGI membership
    if (agiMemberEl && registration.customerInfo.agiMember) {
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

function showLoading() {
  const container = document.querySelector(".registration-card");
  if (container) {
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading your registration details...</p>
        </div>
    `;
  }
}

function hideLoading() {
  // Loading will be replaced by form content
}

function showForm() {
  // Form is already visible after loading
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
