const https = require("https");

/**
 * Hubtel Transaction Status Check Service
 * Implements the mandatory Hubtel Transaction Status Check API
 */

class HubtelService {
  constructor() {
    this.posSalesId = process.env.HUBTEL_MERCHANT_ID || "11684"; // Default merchant ID
    this.appId = process.env.HUBTEL_APP_ID;
    this.apiKey = process.env.HUBTEL_API_KEY;

    if (!this.posSalesId) {
      console.warn(
        "⚠️ Hubtel merchant ID not configured. Using default merchant ID."
      );
    }

    if (!this.appId || !this.apiKey) {
      console.warn(
        "⚠️ Hubtel APP_ID or API_KEY not configured. Status checks may fail."
      );
    }
  }

  /**
   * Create Basic Auth header for Hubtel API
   */
  createAuthHeader() {
    if (!this.appId || !this.apiKey) {
      throw new Error("Hubtel APP_ID or API_KEY not configured");
    }

    // Use the same authentication method as payment initiation
    const credentials = `${this.appId}:${this.apiKey}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    return `Basic ${base64Credentials}`;
  }

  /**
   * Make HTTP request to Hubtel API
   */
  makeHubtelRequest(path, method = "GET") {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "rmsc.hubtel.com",
        port: 443,
        path: path,
        method: method,
        headers: {
          Authorization: this.createAuthHeader(),
          "Content-Type": "application/json",
          "User-Agent": "AVA-VIVERA/1.0",
        },
      };

      console.log("🔧 Hubtel API Request:", {
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        authorization: options.headers.Authorization,
      });

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log("🔧 Hubtel API Response:", {
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });

          try {
            const response = JSON.parse(data);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              // Handle specific Hubtel error codes
              let errorMessage = "Hubtel API request failed";
              if (response.ResponseCode === "4720") {
                errorMessage = "Transaction not found or older than a month";
              } else if (response.Message) {
                errorMessage = response.Message;
              } else if (response.message) {
                errorMessage = response.message;
              }

              reject({
                statusCode: res.statusCode,
                message: errorMessage,
                responseCode: response.ResponseCode || response.responseCode,
                data: response,
              });
            }
          } catch (error) {
            reject({
              statusCode: res.statusCode,
              message: "Invalid JSON response from Hubtel",
              data: data,
            });
          }
        });
      });

      req.on("error", (error) => {
        reject({
          statusCode: 0,
          message: "Network error connecting to Hubtel API",
          error: error.message,
        });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject({
          statusCode: 0,
          message: "Request timeout connecting to Hubtel API",
        });
      });

      req.end();
    });
  }

  /**
   * Check transaction status with Hubtel API
   * @param {string} clientReference - The client reference of the transaction
   * @param {string} hubtelTransactionId - Optional Hubtel transaction ID
   * @param {string} networkTransactionId - Optional network transaction ID
   */
  async checkTransactionStatus(
    clientReference,
    hubtelTransactionId = null,
    networkTransactionId = null
  ) {
    try {
      if (!this.posSalesId) {
        throw new Error("HUBTEL_MERCHANT_ID not configured");
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (clientReference) {
        params.append("clientReference", clientReference);
      }
      if (hubtelTransactionId) {
        params.append("hubtelTransactionId", hubtelTransactionId);
      }
      if (networkTransactionId) {
        params.append("networkTransactionId", networkTransactionId);
      }

      if (params.toString().length === 0) {
        throw new Error("At least one transaction identifier is required");
      }

      const path = `/v1/merchantaccount/merchants/${
        this.posSalesId
      }/transactions/status?${params.toString()}`;

      console.log(
        `🔍 Checking Hubtel transaction status for: ${clientReference}`
      );
      console.log(`🔧 Hubtel API Details:`, {
        merchantId: this.posSalesId,
        endpoint: `https://rmsc.hubtel.com${path}`,
        clientReference: clientReference,
      });

      const response = await this.makeHubtelRequest(path);

      // Parse the response structure correctly
      const transactionData =
        response.Data && response.Data.length > 0 ? response.Data[0] : null;

      console.log(`✅ Hubtel status check successful for ${clientReference}:`, {
        status: transactionData?.TransactionStatus,
        responseCode: response.ResponseCode,
        transactionId: transactionData?.TransactionId,
        clientReference: transactionData?.ClientReference,
      });

      return {
        success: true,
        data: transactionData,
        message: response.Message || "Success",
        responseCode: response.ResponseCode,
      };
    } catch (error) {
      console.error(
        `❌ Hubtel status check failed for ${clientReference}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
        responseCode: error.responseCode,
      };
    }
  }

  /**
   * Map Hubtel status to internal status
   */
  mapHubtelStatus(hubtelStatus) {
    const statusMap = {
      Success: "completed",
      Failed: "failed",
      Pending: "pending",
      Cancelled: "cancelled",
      Refunded: "refunded",
      // Also handle the old format
      Paid: "completed",
      Unpaid: "pending",
    };

    return statusMap[hubtelStatus] || "unknown";
  }

  /**
   * Verify if Hubtel credentials are configured
   */
  isConfigured() {
    return !!(this.posSalesId && this.appId && this.apiKey);
  }
}

module.exports = new HubtelService();
