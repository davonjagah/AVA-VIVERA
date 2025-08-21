// Server-side Logger utility for debugging
class ServerLogger {
  static isDebugMode = process.env.NODE_ENV === "development"; // Enable in development by default

  static log(message, data = null) {
    if (this.isDebugMode) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  static error(message, error = null) {
    if (this.isDebugMode) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  }

  static warn(message) {
    if (this.isDebugMode) {
      console.warn(message);
    }
  }

  // Enable/disable debug mode
  static enableDebug() {
    this.isDebugMode = true;
  }

  static disableDebug() {
    this.isDebugMode = false;
  }

  // Log with request ID for tracking
  static logWithId(requestId, message, data = null) {
    if (this.isDebugMode) {
      const logMessage = `[${requestId}] ${message}`;
      if (data) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }

  static errorWithId(requestId, message, error = null) {
    if (this.isDebugMode) {
      const logMessage = `[${requestId}] ${message}`;
      if (error) {
        console.error(logMessage, error);
      } else {
        console.error(logMessage);
      }
    }
  }
}

module.exports = ServerLogger;
