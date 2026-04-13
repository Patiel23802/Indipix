# How to View Release Build Logs on iPhone

When your app crashes in **Release** mode, here's how to see the logs:

## Method 1: macOS Console.app (BEST for Release builds)

**This is the most reliable way to see Release build logs:**

1. **Open Console.app** on your Mac:
   - Press **⌘Space** (Spotlight)
   - Type "Console" and press Enter
   - Or: Applications → Utilities → Console

2. **Connect your iPhone** via USB

3. **In Console.app:**
   - Click **"Devices"** in the left sidebar
   - Select **"Vedant's iPhone"** (or your device name)
   - If you don't see your device, unlock your iPhone and tap "Trust" if asked

4. **Filter the logs to see ONLY your app:**
   
   **Option A: Search by bundle ID (most reliable):**
   - In the search box at the top, type: `com.chitrakala.app`
   - This filters to show ONLY logs from your app
   
   **Option B: Search by app name:**
   - Type: `boltexponativewind`
   
   **Option C: Search by keywords we added:**
   - Type: `🔴` or `🔵` (our emoji markers)
   - Or: `Firebase`, `OTP`, `sendFirebaseOTP`, `checkPhoneExists`
   
   **Option D: Filter by Process column:**
   - Look at the "Process" column in the log table
   - Your app logs will show `boltexponativewind` or `com.chitrakala.app` in that column
   - System logs show `kernel`, `backboardd`, `bluetoothd`, etc.

5. **Reproduce the crash:**
   - Open your app on iPhone
   - Try the signup flow (enter phone + password)
   - Watch logs appear in real-time in Console.app

**You'll see:**
- All console.log statements (including our 🔵, ✅, 🔴 emojis)
- Firebase errors
- Network errors
- Crash stack traces

## Method 2: Xcode Console (May not show all logs in Release)

1. **Keep Xcode open** with your project
2. **Connect your iPhone** via USB
3. **Run the app** from Xcode (⌘R)
4. **Open the Debug Console**:
   - View → Debug Area → Show Debug Area (⇧⌘Y)
   - Or click the bottom panel icon in Xcode
5. **Check console filter:**
   - Make sure "All Output" is selected (not "Errors Only")
   - Click the filter dropdown in the console and select "All Output"

**Note:** Xcode console may not show all logs in Release mode. **Console.app is more reliable.**

## Method 3: Terminal Script (Alternative)

Run this script in Terminal to stream logs:

```bash
cd /Users/vedantpatil/Desktop/Frontend/ios
./stream-device-logs.sh
```

Then reproduce the crash on your iPhone and watch Terminal for logs.

1. **Open Console.app** on your Mac (Applications → Utilities → Console)
2. **Select your iPhone** from the left sidebar (under "Devices")
3. **Filter logs**:
   - Search for: `boltexponativewind` or `com.chitrakala.app`
   - Or filter by "Error" or "Fault"
4. **Reproduce the crash** on your iPhone
5. **Watch the logs** appear in real-time

## Method 4: Terminal (xcrun devicectl - Advanced)

```bash
# List connected devices
xcrun devicectl list devices

# Stream logs from your iPhone (replace DEVICE_ID with your device ID)
xcrun devicectl device process launch \
  --device 00008120-000415E13EF8A01E \
  --attach com.chitrakala.app \
  --stream-output
```

## Method 5: Xcode Organizer (Crash Reports)

1. **Xcode → Window → Organizer** (⇧⌘O)
2. **Crashes** tab
3. Select your app
4. View crash reports (may take a few minutes to appear after crash)

## What to Look For

- **Red error messages** starting with `🔴` (we added these)
- **Firebase errors** - look for `Firebase`, `auth`, `OTP`
- **Network errors** - `fetch`, `Network request failed`
- **Exception stack traces** - lines starting with `*** Terminating app`
- **React Native errors** - RedBox errors (even in Release, some show in logs)

## Quick Debug: Add More Logging

We've added console.log statements with emojis:
- 🔵 = Info/debug
- ✅ = Success
- 🟡 = Warning/fallback
- 🔴 = Error

These will appear in Xcode console even in Release builds.
