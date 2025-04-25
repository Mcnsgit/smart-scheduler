import { createTheme, rem } from "@mantine/core";

// Main theme with accessibility features
export const theme = createTheme({
  // Color palette with accessible contrast ratios
  colors: {
    // Deep Indigo with accessible contrast ratios
    indigo: [
      "#ECEAFE", // 0
      "#D6D5FC", // 1
      "#B3B1F8", // 2
      "#8F8CF4", // 3
      "#6C67F0", // 4
      "#4A46EC", // 5
      "#3A36E0", // 6: primary dark
      "#2F2CBA", // 7
      "#252394", // 8
      "#1C1A70", // 9
    ],
    // Mint Teal with accessible contrast ratios
    teal: [
      "#E6F9F6", // 0
      "#CCF3ED", // 1
      "#99E7DB", // 2
      "#66DBC9", // 3
      "#4AD9C8", // 4: secondary
      "#33C2B1", // 5: secondary dark
      "#29A194", // 6
      "#1F7B70", // 7
      "#15544D", // 8
      "#0C2E2A", // 9
    ],
    // Status colors with accessible contrast ratios
    orange: [
      "#FFF0ED", // 0
      "#FFE1DB", // 1
      "#FFC3B7", // 2
      "#FFA593", // 3
      "#FF876F", // 4
      "#FF7A5A", // 5: urgent
      "#E55C3D", // 6
      "#CC4020", // 7
      "#A83315", // 8
      "#5C1C0B", // 9
    ],
    green: [
      "#EEFAEF", // 0
      "#DDF5E0", // 1
      "#BBEBB1", // 2
      "#9AE192", // 3
      "#7DD181", // 4: completed
      "#60C264", // 5
      "#4BA64E", // 6
      "#378A39", // 7
      "#235E25", // 8
      "#0F320F", // 9
    ],
    purple: [
      "#F2EFFE", // 0
      "#E6DFFD", // 1
      "#CDBEFC", // 2
      "#B49EFA", // 3
      "#9F85FF", // 4: in-progress
      "#8A6CFA", // 5
      "#7253E3", // 6
      "#5A3ACC", // 7
      "#42269B", // 8
      "#2A1769", // 9
    ],
    yellow: [
      "#FFF8E6", // 0
      "#FFF1CC", // 1
      "#FFE499", // 2
      "#FFD766", // 3
      "#FFCA33", // 4
      "#FFBE3D", // 5: upcoming
      "#E6A217", // 6
      "#BD850F", // 7
      "#946807", // 8
      "#6C4C04", // 9
    ],
    // Neutral grays with accessible contrast ratios
    gray: [
      "#F6F7FB", // 0: light background
      "#E4E6ED", // 1: light divider
      "#D1D3DC", // 2
      "#B4B7C5", // 3
      "#9EA3B8", // 4: tertiary text
      "#747A91", // 5
      "#5D6275", // 6
      "#464A5C", // 7: steel gray
      "#2D3142", // 8: soft charcoal (text)
      "#171923", // 9: midnight (dark background)
    ],
  },

  // Primary color configuration
  primaryColor: "indigo",
  primaryShade: { light: 6, dark: 5 },

  // Border radius settings
  defaultRadius: "md",
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(16),
    xl: rem(32),
  },

  // Spacing configuration
  spacing: {
    xs: rem(10),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(32),
  },

  // Font settings
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
  },

  // Line height settings
  lineHeights: {
    xs: 1.4,
    sm: 1.45,
    md: 1.55,
    lg: 1.6,
    xl: 1.65,
  },

  // Heading styles
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    sizes: {
      h1: { fontSize: rem(32), lineHeight: 1.3 },
      h2: { fontSize: rem(28), lineHeight: 1.35 },
      h3: { fontSize: rem(24), lineHeight: 1.4 },
      h4: { fontSize: rem(20), lineHeight: 1.4 },
      h5: { fontSize: rem(18), lineHeight: 1.5 },
      h6: { fontSize: rem(16), lineHeight: 1.5 },
    },
  },

  // Focus ring styling for accessibility
  focusRing: "auto",
  focusRingStyles: {
    styles: (theme) => ({
      outlineOffset: rem(2),
      outline: `${rem(2)} solid ${
        theme.colors.indigo[theme.colorScheme === "dark" ? 5 : 6]
      }`,
    }),
    resetStyles: () => ({ outline: "none" }),
    inputStyles: (theme) => ({
      outline: "none",
      borderColor: theme.colors.indigo[theme.colorScheme === "dark" ? 5 : 6],
    }),
  },

  // Other theme settings
  other: {
    // Custom status colors
    statusColors: {
      urgent: "#FF7A5A", // Orange[5]
      completed: "#7DD181", // Green[4]
      inProgress: "#9F85FF", // Purple[4]
      upcoming: "#FFBE3D", // Yellow[5]
    },
  },

  // Media query breakpoints
  breakpoints: {
    xs: rem(576),
    sm: rem(768),
    md: rem(992),
    lg: rem(1200),
    xl: rem(1400),
  },

  // Shadow configuration
  shadows: {
    xs: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 15px -5px rgba(0, 0, 0, 0.05)",
    md: "0 1px 3px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.05)",
    lg: "0 1px 3px rgba(0, 0, 0, 0.05), 0 28px 23px -7px rgba(0, 0, 0, 0.05)",
    xl: "0 1px 3px rgba(0, 0, 0, 0.05), 0 36px 28px -7px rgba(0, 0, 0, 0.05)",
  },

  // Component style overrides
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
          textTransform: "none",
          transition: "background-color 150ms ease, color 150ms ease",
        },
        label: {
          fontWeight: 500,
        },
      },
    },

    Card: {
      defaultProps: {
        radius: "md",
        padding: "lg",
      },
      styles: (theme) => ({
        root: {
          boxShadow:
            theme.colorScheme === "dark"
              ? "0 2px 8px rgba(0, 0, 0, 0.3)"
              : "0 2px 8px rgba(0, 0, 0, 0.1)",
          transition: "box-shadow 150ms ease",
        },
      }),
    },

    TextInput: {
      defaultProps: {
        radius: "md",
      },
      styles: (theme) => ({
        input: {
          transition: "border-color 150ms ease",
          "&:focus": {
            borderColor:
              theme.colors.indigo[theme.colorScheme === "dark" ? 5 : 6],
          },
        },
      }),
    },

    Select: {
      defaultProps: {
        radius: "md",
      },
    },

    Modal: {
      defaultProps: {
        radius: "md",
        padding: "lg",
        centered: true,
        overlayProps: {
          opacity: 0.55,
          blur: 3,
        },
      },
    },

    Switch: {
      defaultProps: {
        radius: "xl",
      },
      styles: () => ({
        track: {
          cursor: "pointer",
        },
        thumb: {
          transition: "transform 150ms ease",
        },
      }),
    },

    Badge: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },

    Notification: {
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
        },
      }),
    },

    Title: {
      styles: {
        root: {
          "&:not(:last-child)": {
            marginBottom: rem(16),
          },
        },
      },
    },

    Text: {
      styles: (theme) => ({
        root: {
          color:
            theme.colorScheme === "dark"
              ? theme.colors.gray[3]
              : theme.colors.gray[8],
        },
      }),
    },

    NavLink: {
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.sm,
          fontWeight: 500,
        },
      }),
    },

    Tabs: {
      styles: (theme) => ({
        tab: {
          fontWeight: 500,
          "&[data-active]": {
            borderColor:
              theme.colors.indigo[theme.colorScheme === "dark" ? 5 : 6],
          },
        },
      }),
    },
  },
});

// CSS variables resolver for custom variables
export const cssVariablesResolver = () => ({
  variables: {
    // Add responsive variables for card layouts
    "--card-size-xs": rem(240),
    "--card-size-sm": rem(340),
    "--card-size-md": rem(440),
    "--card-size-lg": rem(540),

    // Task status indicators
    "--status-urgent-bg": "var(--mantine-color-orange-1)",
    "--status-completed-bg": "var(--mantine-color-green-1)",
    "--status-in-progress-bg": "var(--mantine-color-purple-1)",
    "--status-upcoming-bg": "var(--mantine-color-yellow-1)",

    // Accessibility helpers
    "--focus-ring-width": rem(2),
    "--focus-ring-offset": rem(2),
    "--min-touch-target": rem(44),
    "--table-stripe-color": "var(--mantine-color-gray-0)",
  },

  // Light theme specific variables
  light: {
    "--status-urgent-color": "var(--mantine-color-orange-6)",
    "--status-completed-color": "var(--mantine-color-green-6)",
    "--status-in-progress-color": "var(--mantine-color-purple-6)",
    "--status-upcoming-color": "var(--mantine-color-yellow-7)",
    "--card-shadow": "0 2px 8px rgba(0, 0, 0, 0.1)",
    "--subtle-hover": "var(--mantine-color-gray-0)",
  },

  // Dark theme specific variables
  dark: {
    "--status-urgent-color": "var(--mantine-color-orange-5)",
    "--status-completed-color": "var(--mantine-color-green-5)",
    "--status-in-progress-color": "var(--mantine-color-purple-5)",
    "--status-upcoming-color": "var(--mantine-color-yellow-5)",
    "--card-shadow": "0 2px 8px rgba(0, 0, 0, 0.3)",
    "--subtle-hover": "var(--mantine-color-dark-6)",
    "--table-stripe-color": "var(--mantine-color-dark-6)",
  },
});
