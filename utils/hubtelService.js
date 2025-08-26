const https = require("https");

/**
 * Hubtel Transaction Status Check Service
 * Implements the mandatory Hubtel Transaction Status Check API
 */

class HubtelService {
  constructor() {
    this.appId = process.env.HUBTEL_APP_ID;
    this.apiKey = process.env.HUBTEL_API_KEY;
    this.posSalesId = process.env.HUBTEL_MERCHANT_ID; // New environment variable needed

    if (!this.appId || !this.apiKey || !this.posSalesId) {
      console.warn(
        "⚠️ Hubtel credentials not fully configured. Transaction status checks may fail."
      );
    }
  }

  /**
   * Create Basic Auth header for Hubtel API
   */
  createAuthHeader() {
    if (!this.appId || !this.apiKey) {
      throw new Error("Hubtel credentials not configured");
    }

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
        hostname: "api-txnstatus.hubtel.com",
        port: 443,
        path: path,
        method: method,
        headers: {
          Authorization: this.createAuthHeader(),
          "Content-Type": "application/json",
          "User-Agent": "AVA-VIVERA/1.0",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject({
                statusCode: res.statusCode,
                message: response.message || "Hubtel API request failed",
                responseCode: response.responseCode,
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

      const path = `/transactions/${
        this.posSalesId
      }/status?${params.toString()}`;

      console.log(
        `🔍 Checking Hubtel transaction status for: ${clientReference}`
      );

      const response = await this.makeHubtelRequest(path);

      console.log(`✅ Hubtel status check successful for ${clientReference}:`, {
        status: response.data?.status,
        responseCode: response.responseCode,
        transactionId: response.data?.transactionId,
      });

      return {
        success: true,
        data: response.data,
        message: response.message,
        responseCode: response.responseCode,
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
      Paid: "completed",
      Unpaid: "pending",
      Refunded: "refunded",
      Failed: "failed",
      Cancelled: "cancelled",
    };

    return statusMap[hubtelStatus] || "unknown";
  }

  /**
   * Verify if Hubtel credentials are configured
   */
  isConfigured() {
    return !!(this.appId && this.apiKey && this.posSalesId);
  }
}

module.exports = new HubtelService();
