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

  // Here you would typically send the data to your backend
  console.log("Form data:", data);

  // TODO: Integrate with Hubtel payment gateway
  // For now, we'll just show a placeholder
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

// Show payment section
function showPaymentSection() {
  const form = document.getElementById("registrationForm");
  const paymentSection = document.getElementById("paymentSection");

  form.style.display = "none";
  paymentSection.style.display = "block";

  // Scroll to payment section
  paymentSection.scrollIntoView({ behavior: "smooth" });
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
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
