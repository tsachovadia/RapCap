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
                primary: "#9213ec",
                "bg-dark": "#1a1022",
                "card-dark": "#2b1f35",
                "surface-dark": "#322839",
                accent: {
                    red: "#ff3b30",
                    blue: "#0a84ff",
                    green: "#30d158",
                    orange: "#ff9f0a",
                }
            },
            fontFamily: {
                display: ["Spline Sans", "Noto Sans Hebrew", "sans-serif"]
            },
            borderRadius: {
                DEFAULT: "1rem",
                lg: "1.5rem",
                xl: "2rem",
            },
        },
    },
    plugins: [],
}
