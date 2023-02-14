const { Page, Browser, BrowserContext } = require("playwright-core");
const { chromium } = require("playwright-extra");
const fs = require("fs");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
chromium.use(StealthPlugin());
chromium.plugins.setDependencyDefaults("stealth/evasions/webgl.vendor", {
  vendor: "Bob",
  renderer: "Alice",
});

class Scrapper {
  screenshotID = 1;
  /**
   * @type {Page}
   */
  page;
  /**
   * @type {Browser}
   */
  browser;
  /**
   * @type {BrowserContext}
   */
  context;

  init = async ({ downloadsPath }) => {
    this.browser = await chromium.launch({
      headless: false,
      downloadsPath
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  };

  close = async () => {
    await this.browser.close();
  };

  writeCookies = async (filepath) => {
    const cookies = await this.context.cookies();
    await fs.promises.writeFile(filepath, JSON.stringify(cookies, null, 2));
  };

  readCookies = async (filepath) => {
    let cookies = [];

    try {
      const cookiesString = await fs.promises.readFile(filepath);
      cookies = JSON.parse(cookiesString);
    } catch (err) {
      await fs.promises.writeFile(filepath, JSON.stringify([], null, 2));
      cookies = [];
    }

    await this.context.addCookies(cookies);
  };

  abortImageRequests = async () => {
    await this.context.route("**", (route) => {
      if (route.request().resourceType() === "image") {
        route.abort();
      } else {
        route.continue();
      }
    });
  };

  // delay for n seconds
  customDelay = async (n) => {
    await this.page.waitForTimeout(n * 1000);
  };

  // delay between 1-3 seconds
  fastDelay = async () => {
    const delay = (Math.floor(Math.random() * 2) + 1) * 1000;
    await this.page.waitForTimeout(delay);
  };

  doScreenshot = async (filepath) => {
    await this.page.screenshot({
      path: filepath,
      fullPage: true,
    });
  };

  gotoWait = async (url, timeout = 5) => {
    await this.page.goto(url, {
      waitUntil: "load",
      timeout: timeout * 1000,
    });
  };

  /**
   * @returns {Promise<import("playwright-core").Locator>}
   */
  getButtonWithText = async (text, timeout = 3) => {
    const button = this.page.locator(`button:text("${text}")`);
    try {
      await button.waitFor({
        state: "visible",
        timeout: timeout * 1000,
      });
      return button;
    } catch {
      return undefined;
    }
  };

  /**
   * wait for element using page.locator
   */
  waitForLocatorElement = async (locator, timeout = 5) => {
    try {
      const button = this.page.locator(locator);
      await button.waitFor({
        state: "visible",
        timeout: timeout * 1000,
      });
      return button;
    } catch {
      return undefined;
    }
  };

  /**
   * wait for element using page.waitForSelector
   */
  waitForSelectorElement = async (selector, timeout = 5) => {
    try {
      const elem = await this.page.waitForSelector(selector, {
        timeout: timeout * 1000,
      });
      return elem;
    } catch {
      return undefined;
    }
  };

  getOnDownloadFilename = async (extension = ".zip", timeout = 60) => {
    timeout = timeout * 1000;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const rListener = async (request) => {
        const elapsed = (Date.now() - start) / 1000;

        if (elapsed >= timeout) {
          reject(new Error("download timeout reached"));
          this.page.off("request", rListener);
          return;
        }

        if (request.url().endsWith(extension)) {
          const filename = request.url().split("/").pop();
          resolve(filename);
          this.page.off("request", rListener);
        }
      };

      this.page.on("request", rListener);
    });
  };

  waitForFileDownload = async (filePath, timeout = 120) => {
    try {
      const download = await this.page.waitForEvent("download", {
        timeout: timeout * 1000,
      });
      await download.saveAs(filePath);
      return true
    } catch {
      return false
    }
  };
}

module.exports = Scrapper;
