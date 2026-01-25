/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Spotify Exact Colors
                "spotify-green": "#1DB954",
                "spotify-black": "#191414",
                "spotify-dark": "#121212",
                "spotify-gray": {
                    900: "#181818",
                    800: "#282828",
                    700: "#3E3E3E",
                    600: "#535353",
                    400: "#B3B3B3",
                    200: "#FFFFFF",
                }
            },
            fontFamily: {
                sans: [
                    "system-ui",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "Arial",
                    "Noto Sans Hebrew",
                    "sans-serif"
                ]
            },
            spacing: {
                // Spotify uses 4px base unit
                "0.5": "2px",
                "1": "4px",
                "2": "8px",
                "3": "12px",
                "4": "16px",
                "5": "20px",
                "6": "24px",
                "8": "32px",
                "10": "40px",
                "12": "48px",
            },
            borderRadius: {
                "sm": "4px",
                "DEFAULT": "4px",
                "md": "6px",
                "lg": "8px",
                "xl": "12px",
                "2xl": "16px",
                "full": "9999px",
            },
            fontSize: {
                "2xs": ["11px", { lineHeight: "16px" }],
                "xs": ["12px", { lineHeight: "16px" }],
                "sm": ["14px", { lineHeight: "20px" }],
                "base": ["16px", { lineHeight: "24px" }],
                "lg": ["18px", { lineHeight: "28px" }],
                "xl": ["20px", { lineHeight: "28px" }],
                "2xl": ["24px", { lineHeight: "32px" }],
                "3xl": ["32px", { lineHeight: "40px" }],
            }
        },
    },
    plugins: [],
}
