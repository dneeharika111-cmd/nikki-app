import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1020",
        mist: "#EDF4FF",
        tide: "#6AA6FF",
        flare: "#FF8159",
        mint: "#5BE7C4"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(11, 16, 32, 0.14)"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at top left, rgba(106, 166, 255, 0.32), transparent 35%), radial-gradient(circle at top right, rgba(91, 231, 196, 0.22), transparent 30%), linear-gradient(135deg, #f8fbff 0%, #eef5ff 45%, #fef7f1 100%)"
      }
    }
  },
  plugins: []
};

export default config;
