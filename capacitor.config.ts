import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c4b8c3df8da1491ca943adf1069ef839',
  appName: 'MetalPredict Pro',
  webDir: 'dist',
  // For a PUBLIC / Play Store APK the app must run the bundled `dist` build.
  // Uncomment the `server` block ONLY for live hot-reload development against the sandbox.
  // server: {
  //   url: 'https://c4b8c3df-8da1-491c-a943-adf1069ef839.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#7c3aed',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7c3aed',
    },
  },
};

export default config;
