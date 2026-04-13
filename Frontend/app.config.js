// Load environment variables if .env file exists (for local development)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, that's okay
}

module.exports = {
  expo: {
    name: "Indipix",
    slug: "bolt-expo-nativewind",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/indipix-logo.png",
      resizeMode: "contain",
      backgroundColor: "#7a0f2a"
    },
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.chitrakala.app",
      googleServicesFile: "./GoogleService-Info.plist",
      icon: "./assets/images/icon.png"
    },
    android: {
      package: "com.chitrakala.app",
      usesCleartextTraffic: true,
      googleServicesFile: "./google-services.json",
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#7a0f2a"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-contacts",
        {
          contactsPermission:
            "Allow indipix to read your contacts so we can show who already has an account and start a template chat.",
        },
      ],
      [
        "expo-notifications",
        {
          sounds: [],
          enableBackgroundRemoteNotifications: false,
        },
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // Use environment variable if available, otherwise use production URL
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://64.227.150.214:3000/api",
      eas: {
        projectId: "6e514b12-64f8-452f-9de2-7e51f98819f7"
      }
    }
  }
};
