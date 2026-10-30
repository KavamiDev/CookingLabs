import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
await page.goto("http://localhost:3000/connexion", { waitUntil: "networkidle" });
console.log(
  await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    return {
      htmlClass: document.documentElement.className,
      geistVar: html.getPropertyValue("--font-geist-sans"),
      fontSansVar: html.getPropertyValue("--font-sans"),
      htmlFont: html.fontFamily,
      h1Font: getComputedStyle(document.querySelector("h1")).fontFamily,
    };
  }),
);
await browser.close();
