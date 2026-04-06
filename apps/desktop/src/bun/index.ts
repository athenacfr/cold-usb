// Electrobun main process — implemented in T10
import { BrowserWindow } from "electrobun/bun";

async function getMainViewUrl(): Promise<string> {
  try {
    await fetch("http://localhost:5173", { method: "HEAD" });
    return "http://localhost:5173";
  } catch {
    return "views://mainview/index.html";
  }
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Cold USB",
  url,
  frame: {
    width: 1280,
    height: 800,
    x: 100,
    y: 100,
  },
});
