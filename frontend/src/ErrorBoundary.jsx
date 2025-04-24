// src/ErrorBoundary.jsx
import React from "react";
import PropTypes from "prop-types";
/**
 * Error boundary component to catch errors in child components
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Log the error to an error reporting service
    this.logErrorToMyService(error, info.componentStack);
  }
  logErrorToMyService(error, componentStack) {
    // Implement your error logging service here
    if (import.meta.env.NODE_ENV !== "production") {
      console.log("Logging error to service:", error, componentStack);
    } else {
      // Send the error to an external service
      // Example: fetch('/log', { method: 'POST', body: JSON.stringify({ error, componentStack }) });
    }
  }
  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback;
    }
    return this.props.children;
  }
}
ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node.isRequired,
};
export default ErrorBoundary;
