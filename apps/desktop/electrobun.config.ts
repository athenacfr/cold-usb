import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Cold USB",
    identifier: "com.coldusb.wallet",
    version: "0.1.0",
  },
  build: {
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    watchIgnore: ["dist/**"],
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
} satisfies ElectrobunConfig;
