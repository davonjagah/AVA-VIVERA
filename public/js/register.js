// Initialize the Hubtel Checkout SDK
let checkout = null;

// Initialize SDK when page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Attempting to load Hubtel SDK...");

  // Function to try loading SDK
  function tryLoadSDK() {
    try {
      console.log("🔍 Checking for Hubtel SDK...");
      console.log("window.CheckoutSdk:", window.CheckoutSdk);
      console.log("window.HubtelCheckout:", window.HubtelCheckout);

      if (window.CheckoutSdk) {
        checkout = new window.CheckoutSdk();
        console.log("✅ Hubtel SDK loaded successfully via CheckoutSdk");
        return true;
      } else if (window.HubtelCheckout) {
        checkout = window.HubtelCheckout;
        console.log("✅ Hubtel SDK loaded via HubtelCheckout");
        return true;
      } else {
        console.log("⚠️ Hubtel SDK not available yet");
        return false;
      }
    } catch (error) {
      console.error("❌ Error initializing Hubtel SDK:", error);
      return false;
    }
  }

  // Try immediately
  if (!tryLoadSDK()) {
    // Retry once after a short delay
    setTimeout(() => {
      if (!tryLoadSDK()) {
        console.error("❌ Hubtel SDK failed to load");
      }
    }, 500);
  }
});

// Event data configuration
const events = {
  sme: {
    title: "Register for SMEs Connect",
    subtitle: "Beyond Profit - Building Legacies",
    details: "September 8, 2025 • 9:00 AM • Accra City Hotel • 1,500 GHS",
    eventName: "SMEs Connect: Beyond Profit - Building Legacies",
    price: "1,500 GHS",
  },
  ceo: {
    title: "Register for CEO Roundtable",
    subtitle: "Lead the Business, Scale to Legacy",
    details:
      "September 9, 2025 • 9:00 AM - 3:00 PM • Accra City Hotel • 2,500 GHS",
    eventName: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
    price: "2,500 GHS",
  },
  wealth: {
    title: "Register for Wealth Creation Masterclass",
    subtitle: "Wealth Creation Strategies Masterclass",
    details: "September 12, 2025 • 10:00 AM • Accra City Hotel • 1,200 GHS",
    eventName: "Wealth Creation Strategies Masterclass",
    price: "1,200 GHS",
  },
};

// Get event type from URL parameter
function getEventType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("event") || "sme";
}

// Load event data and populate form
function loadEventData() {
  const eventType = getEventType();
  const eventData = events[eventType];

  if (!eventData) {
    console.error("Event not found");
    return;
  }

  // Update page title
  document.title = eventData.title;

  // Update header content
  document.getElementById("eventTitle").textContent = eventData.title;
  document.getElementById("eventSubtitle").textContent = eventData.subtitle;
  document.getElementById("eventDetails").textContent = eventData.details;

  // Update form fields
  document.getElementById("event").value = eventData.eventName;
  document.getElementById("price").value = eventData.price;
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
  const eventData = events[eventType];

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

    const { purchaseInfo, config } = paymentData;

    const iframeStyle = {
      width: "100%",
      height: "600px", // Fixed height for better mobile experience
      border: "none",
      borderRadius: "8px",
    };

    // Check if Hubtel SDK is available
    console.log("🔍 Checking Hubtel SDK availability...");
    console.log("checkout object:", checkout);
    console.log("window.CheckoutSdk:", window.CheckoutSdk);

    // Check iframe container
    const iframeContainer = document.getElementById("hubtel-checkout-iframe");
    console.log("📦 Iframe container:", iframeContainer);
    console.log(
      "📦 Iframe container HTML:",
      iframeContainer ? iframeContainer.innerHTML : "Container not found"
    );

    if (checkout && typeof checkout.initIframe === "function") {
      console.log("🎯 Initializing Hubtel payment iframe...");
      console.log("📋 Purchase Info:", purchaseInfo);
      console.log("⚙️ Config:", config);
      console.log("🎨 Iframe Style:", iframeStyle);

      // Initialize the iframe with secure data from server
      checkout.initIframe({
        purchaseInfo,
        config,
        iframeStyle,
        callBacks: {
          onInit: () => {
            console.log("✅ Hubtel Checkout initialized");
            showLoadingMessage("Payment gateway is loading...");
          },
          onPaymentSuccess: (data) => {
            console.log("🎉 Payment Success:", data);
            showSuccessMessage(
              "Payment successful! You will receive a confirmation email shortly."
            );
            // Here you can redirect to a success page or show confirmation
          },
          onPaymentFailure: (data) => {
            console.log("❌ Payment Failure:", data);
            showErrorMessage("Payment failed. Please try again.");
          },
          onLoad: () => {
            console.log("📱 Iframe Loaded");
            hideLoadingMessage();
          },
          onFeesChanged: (fees) => {
            console.log("💰 Fees Changed:", fees);
          },
          onResize: (size) => {
            console.log("📏 Iframe Resized:", size?.height);
          },
          onError: (error) => {
            console.error("❌ Hubtel SDK Error:", error);
            showErrorMessage(
              "Payment gateway error: " + (error.message || "Unknown error")
            );
          },
        },
      });
    } else {
      // Hubtel SDK is not available
      console.error("❌ Hubtel SDK not available");
      showErrorMessage(
        "Payment gateway is not available. Please try again later or contact support."
      );
    }
  } catch (error) {
    console.error("Payment initialization error:", error);
    showErrorMessage("Failed to initialize payment. Please try again.");
  }
}

// Show payment section
function showPaymentSection() {
  const form = document.getElementById("registrationForm");
  const paymentSection = document.getElementById("paymentSection");

  form.style.display = "none";
  paymentSection.style.display = "block";

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
  console.log("🚀 Initializing registration page...");

  loadEventData();

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

  console.log("✅ Registration page initialized");
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
