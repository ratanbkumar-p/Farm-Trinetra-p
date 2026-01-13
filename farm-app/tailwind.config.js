/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Materialistic colors setup
                primary: "#6200EE",
                primaryVariant: "#3700B3",
                secondary: "#03DAC6",
                background: "#F5F5F5",
                surface: "#FFFFFF",
                error: "#B00020",

                // Farm specific palette
                farm: {
                    green: "#2E7D32",   // Lush plant green
                    brown: "#795548",   // Earthy brown
                    light: "#F1F8E9",   // Light green bg
                    accent: "#FF9800",  // Harvest orange
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
