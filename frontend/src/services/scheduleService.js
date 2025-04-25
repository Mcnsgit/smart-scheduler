// services/scheduleService.js
import axios from "axios";

// API base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const scheduleService = {
  /**
   * Run the scheduler with error handling and retry
   * @param {Object} options - Schedule options
   * @returns {Promise<Object>} - Scheduling result
   */
  runScheduler: async (options = {}) => {
    try {
      // First try - basic request
      const response = await axios.post(
        `${API_BASE_URL}/schedule/run`,
        options
      );

      return {
        success: true,
        data: response.data,
        message: response.data?.msg || "Tasks scheduled successfully",
        scheduledTasks: response.data?.scheduledTasks || [],
      };
    } catch (error) {
      console.error("Error running scheduler:", error);

      // Check if we have tasks in the error response (sometimes happens with our API)
      if (error.response?.data?.scheduledTasks) {
        return {
          success: true, // Consider it a partial success
          data: error.response.data,
          message: "Some tasks were scheduled with warnings",
          scheduledTasks: error.response.data.scheduledTasks || [],
        };
      }

      // Try an alternative approach - sometimes the API needs different parameters
      try {
        const fallbackResponse = await axios.post(
          `${API_BASE_URL}/schedule/run`,
          {
            ...options,
            includePriority: true,
            rescheduleTasks: false,
          }
        );

        return {
          success: true,
          data: fallbackResponse.data,
          message: "Tasks scheduled using fallback method",
          scheduledTasks: fallbackResponse.data?.scheduledTasks || [],
        };
      } catch {
        // Both attempts failed - return detailed error
        return {
          success: false,
          error:
            error.response?.data?.message ||
            error.message ||
            "Unknown scheduling error",
          status: error.response?.status || 500,
          message: "Failed to schedule tasks",
          scheduledTasks: [],
        };
      }
    }
  },

  /**
   * Get availability information for scheduling
   */
  getAvailability: async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/schedule/availability`,
        {
          params: { start: startDate, end: endDate },
        }
      );
      return response.data.availableSlots || [];
    } catch (error) {
      console.error("Error fetching availability:", error);
      return [];
    }
  },
};

export default scheduleService;
