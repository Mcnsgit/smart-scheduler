// services/taskStateService.js
import { reactive } from "@vue/reactivity";
import axios from "axios";

// API base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Create a reactive state object to store tasks
const state = reactive({
  tasks: [],
  lastFetched: null,
  loading: false,
  error: null,
  stats: {
    totalTasks: 0,
    completedTasks: 0,
    scheduledTasks: 0,
    unscheduledTasks: 0,
  },
});

// Compute statistics based on current tasks
const computeStats = () => {
  if (!Array.isArray(state.tasks)) {
    console.warn("Tasks is not an array for stats computation:", state.tasks);
    return;
  }

  state.stats = {
    totalTasks: state.tasks.length,
    completedTasks: state.tasks.filter((task) => task.completed).length,
    scheduledTasks: state.tasks.filter(
      (task) => !task.completed && task.scheduled_start_time
    ).length,
    unscheduledTasks: state.tasks.filter(
      (task) => !task.completed && !task.scheduled_start_time
    ).length,
  };
};

// Task service with centralized state
const taskStateService = {
  // Get the current state
  getState: () => state,

  // Fetch tasks from API
  fetchTasks: async (forceRefresh = false) => {
    // Skip if already fetched recently and not forced
    const cacheTimeMs = 5000; // 5 seconds
    if (
      !forceRefresh &&
      state.lastFetched &&
      new Date().getTime() - state.lastFetched < cacheTimeMs &&
      state.tasks.length > 0
    ) {
      return state.tasks;
    }

    try {
      state.loading = true;
      state.error = null;

      const response = await axios.get(`${API_BASE_URL}/tasks`);
      console.log("API response", response.data);

      // Handle both possible response formats
      let tasksData;
      if (Array.isArray(response.data)) {
        tasksData = response.data;
      } else if (response.data && typeof response.data === "object") {
        // Try various possible response structures
        if (Array.isArray(response.data.tasks)) {
          tasksData = response.data.tasks;
        } else if (response.data.task && Array.isArray(response.data.task)) {
          tasksData = response.data.task;
        } else {
          console.warn("Unexpected response format:", response.data);
          tasksData = [];
        }
      } else {
        console.warn("Invalid response data:", response.data);
        tasksData = [];
      }

      // Ensure all tasks have necessary properties
      tasksData = tasksData.map((task) => ({
        ...task,
        completed: Boolean(task.completed), // Ensure boolean
        scheduled_start_time: task.scheduled_start_time || null,
        scheduled_end_time: task.scheduled_end_time || null,
      }));

      // Update state
      state.tasks = tasksData;
      state.lastFetched = new Date().getTime();

      // Compute statistics
      computeStats();

      return state.tasks;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      state.error = error.message || "Error fetching tasks";
      return [];
    } finally {
      state.loading = false;
    }
  },

  // Add a new task
  addTask: async (taskData) => {
    try {
      state.loading = true;
      const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);

      // Add to state if successful
      if (response.data && response.data._id) {
        state.tasks = [response.data, ...state.tasks];
        computeStats();
      }

      return response.data;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    } finally {
      state.loading = false;
    }
  },

  // Update a task
  updateTask: async (taskId, taskData) => {
    try {
      state.loading = true;
      const response = await axios.put(
        `${API_BASE_URL}/tasks/${taskId}`,
        taskData
      );

      // Update in state if successful
      if (response.data && response.data._id) {
        state.tasks = state.tasks.map((task) =>
          task._id === response.data._id ? response.data : task
        );
        computeStats();
      }

      return response.data;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    } finally {
      state.loading = false;
    }
  },

  // Delete a task
  deleteTask: async (taskId) => {
    try {
      state.loading = true;
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);

      // Remove from state
      state.tasks = state.tasks.filter((task) => task._id !== taskId);
      computeStats();

      return true;
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    } finally {
      state.loading = false;
    }
  },

  // Get filtered tasks
  getFilteredTasks: (filter = {}) => {
    if (!Array.isArray(state.tasks)) {
      console.warn("Tasks is not an array for filtering:", state.tasks);
      return [];
    }

    let filteredTasks = [...state.tasks];

    // Apply filters
    if (filter.completed !== undefined) {
      filteredTasks = filteredTasks.filter(
        (task) => task.completed === filter.completed
      );
    }

    if (filter.scheduled !== undefined) {
      if (filter.scheduled) {
        filteredTasks = filteredTasks.filter((task) =>
          Boolean(task.scheduled_start_time)
        );
      } else {
        filteredTasks = filteredTasks.filter(
          (task) => !task.scheduled_start_time
        );
      }
    }

    if (filter.category) {
      filteredTasks = filteredTasks.filter(
        (task) => task.nlp_data?.category === filter.category
      );
    }

    // Add more filters as needed

    return filteredTasks;
  },

  // Get today's tasks
  getTodayTasks: () => {
    if (!Array.isArray(state.tasks)) {
      return [];
    }

    const today = new Date();

    return state.tasks.filter((task) => {
      if (!task.completed && task.scheduled_start_time) {
        const taskDate = new Date(task.scheduled_start_time);
        return (
          taskDate.getDate() === today.getDate() &&
          taskDate.getMonth() === today.getMonth() &&
          taskDate.getFullYear() === today.getFullYear()
        );
      }
      return false;
    });
  },
};

// Initialize - fetch tasks on service initialization
taskStateService.fetchTasks();

export default taskStateService;
