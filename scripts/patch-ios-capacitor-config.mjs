import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve("ios/App/App/capacitor.config.json");
const extraPlugins = ["NativeAppleSignInPlugin"];

const config = JSON.parse(readFileSync(configPath, "utf8"));
const classList = new Set(config.packageClassList ?? []);

for (const pluginClass of extraPlugins) {
  classList.add(pluginClass);
}

config.packageClassList = [...classList];
writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
