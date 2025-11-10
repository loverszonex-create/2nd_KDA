/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'color-white-solid': '#FFFFFF',
        'color-blue-59': '#3B5998',
        'color-blue-82': '#CBD5E1',
        'color-grey-97': '#F7F7F7',
        'color-grey-98': '#FAFAFA',
        'color-azure-11': '#1E3A8A',
        'color-azure-27': '#1E40AF',
        'color-azure-64': '#60A5FA',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

