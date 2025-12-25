import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className={`relative flex items-center justify-center p-2 rounded-xl transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-glow-green'
          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
      } ${className}`}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 360 : 0,
          scale: isDark ? 1 : 1,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {isDark ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
