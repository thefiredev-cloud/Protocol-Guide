const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Use lightweight shim for react-native-reanimated on web
// This reduces web bundle by ~400KB while maintaining animations via CSS
const webResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-reanimated") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "lib/reanimated-web-shim.tsx"),
    };
  }
  
  // Use default resolver for everything else
  if (webResolveRequest) {
    return webResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Enable minification in production - drops console.logs and shrinks bundle
if (process.env.NODE_ENV === "production") {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
      },
      mangle: {
        keep_fnames: false,
      },
      output: {
        comments: false,
        ascii_only: true,
      },
    },
  };
}

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
