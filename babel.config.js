module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push("react-native-worklets/plugin");
  
  // Inline EXPO_ROUTER env vars for Metro workers (Windows compatibility)
  plugins.push([
    "transform-inline-environment-variables",
    {
      include: ["EXPO_ROUTER_APP_ROOT", "EXPO_ROUTER_IMPORT_MODE"]
    }
  ]);

  return {
    presets: [
      ["babel-preset-expo", { jsxRuntime: "automatic" }],
      "nativewind/babel"
    ],
    plugins,
  };
};
