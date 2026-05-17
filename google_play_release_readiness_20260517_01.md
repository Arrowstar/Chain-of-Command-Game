# Google Play Store Release Readiness Audit

Chain of Command has an outstanding visual presentation, robust gameplay mechanics, and active responsive support for phones/tablets. However, migrating an HTML5/React/PixiJS game into a native Android app wrapper (via Capacitor) for production release requires addressing several platform-specific details. 

This audit details the critical gaps, architectural options, and a step-by-step checklist to elevate the game from **Alpha** to **Production-Ready** for the Google Play Store.

---

## 📊 Current Release Readiness Scorecard

| Polish Area | Status | Impact | Action Required |
| :--- | :--- | :--- | :--- |
| **Input & Safe Areas (Notches/Cutouts)** | 🔴 **Missing** | High | Side console overlays, top status bars, and floating tooltips will clip under modern camera notches and gesture bars. |
| **Data Persistence & Save Quotas** | 🟡 **Risk** | High | `localStorage` has a strict 5MB quota and is routinely cleared by Android when device space is low. Needs migration to IndexedDB. |
| **Background Lifecycle & Memory Recovery** | 🔴 **Missing** | High | If Android kills the app in the background due to low memory, active battle/skirmish progress is permanently lost. |
| **Native Splash Screen & App Icons** | 🔴 **Missing** | Medium | The app currently flashes white on launch and uses the default Capacitor robot icon, which will fail Google Play review. |
| **Asset Sizing & Build Footprint** | 🟢 **Complete** | Low | Great work on batch resizing assets in previous milestones! The app bundle size is optimized. |
| **Target SDK & Gradle Config** | 🟢 **Complete** | Low | Gradle is configured with target/compile SDK 36, exceeding Google's minimum Target SDK 34 requirement. |
| **Platform Navigation (Hardware Back)** | 🟢 **Complete** | Low | Native `backButton` listeners are correctly configured in `App.tsx` to prevent accidental hard exits. |

---

## 🛠️ Critical Gaps & Proposed Architecture

### 1. Notch, Cutout & Safe-Area Compliance (CSS / JS)
In landscape gameplay mode on modern bezel-less phones, camera cutouts and bottom gesture bars will overlap game controls.

#### The Problem
- Elements locked to screen edges (e.g., the Comms Log, Sector Map Legend, and custom tooltip overlays) will render directly underneath the camera hole or navigation gesture pill.
- Viewport size is currently tracked dynamically by width, but does not read physical screen inset dimensions.

#### The Solution (Safe-Area CSS Variables)
Capacitor injects safe area margins automatically into CSS environment variables. We must update the global design system inside `app/src/index.css` to respect these margins:

```css
/* Update your app root padding to automatically absorb safe-area insets */
.app-root {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

/* For absolute components like side status cards or logs */
.fleet-status-rail-overlay {
  padding-left: calc(52px + env(safe-area-inset-left, 0px));
  padding-right: calc(16px + env(safe-area-inset-right, 0px));
}

.main-menu-data-column--left {
  padding-left: env(safe-area-inset-left, 8px);
}
.main-menu-data-column--right {
  padding-right: env(safe-area-inset-right, 8px);
}
```

> [!NOTE]
> Make sure `viewport-fit=cover` is declared in `app/index.html`'s viewport meta tag so that the web page spans the entire screen behind the notch:
> `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />`

---

### 2. High-Durability Persistence (Migrating to IndexedDB)
`localStorage` is a lightweight key-value store intended for web mockups. On mobile, it has two major flaws:
1. **Low Storage Quota:** Capped at an arbitrary 5MB. If a save slot contains detailed combat/log state, multiple slots will quickly throw a `QuotaExceededError`.
2. **Eviction Risk:** Android's default WebView will clear `localStorage` without warning if the device runs out of disk space.

#### The Solution (IndexedDB Backend)
Since the `idb` package is already declared in `app/package.json`'s dependencies, we should transition the save backend inside [CampaignSaveManager.ts](file:///c:/Users/Adam/Dropbox/Documents/homework/Personal%20Projects/Chain of Command Game/app/src/utils/CampaignSaveManager.ts) from `localStorage` to IndexedDB.

Here is a proposed structure using `idb` to implement safe, high-capacity, durable saves:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CoCSchema extends DBSchema {
  saves: {
    key: string;
    value: SaveSlotData;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<CoCSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CoCSchema>('ChainOfCommandDB', 1, {
      upgrade(db) {
        const store = db.createObjectStore('saves', { keyPath: 'meta.id' });
        store.createIndex('by-date', 'meta.savedAt');
      },
    });
  }
  return dbPromise;
}
```
*Benefits:*
- Unlimited storage (up to 80% of the device's remaining disk space).
- Operates asynchronously, preventing thread-blocking lag when writing large logs or autosaves during combat transitions.

---

### 3. Background Low-Memory Recovery State
Mobile players get interrupted constantly (phone calls, notifications, switching to messaging apps). If they leave the game backgrounded, Android's Activity Manager will eventually slaughter the webview to free up RAM.

#### The Problem
- If the app is killed while in `skirmish`, `campaign-combat`, or `tutorial` modes, the next launch drops the user back to the Main Menu. The combat encounter is lost, inducing immense player frustration.

#### The Solution (Background Recovery Slot)
Implement a state-caching hook that triggers during Capacitor app state background events:

1. **Serialize Active Battle State:** Register a listener for `appStateChange` inside [App.tsx](file:///c:/Users/Adam/Dropbox/Documents/homework/Personal%20Projects/Chain%20of%20Command%20Game/app/src/App.tsx).
2. **Write to Recovery Cache:** If the game is in an active combat/scenario mode, serialize `useGameStore.getState()` into a temporary IndexedDB slot (`CoC_Recovery_Cache`).
3. **Prompt Recovery on Launch:** On app initialization, check for the existence of `CoC_Recovery_Cache`. If found, display a holographic dialog: `"COMM LINK RESTORED: Resume interrupted battle?"`

```typescript
// Example snippet inside App.tsx
useEffect(() => {
  const sub = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive && isCombatActive(appMode)) {
      const activeState = useGameStore.getState().serializeState();
      // Write asynchronously to Recovery Cache
      IndexedDBManager.saveRecoveryCache(activeState);
    }
  });
  return () => { sub.then(l => l.remove()); };
}, [appMode]);
```

---

### 4. Native Splash Screen & Adaptive Icon Set
Google Play rejects apps that display raw system templates or default launcher logos, and players expect a seamless transition from clicking the app icon to seeing the main menu.

#### The Splash Screen Bug
- Currently, when loading the app, Capacitor shows a blank white screen before the React bundler resolves.
- *Fix:* Configure the splash screen plugin in `capacitor.config.json` and customize the duration/fade:

```json
"plugins": {
  "SplashScreen": {
    "launchShowDuration": 1500,
    "launchAutoHide": true,
    "backgroundColor": "#0b0d13",
    "androidScaleType": "CENTER_CROP",
    "showSpinner": false,
    "splashFullScreen": true,
    "splashImmersive": true
  }
}
```

#### Adaptive Icon Integration
Android 8.0+ enforces **Adaptive Icons** (foreground layers moving independently over background layers for visual depth).
1. Create a `resources/` folder in the project root containing:
   - `icon-foreground.png` (512x512 transparent pixel asset)
   - `icon-background.png` (512x512 solid color/pattern asset)
   - `splash.png` (2732x2732 centering your main game artwork)
2. Run Capacitor Assets generator to instantly format all drawable and mipmap resolutions for both platforms:
   ```bash
   npx @capacitor/assets generate --android
   ```

---

### 5. Battery and Performance Optimization (PixiJS Ticker Control)
Mobile GPUs will drain battery and overheat if a game runs hot while the user is not actively interacting with it.

#### Best Practices for Release
- **De-register Tickers:** Stop the PixiJS Ticker or pause your canvas rendering loop if `appStateChange` detects that the app is backgrounded.
- **Sleep Prevention (Wake Lock):** During long, immersive tactical hex battles, if the player is reading a log or calculating a target trajectory, the device screen should not auto-sleep. Integrate `@capacitor-community/keep-awake` to prevent the OS from dimming the screen during battles, and release the lock once they exit to the Main Menu.

---

## 📋 Google Play Publishing Checklist

Use this checklist to track the absolute requirements to transition from a local build to an approved production build on the Google Play Store:

### 🟩 Step 1: Legal & Privacy (Console Hard Blocks)
- [ ] **Privacy Policy URL:** Google Play *mandates* a public-facing Privacy Policy for all apps. Create a static landing page (e.g., on GitHub Pages or your official site) detailing that the game collects zero personal data, and host it.
- [ ] **Data Safety Form:** Complete the data safety questionnaire inside the Google Play Console, declaring that the app collects no user analytics or tracking identifiers.
- [ ] **Age Rating (IARC):** Submit the IARC questionnaire in the console. Declare zero violence/gore, zero offensive language, and zero gambling to secure an **E for Everyone (3+)** rating.

### 🟩 Step 2: Android Build Configuration
- [ ] **Version Versioning Bump:** In [android/app/build.gradle](file:///c:/Users/Adam/Dropbox/Documents/homework/Personal%20Projects/Chain%20of%20Command%20Game/android/app/build.gradle), increment the `versionCode` (e.g., `3`) and the `versionName` (e.g., `"0.3"`) prior to every build upload.
- [ ] **Release Signing Key:** Generate a secure keystore file using Java's keytool to sign the final release build:
  ```bash
  keytool -genkey -v -keystore chainofcommand-release.keystore -alias coc-alias -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] **Generate Android App Bundle (AAB):** Build the final bundle instead of an APK. This allows Google Play to deliver optimized binaries tailored to each device's specific architecture:
  ```bash
  npm run build
  npx cap sync
  cd android
  ./gradlew bundleRelease
  ```

### 🟩 Step 3: Google Play Console Release Flow
- [ ] **Closed Testing Track (Alpha):** Release the `.aab` bundle to the Closed Testing track first. Google Play requires testing the app with at least 20 opted-in testers for 14 days before approving a public release.
- [ ] **Create Beautiful Store Visuals:**
  - **High-Res Icon:** 512x512 32-bit PNG.
  - **Feature Graphic:** 1024x500 landscape display.
  - **Screenshots:** At least four landscape screenshots (e.g., showing the CIC Main Menu, Tactical Hex Map in action, Bridge Crew panel, and custom Scenario Editor).
