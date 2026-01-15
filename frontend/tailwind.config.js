/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // App backgrounds
        "app-bg": "#050505",
        "shell-bg": "rgba(10, 10, 10, 0.6)", // Glass shell

        // Panels
        "panel-header": "rgba(20, 20, 20, 0.6)",
        "chat-bg": "transparent", // Will use global gradient

        // Messages
        "incoming-msg": "rgba(255, 255, 255, 0.08)",
        "outgoing-msg": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // We'll handle gradient in CSS class, here just a placeholder color if needed or use specific classes

        // Brand
        brand: "#6366f1",
        "brand-soft": "#818cf8",
        "brand-glow": "0 0 20px rgba(99, 102, 241, 0.5)",

        // Text
        "text-main": "#ffffff",
        "text-muted": "#9ca3af",

        // States
        success: "#10b981",
        danger: "#ef4444",
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.4)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
