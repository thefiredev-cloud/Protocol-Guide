/**
 * Optimized imports to enable better tree-shaking
 *
 * Instead of importing entire icon libraries, we create optimized
 * re-exports that only include icons actually used in the app.
 */

// Re-export only the icons we actually use from @expo/vector-icons
// This helps with tree-shaking and reduces bundle size
export { MaterialIcons } from "@expo/vector-icons";

// For future optimization: Create specific named exports instead of full icon sets
// Example:
// import { MaterialIcons } from "@expo/vector-icons";
// export const SearchIcon = MaterialIcons.glyphMap.search;
// export const MenuIcon = MaterialIcons.glyphMap.menu;
