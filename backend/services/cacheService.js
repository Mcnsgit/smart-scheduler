// backend/services/cacheService.js
const memoryCache = require("memory-cache");
const { getAsync, setAsync } = require("../config/redis");

// Cache keys prefixes
const CACHE_KEYS = {
  AVAILABLE_SLOTS: "slots:",
  TASK_GROUP: "taskgroup:",
  SCHEDULE_RESULT: "schedule:",
  SETTINGS: "settings:",
};

// Cache durations in seconds
const CACHE_DURATION = {
  VERY_SHORT: 30, // 30 seconds
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

/**
 * Two-level cache implementation (memory + Redis)
 * - First check in-memory cache (faster)
 * - Then check Redis (distributed cache)
 * - Store in both when setting values
 */
class CacheService {
  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached data or null
   */
  async get(key) {
    try {
      // First try memory cache (faster)
      const memData = memoryCache.get(key);
      if (memData) {
        return JSON.parse(memData);
      }

      // Then try Redis
      const redisData = await getAsync(key);
      if (redisData) {
        // Store in memory cache for faster access next time
        memoryCache.put(key, redisData, CACHE_DURATION.SHORT * 1000);
        return JSON.parse(redisData);
      }

      return null;
    } catch (err) {
      console.error("Cache get error:", err);
      return null; // Fail gracefully
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} duration - Cache duration in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, data, duration = CACHE_DURATION.MEDIUM) {
    try {
      const serialized = JSON.stringify(data);

      // Store in memory cache
      memoryCache.put(key, serialized, duration * 1000);

      // Store in Redis
      await setAsync(key, serialized, "EX", duration);

      return true;
    } catch (err) {
      console.error("Cache set error:", err);
      return false; // Fail gracefully
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      // Clear from memory cache
      memoryCache.del(key);

      // Clear from Redis
      await delAsync(key);

      return true;
    } catch (err) {
      console.error("Cache delete error:", err);
      return false;
    }
  }

  /**
   * Create cache key for available slots
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {string} - Cache key
   */
  getAvailableSlotsKey(startDate, endDate) {
    const start =
      startDate instanceof Date
        ? startDate.toISOString().split("T")[0]
        : "unknown";
    const end =
      endDate instanceof Date ? endDate.toISOString().split("T")[0] : "unknown";
    return `${CACHE_KEYS.AVAILABLE_SLOTS}${start}-${end}`;
  }

  /**
   * Create cache key for task grouping
   * @param {Array} tasks - Array of task IDs
   * @returns {string} - Cache key
   */
  getTaskGroupKey(tasks) {
    // Use the task IDs to create a deterministic key
    const taskIds = tasks
      .map((t) => t._id)
      .sort()
      .join("-");
    return `${CACHE_KEYS.TASK_GROUP}${taskIds.substring(0, 100)}`; // Limit key length
  }

  /**
   * Create cache key for scheduling results
   * @param {Array} taskIds - Task IDs being scheduled
   * @param {Date} startDate - Scheduling start date
   * @returns {string} - Cache key
   */
  getScheduleResultKey(taskIds, startDate) {
    const taskHash = taskIds.sort().join("-").substring(0, 50);
    const dateStr =
      startDate instanceof Date
        ? startDate.toISOString().split("T")[0]
        : "unknown";
    return `${CACHE_KEYS.SCHEDULE_RESULT}${dateStr}-${taskHash}`;
  }

  /**
   * Create cache key for user settings
   * @param {string} userId - User ID (optional)
   * @returns {string} - Cache key
   */
  getSettingsKey(userId = "default") {
    return `${CACHE_KEYS.SETTINGS}${userId}`;
  }
}

module.exports = new CacheService();
