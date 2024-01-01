import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.materialreader',
  appName: 'Material Reader',
  webDir: 'dist/material-reader',
  server: {
    androidScheme: 'https'
  }
};

export default config;
