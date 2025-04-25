import { rem, darken, lighten, alpha, isLightColor } from "@mantine/core";

/**
 * Utility functions for working with colors
 * Based on Mantine's color functions
 */

/**
 * Determines if text should be dark or light based on background color
 *
 * @param {string} backgroundColor - The background color to check
 * @return {string} - 'white' or 'black' for best contrast
 */
export function getContrastText(backgroundColor) {
  return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
}

/**
 * Creates a hover color based on base color
 *
 * @param {string} color - Base color
 * @param {string} colorScheme - 'light' or 'dark'
 * @return {string} - Color for hover state
 */
export function getHoverColor(color, colorScheme) {
  return colorScheme === "dark" ? lighten(color, 0.1) : darken(color, 0.1);
}

/**
 * Creates an alpha version of color for backgrounds
 *
 * @param {string} color - Base color
 * @param {number} alphaValue - Alpha value between 0 and 1
 * @return {string} - Color with alpha
 */
export function getBackgroundColor(color, alphaValue = 0.1) {
  return alpha(color, alphaValue);
}

/**
 * Get a color for a specific category of task
 *
 * @param {string} category - Task category
 * @param {object} theme - Mantine theme object
 * @return {string} - CSS color variable for category
 */
export function getCategoryColor(category) {
  const categoryColors = {
    "Shopping/Errands": "var(--mantine-color-green-6)",
    Communication: "var(--mantine-color-blue-6)",
    "Work/Study": "var(--mantine-color-indigo-6)",
    "Meeting/Appointment": "var(--mantine-color-purple-6)",
    Chore: "var(--mantine-color-gray-6)",
    Exercise: "var(--mantine-color-orange-6)",
    "Exercise/Health": "var(--mantine-color-orange-6)",
    "Family/Personal": "var(--mantine-color-pink-6)",
    Finance: "var(--mantine-color-teal-6)",
    "Entertainment/Social": "var(--mantine-color-grape-6)",
    General: "var(--mantine-color-gray-6)",
  };

  // Return the mapped color or default to gray
  return categoryColors[category] || categoryColors["General"];
}

/**
 * Get a status color for task status
 *
 * @param {string} status - Task status
 * @param {string} variant - 'bg' for background, 'color' for text
 * @return {string} - CSS variable for status color
 */
export function getStatusColor(status, variant = "color") {
  const statusMap = {
    urgent: {
      bg: "var(--status-urgent-bg)",
      color: "var(--status-urgent-color)",
    },
    completed: {
      bg: "var(--status-completed-bg)",
      color: "var(--status-completed-color)",
    },
    inProgress: {
      bg: "var(--status-in-progress-bg)",
      color: "var(--status-in-progress-color)",
    },
    upcoming: {
      bg: "var(--status-upcoming-bg)",
      color: "var(--status-upcoming-color)",
    },
  };

  return statusMap[status]?.[variant] || statusMap["upcoming"][variant];
}

/**
 * Converts a pixel value to rem
 * Wrapper around Mantine's rem function
 *
 * @param {number|string} px - Pixel value to convert
 * @return {string} - rem value
 */
export function pxToRem(px) {
  return rem(px);
}

/**
 * Creates a CSS gradient based on two colors
 *
 * @param {string} from - Starting color
 * @param {string} to - Ending color
 * @param {number} deg - Gradient direction in degrees
 * @return {string} - CSS linear gradient
 */
export function createGradient(from, to, deg = 45) {
  return `linear-gradient(${deg}deg, ${from} 0%, ${to} 100%)`;
}

/**
 * Creates accessibility-friendly styles for status badges
 *
 * @param {string} status - Task status
 * @return {object} - Style object for the badge
 */
export function getStatusBadgeStyles(status) {
  return {
    backgroundColor: getStatusColor(status, "bg"),
    color: getStatusColor(status, "color"),
    border: `1px solid ${getStatusColor(status, "color")}`,
  };
}

/**
 * Checks if a color meets WCAG AA contrast requirements against white or black
 *
 * @param {string} color - Color to check
 * @param {string} background - Background color (default: white)
 * @return {boolean} - Whether the contrast is sufficient
 */
export function hasAccessibleContrast(color, background = "#FFFFFF") {
  // This is a simplified implementation and would need a full contrast calculator
  // for a complete solution
  return !isLightColor(color) || background !== "#FFFFFF";
}
