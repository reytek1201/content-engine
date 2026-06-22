import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "https://www.slidepress.co";

const config: CapacitorConfig = {
  appId: "co.slidepress.app",
  appName: "SlidePress",
  webDir: "capacitor-www",
  appendUserAgent: "SlidePressApp/1",
  server: {
    url: serverUrl,
    androidScheme: "https",
    allowNavigation: [
      "slidepress.co",
      "www.slidepress.co",
      "*.slidepress.co",
      "*.supabase.co",
    ],
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
