/**
 * Transaction Status Check Utility
 * Frontend utility for checking transaction status with Hubtel
 */

class TransactionStatusChecker {
  constructor() {
    this.pollingInterval = null;
    this.maxPollingAttempts = 30; // 5 minutes with 10-second intervals
    this.currentAttempts = 0;
  }

  /**
   * Check transaction status once
   * @param {string} clientReference - The transaction reference
   * @param {string} hubtelTransactionId - Optional Hubtel transaction ID
   * @param {string} networkTransactionId - Optional network transaction ID
   */
  async checkStatus(clientReference, hubtelTransactionId = null, networkTransactionId = null) {
    try {
      const params = new URLSearchParams();
      if (hubtelTransactionId) params.append('hubtelTransactionId', hubtelTransactionId);
      if (networkTransactionId) params.append('networkTransactionId', networkTransactionId);

      const url = `/api/transaction-status/${clientReference}?${params.toString()}`;
      
      console.log(`🔍 Checking transaction status: ${clientReference}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check transaction status');
      }

      console.log(`✅ Status check result for ${clientReference}:`, {
        status: data.status,
        source: data.source,
        hubtelConfigured: data.hubtelConfigured
      });

      return data;

    } catch (error) {
      console.error(`❌ Status check failed for ${clientReference}:`, error);
      throw error;
    }
  }

  /**
   * Start polling for transaction status
   * @param {string} clientReference - The transaction reference
   * @param {Function} onStatusUpdate - Callback when status changes
   * @param {Function} onComplete - Callback when polling completes
   * @param {Function} onError - Callback when error occurs
   */
  startPolling(clientReference, onStatusUpdate, onComplete, onError) {
    this.currentAttempts = 0;
    
    console.log(`🔄 Starting status polling for: ${clientReference}`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        this.currentAttempts++;
        
        const result = await this.checkStatus(clientReference);
        
        // Call status update callback
        if (onStatusUpdate) {
          onStatusUpdate(result);
        }

        // Check if we should stop polling
        if (this.shouldStopPolling(result.status)) {
          this.stopPolling();
          if (onComplete) {
            onComplete(result);
          }
        }

        // Check if we've exceeded max attempts
        if (this.currentAttempts >= this.maxPollingAttempts) {
          this.stopPolling();
          if (onError) {
            onError(new Error('Polling timeout - transaction status unknown'));
          }
        }

      } catch (error) {
        console.error(`❌ Polling error for ${clientReference}:`, error);
        
        // Stop polling on error
        this.stopPolling();
        if (onError) {
          onError(error);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop polling for transaction status
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 Status polling stopped');
    }
  }

  /**
   * Determine if polling should stop based on status
   * @param {string} status - The current transaction status
   */
  shouldStopPolling(status) {
    const finalStatuses = ['completed', 'failed', 'cancelled', 'refunded'];
    return finalStatuses.includes(status);
  }

  /**
   * Get status display text
   * @param {string} status - The transaction status
   */
  getStatusDisplay(status) {
    const statusMap = {
      'pending': 'Payment Pending',
      'completed': 'Payment Completed',
      'failed': 'Payment Failed',
      'cancelled': 'Payment Cancelled',
      'refunded': 'Payment Refunded',
      'unknown': 'Status Unknown'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Get status color class
   * @param {string} status - The transaction status
   */
  getStatusColor(status) {
    const colorMap = {
      'pending': 'status-pending',
      'completed': 'status-completed',
      'failed': 'status-failed',
      'cancelled': 'status-cancelled',
      'refunded': 'status-refunded',
      'unknown': 'status-unknown'
    };
    
    return colorMap[status] || 'status-unknown';
  }
}

// Make it available globally
window.TransactionStatusChecker = TransactionStatusChecker;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransactionStatusChecker;
}
