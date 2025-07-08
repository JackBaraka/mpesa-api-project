const app = require('./src/app');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 M-Pesa API Base URL: ${process.env.MPESA_BASE_URL}`);
  console.log(`💳 Business Short Code: ${process.env.MPESA_BUSINESS_SHORT_CODE}`);
});