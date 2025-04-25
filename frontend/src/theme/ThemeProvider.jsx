import { createContext, useContext } from "react";
import {
  MantineProvider,
  localStorageColorSchemeManager,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { Spotlight, SpotlightActionData } from "@mantine/spotlight/styles.css";
import { theme, cssVariablesResolver } from "./theme";
import { IconHome, IconCalendarMonth, IconSquareRoundedPlus,IconSettings, IconSearch, IconListDetails } from '@tabler/icons-react';

// Create a theme context
const ThemeContext = createContext();

// Export the theme hook for components to access theme functions
export const useAppTheme = () => useContext(ThemeContext);

// Create a color scheme manager that saves to localStorage
const colorSchemeManager = localStorageColorSchemeManager({
  key: "smart-scheduler-color-scheme",
});

// Main ThemeProvider component
export function AppThemeProvider({ children }) {
  // Context value for theme functions
  const themeContextValue = {
    theme,
    // Note: We don't need to manage colorScheme here anymore
    // as Mantine now handles this internally
  };

   let SpotlightActionData = [
              {
                id: "home",
                label: "Home",
                description: "Go to dashboard",
                keywords: ["dashboard", "main"],
                leftSection: <IconHome size={24} stroke={1.5}/>
              },
              {
                id: "tasks",
                label: "Tasks",
                description: "View and manage tasks",
                keywords: ["todo", "task"],
                leftSection: <IconListDetails size={24} stroke={1.5}/>

              },
              {
                id: "calendar",
                label: "Calendar",
                description: "View your schedule",
                keywords: ["schedule", "plan"],
                leftSection: <IconCalendarMonth size={24} stroke={1.5}/>
              },
              {
                id: "add-task",
                label: "Add Task",
                description: "Create a new task",
                keywords: ["new", "create"],
                leftSection: <IconSquareRoundedPlus size={24} stroke={1.5}/>
              },
              {
                id: "settings",
                label: "Settings",
                description: "Adjust application settings",
                keywords: ["preferences", "config"],
                leftSection: <IconSettings size={24} stroke={1.5}/>
              }
            ]
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MantineProvider
        theme={{
          ...theme,
          // Additional accessibility settings
          respectReducedMotion: true,
        }}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="light"
        colorSchemeManager={colorSchemeManager}
      >
        <Notifications position="top-right" zIndex={1000} />
        <ModalsProvider
          modalProps={{
            centered: true,
            trapFocus: true, // For accessibility
            closeOnEscape: true,
            withinPortal: true,
          }}
        >
          <Spotlight
            actions={SpotlightActionData}
          >
            {children}
          </Spotlight>
        </ModalsProvider>
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
