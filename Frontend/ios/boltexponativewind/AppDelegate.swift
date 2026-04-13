import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    print("🔵 AppDelegate: Window created")
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
    print("🔵 AppDelegate: About to configure Firebase")
    FirebaseApp.configure()
    print("🔵 AppDelegate: Firebase configured")
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
    print("🔵 AppDelegate: Starting React Native")
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
// @generated begin @react-native-firebase/auth-openURL - expo prebuild (DO NOT MODIFY)
    if url.host?.lowercased() == "firebaseauth" {
      // invocations for Firebase Auth are handled elsewhere and should not be forwarded to Expo Router
      return false
    }
// @generated end @react-native-firebase/auth-openURL
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Use auto-detection first (works better with changing IPs)
    if let url = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry") {
      print("🔵 bundleURL (auto-detected): \(url.absoluteString)")
      return url
    }
    // Fallback: Return nil to let React Native handle the error gracefully
    // This will show a red error screen instead of crashing
    print("🔴 bundleURL: Auto-detection failed - Metro bundler may not be accessible")
    return nil
#else
    // Release: standalone app uses only the embedded bundle from "Bundle React Native code and images" build phase.
    if let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return url
    }
    print("🔴 Release: main.jsbundle not found. The app must be built with the \"Bundle React Native code and images\" phase succeeding. Check Xcode build log for that phase and ensure NODE_BINARY is set in ios/.xcode.env.local.")
    return nil
#endif
  }
}
