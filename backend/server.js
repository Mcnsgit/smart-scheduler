// backend/server.js
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { cacheMiddleware } = require("./config/redis");
const connectDB = require("./config/db"); // Import DB connection function

// Load env vars
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Connect to Database
connectDB();

const app = express();

// Security Headers
app.use(helmet());

// Compression Middleware
app.use(compression());

// Logging in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate Limiting - protect against DoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiting to all requests
app.use(apiLimiter);

// Init Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
// Body Parser
app.use(express.json({ limit: '1mb' })); // Limit request size

// Apply cache middleware to specific routes
const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600 // 1 hour
};

// Define Routes
app.get("/", (req, res) => res.send("API Running")); // Simple test route

// Mount the tasks router - apply caching
app.use("/api/tasks", cacheMiddleware(CACHE_DURATION.SHORT), require("./routes/api/tasks"));

// Schedule endpoint - less frequent caching
app.use('/api/schedule', cacheMiddleware(CACHE_DURATION.MEDIUM), require('./routes/api/schedule'));

// Settings rarely change, so use longer cache duration
app.use('/api/settings', cacheMiddleware(CACHE_DURATION.LONG), require('./routes/api/settings'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ 
    error: 'Server Error', 
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Set port and start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // In production, we might want to exit and let the process manager restart the app
  // process.exit(1);
});