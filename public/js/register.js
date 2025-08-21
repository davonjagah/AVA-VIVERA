// Initialize the Hubtel Checkout SDK
let checkout = null;

// Initialize SDK when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Function to try loading SDK
  function tryLoadSDK() {
    try {
      if (window.CheckoutSdk) {
        checkout = new window.CheckoutSdk();
        return true;
      } else if (window.HubtelCheckout) {
        checkout = window.HubtelCheckout;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Try immediately
  if (!tryLoadSDK()) {
    // Retry once after a short delay
    setTimeout(() => {
      tryLoadSDK();
    }, 500);
  }
});

// Events configuration is loaded from events-config.js

// Get event type from URL parameter
function getEventType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("event") || "sme";
}

// Load event data and populate form
function loadEventData() {
  // Check if events object is available
  if (typeof window.events === "undefined") {
    return;
  }

  const eventType = getEventType();
  const eventData = window.events[eventType];

  if (!eventData) {
    return;
  }

  // Update page title
  document.title = eventData.title;

  // Update header content
  const eventTitle = document.getElementById("eventTitle");
  const eventSubtitle = document.getElementById("eventSubtitle");
  const eventDetails = document.getElementById("eventDetails");
  const eventField = document.getElementById("event");
  const priceField = document.getElementById("price");

  if (eventTitle) eventTitle.textContent = eventData.title;
  if (eventSubtitle) eventSubtitle.textContent = eventData.subtitle;
  if (eventDetails) eventDetails.textContent = eventData.details;
  if (eventField) eventField.value = eventData.eventName;
  if (priceField) priceField.value = eventData.price;
}

// Handle form submission
function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);

  // Validate form
  if (!validateForm(data)) {
    return;
  }

  // Show payment section
  showPaymentSection();

  // Generate unique client reference
  const clientReference = generateClientReference();

  // Get event data
  const eventType = getEventType();
  const eventData = window.events[eventType];

  // Extract amount from price (remove "GHS" and convert to number)
  const amount = parseFloat(eventData.price.replace(/[^\d.]/g, ""));

  // Initialize Hubtel payment
  initializeHubtelPayment(data, amount, clientReference, eventData);
}

// Validate form data
function validateForm(data) {
  const requiredFields = ["fullName", "email", "phone", "organization"];

  for (const field of requiredFields) {
    if (!data[field] || data[field].trim() === "") {
      alert(
        `Please fill in the ${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} field.`
      );
      return false;
    }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    alert("Please enter a valid email address.");
    return false;
  }

  // Basic phone validation
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(data.phone)) {
    alert("Please enter a valid phone number.");
    return false;
  }

  return true;
}

// Generate unique client reference
function generateClientReference() {
  return "event_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// Initialize Hubtel payment securely
async function initializeHubtelPayment(
  formData,
  amount,
  clientReference,
  eventData
) {
  try {
    showLoadingMessage("Initializing payment...");

    // Get event type
    const eventType = getEventType();

    // Call server to get secure payment configuration
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

    if (!response.ok) {
      throw new Error("Failed to initialize payment");
    }

    const paymentData = await response.json();

    if (!paymentData.success) {
      throw new Error(paymentData.error || "Payment initialization failed");
    }

    // Show the checkout link to the user
    showCheckoutLink(paymentData.checkoutUrl, paymentData.clientReference);
  } catch (error) {
    showErrorMessage("Failed to initialize payment. Please try again.");
  }
}

// Show payment section
function showPaymentSection() {
  const form = document.getElementById("registrationForm");
  const paymentSection = document.getElementById("paymentSection");

  form.style.display = "none";
  paymentSection.style.display = "block";

  // Populate payment details
  const eventType = getEventType();
  const eventData = window.events[eventType];

  if (eventData) {
    document.getElementById("paymentAmount").textContent = eventData.price;
    document.getElementById("paymentEvent").textContent = eventData.eventName;
  }

  // Scroll to payment section
  paymentSection.scrollIntoView({ behavior: "smooth" });
}

// Loading and message functions
function showLoadingMessage(message) {
  const iframeContainer = document.getElementById("hubtel-checkout-iframe");
  iframeContainer.innerHTML = `
    <div class="loading-message">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

function hideLoadingMessage() {
  const iframeContainer = document.getElementById("hubtel-checkout-iframe");
  iframeContainer.innerHTML = ""; // Clear loading message
}

function showSuccessMessage(message) {
  const paymentSection = document.getElementById("paymentSection");
  paymentSection.innerHTML = `
    <div class="success-message">
      <div class="success-icon">✓</div>
      <h3>Payment Successful!</h3>
      <p>${message}</p>
      <button onclick="window.location.href='/'" class="btn-primary">Return to Home</button>
    </div>
  `;
}

function showCheckoutLink(checkoutUrl, clientReference) {
  const paymentSection = document.getElementById("paymentSection");
  paymentSection.innerHTML = `
    <div class="checkout-container">
      <div class="checkout-header">
        <h3>Complete Your Payment</h3>
        <p>Reference: <strong>${clientReference}</strong></p>
      </div>
      
      <div class="checkout-iframe-container">
        <iframe 
          src="${checkoutUrl}" 
          frameborder="0" 
          width="100%" 
          height="600px"
          allow="payment"
          title="Hubtel Payment Gateway">
        </iframe>
      </div>
      
      <div class="checkout-footer">
        <p><strong>Payment Methods Available:</strong></p>
        <ul>
          <li>Mobile Money (MTN, Vodafone, Airtel)</li>
          <li>Bank Cards (Visa, Mastercard)</li>
          <li>Digital Wallets (Hubtel, G-Money, Zeepay)</li>
          <li>GhQR</li>
          <li>Cash/Cheque</li>
        </ul>
        
        <div class="checkout-actions">
          <a href="${checkoutUrl}" target="_blank" class="btn-secondary">
            🔗 Open in New Tab
          </a>
          <button onclick="copyToClipboard('${checkoutUrl}')" class="btn-secondary">
            📋 Copy Link
          </button>
        </div>
      </div>
    </div>
  `;
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert("Payment link copied to clipboard!");
    })
    .catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Payment link copied to clipboard!");
    });
}

function showErrorMessage(message) {
  const paymentSection = document.getElementById("paymentSection");
  paymentSection.innerHTML = `
    <div class="error-message">
      <div class="error-icon">✗</div>
      <h3>Payment Failed</h3>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn-primary">Try Again</button>
    </div>
  `;
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  // Wait a bit to ensure events-config.js has loaded
  setTimeout(() => {
    loadEventData();
  }, 100);

  // Add form submit handler
  const form = document.getElementById("registrationForm");
  form.addEventListener("submit", handleFormSubmit);

  // Add input validation feedback
  const inputs = form.querySelectorAll("input[required]");
  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value.trim() === "") {
        this.classList.add("error");
      } else {
        this.classList.remove("error");
      }
    });
  });
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
