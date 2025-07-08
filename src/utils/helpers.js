const crypto = require('crypto');

/**
 * Generate M-Pesa password
 * @param {string} businessShortCode - Business short code
 * @param {string} passkey - Passkey from M-Pesa
 * @param {string} timestamp - Timestamp in YYYYMMDDHHmmss format
 * @returns {string} Base64 encoded password
 */
function generatePassword(businessShortCode, passkey, timestamp) {
  const password = businessShortCode + passkey + timestamp;
  return Buffer.from(password).toString('base64');
}

/**
 * Validate Kenyan phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidKenyanPhoneNumber(phoneNumber) {
  try {
    const formatted = formatPhoneNumber(phoneNumber);
    return formatted.match(/^254[0-9]{9}$/) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Validate amount for M-Pesa transaction
 * @param {number} amount - Amount to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidAmount(amount) {
  return !isNaN(amount) && amount >= 1 && amount <= 70000;
}

/**
 * Generate a unique transaction reference
 * @param {string} prefix - Prefix for the reference (optional)
 * @returns {string} Unique transaction reference
 */
function generateTransactionReference(prefix = 'TXN') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: KES)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Log transaction details
 * @param {string} type - Transaction type
 * @param {object} data - Transaction data
 */
function logTransaction(type, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type,
    data: data
  };
  
  console.log(`📝 Transaction Log [${type}]:`, JSON.stringify(logEntry, null, 2));
}

/**
 * Sanitize callback data for logging
 * @param {object} data - Callback data
 * @returns {object} Sanitized data
 */
function sanitizeCallbackData(data) {
  // Remove sensitive information for logging
  const sanitized = { ...data };
  
  // Remove or mask sensitive fields if any
  if (sanitized.phoneNumber) {
    sanitized.phoneNumber = sanitized.phoneNumber.replace(/(\d{3})(\d{6})(\d{3})/, '$1****$3');
  }
  
  return sanitized;
}

/**
 * Create response object
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {object} data - Response data
 * @param {string} error - Error message (optional)
 * @returns {object} Formatted response object
 */
function createResponse(success, message, data = null, error = null) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString(),
    data: data
  };
  
  if (error) {
    response.error = error;
  }
  
  return response;
}

/**
 * Validate M-Pesa callback signature (if using callback validation)
 * @param {string} payload - Callback payload
 * @param {string} signature - M-Pesa signature
 * @returns {boolean} True if valid, false otherwise
 */
function validateCallbackSignature(payload, signature) {
  // Implementation depends on M-Pesa callback validation requirements
  // This is a placeholder for future implementation
  return true;
}

/**
 * Parse M-Pesa timestamp
 * @param {number} mpesaTimestamp - M-Pesa timestamp format (YYYYMMDDHHmmss)
 * @returns {Date} Parsed date object
 */
function parseMpesaTimestamp(mpesaTimestamp) {
  const timestampStr = mpesaTimestamp.toString();
  const year = timestampStr.substring(0, 4);
  const month = timestampStr.substring(4, 6);
  const day = timestampStr.substring(6, 8);
  const hour = timestampStr.substring(8, 10);
  const minute = timestampStr.substring(10, 12);
  const second = timestampStr.substring(12, 14);
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        break;
      }
      
      console.log(`Retry attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError;
}

module.exports = {
  generatePassword,
  formatPhoneNumber,
  isValidKenyanPhoneNumber,
  isValidAmount,
  generateTransactionReference,
  formatCurrency,
  logTransaction,
  sanitizeCallbackData,
  createResponse,
  validateCallbackSignature,
  parseMpesaTimestamp,
  retryWithBackoff
};

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  let formatted = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats
  if (formatted.startsWith('0')) {
    // Convert 0712345678 to 254712345678
    formatted = '254' + formatted.substring(1);
  } else if (formatted.startsWith('712') || formatted.startsWith('722') || formatted.startsWith('733')) {
    // Convert 712345678 to 254712345678
    formatted = '254' + formatted;
  } else if (formatted.startsWith('+254')) {
    // Convert +254712345678 to 254712345678
    formatted = formatted.substring(1);
  }
  
  // Validate the final format
  if (!formatted.match(/^254[0-9]{9}$/)) {
    throw new Error('Invalid phone number format. Use 254XXXXXXXXX format');
  }
  
    return formatted;
  }