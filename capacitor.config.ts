import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mes.factory",
  appName: "厂里通",
  webDir: "public",
  server: {
    url: "https://mes-factory-five.vercel.app",
    cleartext: true,
    androidScheme: "https",
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
