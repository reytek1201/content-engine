import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pluginsPath = resolve(
  "android/app/src/main/assets/capacitor.plugins.json",
);

/** Native plugins that must be registered before shipping an Android build. */
const REQUIRED_ANDROID_PLUGINS = [
  {
    pkg: "@revenuecat/purchases-capacitor",
    classpath: "com.revenuecat.purchases.capacitor.PurchasesPlugin",
  },
];

let plugins;
try {
  plugins = JSON.parse(readFileSync(pluginsPath, "utf8"));
} catch {
  console.error(
    `[cap:sync] Missing ${pluginsPath}. Run "npm run cap:sync" before building Android.`,
  );
  process.exit(1);
}

const missing = REQUIRED_ANDROID_PLUGINS.filter(
  (required) =>
    !plugins.some(
      (entry) =>
        entry.pkg === required.pkg && entry.classpath === required.classpath,
    ),
);

if (missing.length > 0) {
  console.error(
    "[cap:sync] Android plugin registry is incomplete. Run \"npm run cap:sync\" and rebuild:",
  );
  for (const plugin of missing) {
    console.error(`  - ${plugin.pkg} (${plugin.classpath})`);
  }
  process.exit(1);
}

console.log(
  `[cap:sync] Verified ${REQUIRED_ANDROID_PLUGINS.length} required Android plugin(s).`,
);
