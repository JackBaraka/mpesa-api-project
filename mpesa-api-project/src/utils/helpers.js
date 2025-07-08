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