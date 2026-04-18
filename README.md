# Orbit

- web deployment on Vercel
- Android and iPhone builds through Capacitor
- a phone-first UI that simplifies heavier views on smaller screens
- Android release signing through GitHub Actions

## What Is In This Repo

- `src/`: the React app
- `android/`: Capacitor Android project
- `ios/`: Capacitor iOS project
- `capacitor.config.ts`: Capacitor app config
- `vercel.json`: Vercel build config
- `.github/workflows/ci.yml`: lint, web build, debug APK, Vercel preview/production deploys
- `.github/workflows/release-mobile.yml`: tag release workflow for lint, web build, Vercel deploy, and APK build

## Prerequisites

Install these first:

- Node.js 22+ and npm
- Git

For Android builds:

- Android Studio
- Android SDK
- Java 17+ or the version your local Gradle setup expects

For iPhone builds:

- macOS
- Xcode
- CocoaPods if your local iOS setup needs it

For web deploys:

- a Vercel account
- optionally the Vercel CLI

## Install

```bash
npm install
```

## Run The Web App Locally

```bash
npm run dev
```

## Build The Web App

```bash
npm run build
```

The production output is written to:

```bash
dist/
```

## Lint The Project

```bash
npm run lint
```

## Generate An APK Locally

The easiest local APK is the Android debug APK.

From the project root:

```bash
npm install
npm run cap:sync
```

Then build the APK.

### On Windows

```bash
cd android
gradlew.bat assembleDebug
```

### On macOS Or Linux

```bash
cd android
./gradlew assembleDebug
```

The generated APK will be here:

```bash
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build A Signed Android Release Locally

From the project root:

```bash
npm run cap:sync
cd android
gradlew.bat assembleRelease bundleRelease
```

On macOS or Linux:

```bash
npm run cap:sync
cd android
./gradlew assembleRelease bundleRelease
```

If you want the release build to be signed, set these environment variables before the build:

```bash
ORBIT_UPLOAD_STORE_FILE
ORBIT_UPLOAD_STORE_PASSWORD
ORBIT_UPLOAD_KEY_ALIAS
ORBIT_UPLOAD_KEY_PASSWORD
```

## Generated Signing Secrets

The generated Android signing values and discovered Vercel IDs are stored locally in:

```bash
android/signing-secrets.local.txt
```

That file is ignored by Git and currently contains:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

When you add GitHub repository secrets, copy those values into GitHub Actions secrets with the same names.

## Capacitor Workflow

The normal Capacitor workflow is:

1. Build the web app
2. Sync the built files into the native project
3. Open the native IDE
4. Build and run from Android Studio or Xcode

Recommended sync command:

```bash
npm run cap:sync
```

If you only want to copy updated web assets:

```bash
npm run cap:copy
```

## Android Build Instructions

If the Android folder already exists:

```bash
npm run cap:sync
npm run cap:open:android
```

Then in Android Studio:

1. Let Gradle sync
2. Select a device or emulator
3. Run the app

If you ever need to create the Android platform again:

```bash
npx cap add android
```

## iPhone Build Instructions

If the iOS folder already exists:

```bash
npm run cap:sync
npm run cap:open:ios
```

Then in Xcode:

1. Select a simulator or physical device
2. Set signing/team if needed
3. Build and run

If you ever need to create the iOS platform again:

```bash
npx cap add ios
```

## Full Build Order

If you want the shortest "build everything" sequence, use this order:

### Web production build

```bash
npm install
npm run lint
npm run build
```

### Android

```bash
npm run cap:sync
npm run cap:open:android
```

### iPhone

```bash
npm run cap:sync
npm run cap:open:ios
```

## Deploy To Vercel

This repo is configured for Vercel with:

- `vite` framework
- `npm run build` as the build command
- `dist` as the output directory

### Option 1: Connect The Repo In Vercel

1. Import the Git repository into Vercel
2. Keep the detected Vite settings
3. Deploy

### Option 2: Deploy From The CLI

```bash
vercel deploy
```

For production:

```bash
vercel --prod
```

## GitHub Actions Pipeline

This repo includes:

```bash
.github/workflows/ci.yml
```

It does:

- `npm ci`
- `npm run lint`
- `npm run build`
- Android debug APK build
- Vercel preview deploys for pull requests
- Vercel production deploys for pushes to `main`

### What Runs On Pull Requests

- lint
- web build
- debug APK artifact
- Vercel preview deploy comment when Vercel secrets are configured

### What Runs On Push To `main`

- lint
- web build
- debug APK artifact
- Vercel production deployment when Vercel secrets are configured

## Release Workflow

The repo also includes:

```bash
.github/workflows/release-mobile.yml
```

This workflow runs when you create a tag like `v1.0.0` and is used for:

- linting the app
- building the web app
- deploying the release to Vercel production
- building a release APK artifact
- optional Google Play upload

It can run:

- manually from GitHub Actions
- automatically when you push a tag like `v1.0.0`

## GitHub Secrets You Need

### Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are already present in:

```bash
android/signing-secrets.local.txt
```

## What The Release Workflow Produces

Android:

- release APK artifact

Web:

- Vercel production deployment

## Useful Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
npm run cap:copy
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

## Troubleshooting

### Web build works but the phone app is outdated

Run:

```bash
npm run cap:sync
```

### Android or iOS native project is missing

Recreate it:

```bash
npx cap add android
npx cap add ios
```

### Vercel does not deploy

Make sure:

- `VERCEL_TOKEN` exists in GitHub secrets
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match your Vercel project
- the repo is connected in Vercel, or you deploy from the Vercel CLI

### Signed Android release build fails locally

Make sure the four `ORBIT_UPLOAD_*` variables are set in your shell before running `assembleRelease`.

### Build is large

The current Vite build may still show a large-chunk warning. That does not block deployment, but code-splitting is a good next optimization target.
