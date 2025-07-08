const crypto = require('crypto');

/**
 * Simple API key authentication middleware
 * Add API key to environment variables for production use
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;
  
  // Skip authentication in development if no API key is set
  if (!expectedApiKey && process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key',
      data: null
    });
  }
  
  next();
}

/**
 * Rate limiting middleware
 * Simple in-memory rate limiter
 */
const rateLimitStore = new Map();

function rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    const windowStart = currentTime - windowMs;
    
    // Get or create client record
    let clientRecord = rateLimitStore.get(clientIp) || [];
    
    // Remove old requests outside the window
    clientRecord = clientRecord.filter(requestTime => requestTime > windowStart);
    
    // Check if limit exceeded
    if (clientRecord.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        data: {
          limit: maxRequests,
          windowMs: windowMs,
          remainingTime: Math.ceil((clientRecord[0] + windowMs - currentTime) / 1000)
        }
      });
    }
    
    // Add current request
    clientRecord.push(currentTime);
    rateLimitStore.set(clientIp, clientRecord);
    
    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupRateLimitStore(windowStart);
    }
    
    next();
  };
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimitStore(windowStart) {
  for (const [clientIp, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(requestTime => requestTime > windowStart);
    if (validRequests.length === 0) {
      rateLimitStore.delete(clientIp);
    } else {
      rateLimitStore.set(clientIp, validRequests);
    }
  }
}

/**
 * Validate M-Pesa callback IP addresses
 * M-Pesa callbacks come from specific IP ranges
 */
function validateMpesaIP(req, res, next) {
  // Skip IP validation in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // M-Pesa IP ranges (update these based on Safaricom documentation)
  const allowedIpRanges = [
    '196.201.214.0/24',
    '196.201.214.200/24',
    // Add more IP ranges as provided by Safaricom
  ];
  
  // Simple IP validation (in production, use a proper IP range library)
  const isValidIp = allowedIpRanges.some(range => {
    // Basic IP validation - implement proper CIDR matching in production
    return clientIp.startsWith(range.split('/')[0].substring(0, 10));
  });
  
  if (!isValidIp) {
    console.warn(`⚠️  Callback from unauthorized IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Unauthorized IP address',
      data: null
    });
  }
  
  next();
}

/**
 * Request validation middleware
 */
function validateRequest(requiredFields = []) {
  return (req, res, next) => {
    const errors = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!req.body[field]) {
        errors.push(`${field} is required`);
      }
    });
    
    // Check content type for POST requests
    if (req.method === 'POST' && !req.is('application/json')) {
      errors.push('Content-Type must be application/json');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        data: null
      });
    }
    
    next();
  };
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  
  // Handle specific error types
  if (err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Unable to connect to M-Pesa service';
  } else if (err.response && err.response.status) {
    statusCode = err.response.status;
    message = err.response.data?.message || err.message;
  }
  
  res.status(statusCode).json({
    success: false,
    message: message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.response?.data 
    })
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`🔄 ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`✅ ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
}

module.exports = {
  apiKeyAuth,
  rateLimit,
  validateMpesaIP,
  validateRequest,
  errorHandler,
  requestLogger
};