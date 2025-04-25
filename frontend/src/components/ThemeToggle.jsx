import {
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

/**
 * ThemeToggle component for switching between light and dark mode
 * Implementation follows the Mantine documentation to avoid hydration issues
 */
export function ThemeToggle({ size = "md", ...others }) {
  // Get setColorScheme function from useMantineColorScheme hook
  const { setColorScheme } = useMantineColorScheme();

  // Get the computed color scheme (light or dark, never auto)
  // The getInitialValueInEffect option prevents hydration mismatch in SSR
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  // Toggle between light and dark color schemes
  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "light" ? "dark" : "light");
  };

  return (
    <Tooltip
      label={
        computedColorScheme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      position="bottom"
      withArrow
    >
      <ActionIcon
        onClick={toggleColorScheme}
        variant="default"
        size={size}
        aria-label="Toggle color scheme"
        className="theme-toggle"
        {...others}
      >
        {/* Icons are conditionally shown based on the current color scheme */}
        <IconSun className="theme-icon theme-icon-light" stroke={1.5} />
        <IconMoon className="theme-icon theme-icon-dark" stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}
