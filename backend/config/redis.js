// backend/config/redis.js
const redis = require("redis");
const { promisify } = require("util");

// Create Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "",
  // Enable TLS if using a secure connection
  ...(process.env.REDIS_TLS_URL ? { tls: { rejectUnauthorized: false } } : {}),
  retry_strategy: function (options) {
    if (options.error && options.error.code === "ECONNREFUSED") {
      // End reconnecting on a specific error
      console.error("Redis server refused connection");
      return new Error("The server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after 1 hour
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // Reconnect after increasing time intervals
    return Math.min(options.attempt * 100, 3000);
  },
});

// Handle Redis client errors to prevent app crash
redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// Promisify Redis methods for async/await usage
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const keysAsync = promisify(redisClient.keys).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);

// Default cache expiration time (in seconds)
const DEFAULT_EXPIRATION = 3600; // 1 hour

// Cache middleware for API routes
const cacheMiddleware = (duration = DEFAULT_EXPIRATION) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Create a unique cache key from the request path and query params
    const cacheKey = `api:${req.originalUrl || req.url}`;

    try {
      // Try to get cached response
      const cachedResponse = await getAsync(cacheKey);

      if (cachedResponse) {
        // Return cached response
        const parsedResponse = JSON.parse(cachedResponse);
        return res.json(parsedResponse);
      }

      // If no cache, replace res.json with custom implementation to cache the response
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        try {
          // Store the response in cache
          await setAsync(cacheKey, JSON.stringify(body));
          // Set expiration
          await expireAsync(cacheKey, duration);
        } catch (err) {
          console.error("Error caching response:", err);
        }

        // Send the original response
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next();
    }
  };
};

// Function to clear cache for specific patterns
const clearCache = async (pattern) => {
  try {
    const keys = await keysAsync(pattern);
    if (keys.length > 0) {
      const pipeline = redisClient.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
      console.log(
        `Cleared ${keys.length} cache keys matching pattern: ${pattern}`
      );
    }
  } catch (err) {
    console.error("Error clearing cache:", err);
    throw err;
  }
};

module.exports = {
  redisClient,
  getAsync,
  setAsync,
  delAsync,
  cacheMiddleware,
  clearCache,
};
