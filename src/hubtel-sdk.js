import CheckoutSdk from "@hubteljs/checkout";

// Export the SDK for browser use
export default CheckoutSdk;

// Also make it available globally
if (typeof window !== "undefined") {
  window.CheckoutSdk = CheckoutSdk;
}
