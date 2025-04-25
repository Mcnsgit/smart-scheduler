import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { pxToRem } from "./colorUtils";

/**
 * Custom hook for responsive design that safely handles server-side rendering
 * This is a wrapper around Mantine's useMediaQuery hook that prevents hydration issues
 */
export function useResponsive() {
  const [mounted, setMounted] = useState(false);

  // Breakpoints from theme - converted to em units
  const breakpoints = {
    xs: pxToRem(576),
    sm: pxToRem(768),
    md: pxToRem(992),
    lg: pxToRem(1200),
    xl: pxToRem(1400),
  };

  // Media query helpers - false until component mounts to prevent SSR mismatch
  const isXs = useMediaQuery(`(min-width: ${breakpoints.xs})`) && mounted;
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm})`) && mounted;
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md})`) && mounted;
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg})`) && mounted;
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl})`) && mounted;

  // More specific media query ranges
  const isXsOnly = isXs && !isSm && mounted;
  const isSmOnly = isSm && !isMd && mounted;
  const isMdOnly = isMd && !isLg && mounted;
  const isLgOnly = isLg && !isXl && mounted;

  // Mobile/desktop helpers
  const isMobile = !isSm && mounted;
  const isTablet = (isSm || isMd) && !isLg && mounted;
  const isDesktop = isLg && mounted;

  // Safe getCurrentBreakpoint function
  const getCurrentBreakpoint = () => {
    if (!mounted) return "unknown"; // Safe default for SSR
    if (isXl) return "xl";
    if (isLg) return "lg";
    if (isMd) return "md";
    if (isSm) return "sm";
    if (isXs) return "xs";
    return "xs"; // Default to smallest
  };

  // Handle SSR hydration with useEffect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dark mode preference helper (separate from theme color scheme)
  const prefersDarkMode =
    useMediaQuery("(prefers-color-scheme: dark)") && mounted;

  // High contrast mode preference helper
  const prefersHighContrast =
    useMediaQuery("(prefers-contrast: more)") && mounted;

  // Reduced motion preference helper
  const prefersReducedMotion =
    useMediaQuery("(prefers-reduced-motion: reduce)") && mounted;

  return {
    // Breakpoint flags
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,

    // Range helpers
    isXsOnly,
    isSmOnly,
    isMdOnly,
    isLgOnly,

    // Device type helpers
    isMobile,
    isTablet,
    isDesktop,

    // Current breakpoint helper
    getCurrentBreakpoint,

    // Accessibility preferences
    prefersDarkMode,
    prefersHighContrast,
    prefersReducedMotion,

    // Flag for SSR safety
    mounted,
  };
}

/**
 * Helper hook to get appropriate component size based on breakpoint
 * @param {Object} sizes - Object mapping breakpoints to sizes
 * @returns {string|number} - Appropriate size for current breakpoint
 */
export function useResponsiveSize(sizes) {
  const { isXs, isSm, isMd, isLg, isXl, mounted } = useResponsive();

  // Handle SSR - return a default until mounted
  if (!mounted) {
    return sizes.base || sizes.md || "md";
  }

  // Return largest matching breakpoint's size
  if (isXl && sizes.xl) return sizes.xl;
  if (isLg && sizes.lg) return sizes.lg;
  if (isMd && sizes.md) return sizes.md;
  if (isSm && sizes.sm) return sizes.sm;
  if (isXs && sizes.xs) return sizes.xs;

  // Fallback to base or medium
  return sizes.base || sizes.md || "md";
}
