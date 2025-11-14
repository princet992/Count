# Devotional Counter App

A beautiful React Native counter app with a devotional/spiritual aesthetic. Track your daily counts, set goals, and view your history.

## Features

- ✨ Tap anywhere on the counter area to increment
- ➕➖ Add/Subtract buttons for precise control
- 🎯 Set daily goals and track progress
- 📜 View history of all previous days with goals
- 💾 Automatic data persistence using AsyncStorage
- 🙏 Beautiful devotional design with calming colors

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

## Building for Production

### Android (Play Store)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure the build:
```bash
eas build:configure
```

4. Build for Android:
```bash
eas build --platform android
```

5. Submit to Play Store:
```bash
eas submit --platform android
```

### iOS (App Store)

1. Build for iOS:
```bash
eas build --platform ios
```

2. Submit to App Store:
```bash
eas submit --platform ios
```

## Project Structure

```
counter/
├── App.js              # Main app component
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## Technologies Used

- React Native
- Expo
- AsyncStorage for data persistence
- React Hooks (useState, useEffect)

## License

MIT

