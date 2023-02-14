const Scrapper = require("./Scrapper");
const fs = require("fs");
const readline = require("readline-sync");
const spinner = require("./spinner")
const { unzipCSVFile } = require("./unzipper")

class Config {
  isBrowserHeadless;
  email;
  password;
  otp;
  viaEmail;
  depositMutationStartDate;
  depositMutationEndDate;
  csvDir;
  cookiesDir;
  screenshotsDir;
  tempDir;
  downloadTimeout;

  constructor(obj) {
    for (const prop in obj) {
      this[prop] = obj[prop];
    }
  }
}

const ensureDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    return true;
  }
  fs.mkdirSync(dirPath, { recursive: true });
  ensureDirectory(dirPath);
};

const cleanDirectory = (dirPath) => {
  ensureDirectory(dirPath);
  fs.rmSync(dirPath, { recursive: true });
  ensureDirectory(dirPath);
};

class PlayToped {
  screenshotID = 0;

  /**
   * @type {Scrapper}
   */
  _scrapper;

  /**
   * @type {Config}
   */
  config;

  constructor() {
    let rawdata = fs.readFileSync("./config.json");
    this.config = new Config(JSON.parse(rawdata));

    ensureDirectory(this.config.cookiesDir);
    ensureDirectory(this.config.csvDir);
    cleanDirectory(this.config.screenshotsDir);
    cleanDirectory(this.config.tempDir);
  }

  init = async () => {
    this._scrapper = new Scrapper();
    await this._scrapper.init({
      downloadsPath: this.config.tempDir
    });
    this._scrapper.abortImageRequests();
  };

  close = async () => {
    await this._scrapper.close();
  };

  doScreenshot = async (stepname) => {
    this.screenshotID++;
    const filepath = `${this.config.screenshotsDir}/${this.screenshotID}-${stepname}.jpg`;
    await this._scrapper.doScreenshot(filepath);
    console.log(`== [Screenshot Taken] ${filepath}`);
  };

  /**
   * generate random value between 1-3 seconds for input delay
   */
  randInputDelay = () => {
    return (Math.floor(Math.random() * 3) + 1) * 100;
  };

  /**
   * delay for n seconds or random fast delay
   */
  delay = async (n = undefined) => {
    if (n) {
      await this._scrapper.customDelay(n);
    } else {
      await this._scrapper.fastDelay();
    }
  };

  isLoggedIn = async () => {
    await this._scrapper.customDelay(2);
    const button = await this._scrapper.getButtonWithText("Masuk", 3);
    if (button) {
      return false;
    }
    return true;
  };

  setCookies = async () => {
    const cookiepath = `${this.config.cookiesDir}/cookies-${this.config.email}.json`;
    await this._scrapper.readCookies(cookiepath);
  };

  saveCookies = async () => {
    const cookiepath = `${this.config.cookiesDir}/cookies-${this.config.email}.json`;
    await this._scrapper.writeCookies(cookiepath);
  };

  gotoLandingPage = async () => {
    await this._scrapper.gotoWait("https://www.tokopedia.com", 10);
    await this.delay(2);
    await this.doScreenshot("landing-page");
  };

  gotoLoginPage = async () => {
    await this._scrapper.gotoWait("https://www.tokopedia.com/login");
    await this.doScreenshot("login-page");
  };

  gotoPartnerMutationPage = async () => {
    const depositMutationURL = `https://www.tokopedia.com/partner/dashboard/saldo-topup?tab=depositMutation&start_date=${this.config.depositMutationStartDate}&end_date=${this.config.depositMutationEndDate}&page_size=10`;
    await this._scrapper.gotoWait(depositMutationURL, 7);
    await this.doScreenshot("deposit-mutation-dashboard");
  };

  fillLoginEmail = async () => {
    const input = await this._scrapper.waitForSelectorElement(
      'input[id="email-phone"]',
      3
    );
    await input.focus();
    await input.type(this.config.email, {
      delay: this.randInputDelay(),
    });

    await this.doScreenshot("email-filled-in");
    await input.press("Enter");
  };

  fillLoginPassword = async () => {
    const input = await this._scrapper.waitForSelectorElement(
      'input[id="password-input"]',
      3
    );
    await input.focus();
    await input.type(this.config.password, {
      delay: this.randInputDelay(),
    });

    await this.doScreenshot("password-filled-in");
  };

  fillManualOTPCode = async () => {
    const isVerifikasiPage = await this._scrapper.waitForLocatorElement(
      "text=Masukkan Kode Verifikasi",
      7
    );
    if (!isVerifikasiPage) {
      throw new Error("redirect to verification page failed");
    }

    const otpCode = readline.question("== [Listening Input] OTP Code: ");

    const input = await this._scrapper.waitForSelectorElement(
      'input[aria-label="otp input"]'
    );
    await input.focus();
    await input.type(otpCode, { delay: this.randInputDelay() });

    await this.doScreenshot("otp-filled-in");
    await input.press("Enter");
  };

  clickSubmit = async () => {
    const button = await this._scrapper.waitForSelectorElement(
      'button[type="submit"]',
      3
    );
    await button.focus();
    await button.click();

    await this.doScreenshot("submit-clicked");
  };

  clickMutationDataExportButton = async () => {
    const button = await this._scrapper.waitForLocatorElement("//button[contains(., 'Ekspor Data')]", 7);
    await button.click();
    await this.delay(1);
    await this.doScreenshot("export-button-clicked");
  };

  clickOTPVerification = async () => {
    const viaEmailElem = await this._scrapper.waitForLocatorElement(
      "b:text('E-mail ke')"
    );
    await this.doScreenshot("verification-page");

    if (viaEmailElem) {
      await viaEmailElem.click();
      await this.doScreenshot("via-email-clicked");
      return;
    }

    console.log("== Text 'E-Mail ke' Not Found, continuing with 'SMS ke'");

    const viaSMSElem = await this._scrapper.waitForLocatorElement(
      "b:text('SMS ke')"
    );

    if (viaSMSElem) {
      await viaSMSElem.click();
      await this.doScreenshot("via-sms-clicked");
      return;
    }

    console.log("== Text 'SMS ke' Not Found~!");
    throw new Error("OTP verification method not handled");
  };

  waitForFileDownload = async () => {
    spinner.log("== [Listening for .zip Download]")
    const filename = await this._scrapper.getOnDownloadFilename(".zip", 120);
    spinner.close();

    const filepath = `${this.config.tempDir}/${filename}`

    spinner.log(`== [Downloading File] ${filepath}`)
    const isDownloaded = await this._scrapper.waitForFileDownload(filepath, 120)
    spinner.close()

    return [isDownloaded, filepath]
  }

  unzipCSVFile = async (filePath) => {
    const targetPath = `${this.config.csvDir}/Deposit-${this.config.depositMutationStartDate}-${this.config.depositMutationEndDate}.csv`

    spinner.log(`== [Unzipping File] ${filePath}`)
    await unzipCSVFile(filePath, targetPath, this.config.tempDir)
    spinner.close();
  };
}

module.exports = PlayToped;
