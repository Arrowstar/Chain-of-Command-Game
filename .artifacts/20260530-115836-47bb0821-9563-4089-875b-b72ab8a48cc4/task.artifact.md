# Task Management

- [x] Implement Android Immersive Mode
    - [x] Install @capacitor/status-bar and @capacitor/navigation-bar plugins
    - [x] Update `App.tsx` to hide status and navigation bars on mount
    - [x] Update Android `styles.xml` for native fullscreen behavior
    - [x] Verify implementation via build and manual check (if possible)
- [x] Fix "Webpage not available" (ERR_CONNECTION_REFUSED)
    - [x] Resolve EBUSY locking issue in `android/app/src/main/assets/public`
    - [x] Successfully sync web assets to Android
    - [x] Verify why navigation bar was still visible in screenshot
- [x] Enforce Native Immersive Mode
    - [x] Update `MainActivity.java` with focus-aware UI hiding logic
    - [x] Clean up redundant immersive logic in `App.tsx` (optional but recommended)
    - [x] Verify fullscreen behavior in landscape on device
