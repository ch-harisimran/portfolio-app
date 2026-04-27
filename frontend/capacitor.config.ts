import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pakfinance.app",
  appName: "PakFinance",
  webDir: "public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "http://10.0.2.2:3000",
    cleartext: true,
  },
};

export default config;
