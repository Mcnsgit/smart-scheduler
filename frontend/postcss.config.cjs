module.exports = {
  plugins: {
    "postcss-preset-mantine": {
      dir: "./src",
      theme: {
        // Enable automatic px to rem conversion
        autoRem: true,
      },
    },
    "postcss-simple-vars": {
      variables: {
        // Define breakpoints matching those in our theme
        "mantine-breakpoint-xs": "36em", // 576px
        "mantine-breakpoint-sm": "48em", // 768px
        "mantine-breakpoint-md": "62em", // 992px
        "mantine-breakpoint-lg": "75em", // 1200px
        "mantine-breakpoint-xl": "88em", // 1400px
      },
    },
  },
};
