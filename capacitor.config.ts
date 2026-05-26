import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mes.factory",
  appName: "厂里通",
  webDir: "public",
  server: {
    url: "http://10.254.87.10:3000",
    cleartext: true,
    androidScheme: "http",
    allowNavigation: [
      "10.254.87.10",
    ],
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    Camera: {
      androidPermissions: ["android.permission.CAMERA"],
    },
  },
};

export default config;
