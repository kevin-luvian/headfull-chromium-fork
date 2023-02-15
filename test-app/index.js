const fs = require("fs");
const process = require("process")
const TopedScrapper = require("./TopedScrapper");

process.on('SIGTERM', function () {
    console.log('SIGTERM');
    process.exit(0);
})

process.on('SIGINT', function () {
    console.log('SIGINT');
    process.exit(0);
})

const ensureDirectory = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        return true;
    }
    fs.mkdirSync(dirPath, { recursive: true });
    ensureDirectory(dirPath);
};

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * @param {TopedScrapper} tScrapper
 */
const handleLogin = async (tScrapper) => {
    await tScrapper.gotoLoginPage();
    await tScrapper.delay();

    await tScrapper.fillLoginEmail();
    await tScrapper.delay();
    await tScrapper.fillLoginPassword();
    await tScrapper.delay();
    await tScrapper.clickSubmit();

    await tScrapper.delay();

    await tScrapper.clickOTPVerification();
    await tScrapper.delay(5);
    await tScrapper.fillManualOTPCode();
    await tScrapper.delay(15);
};

/**
 * @param {TopedScrapper} tScrapper
 */
const handleDownloadDepositMutation = async (tScrapper) => {
    await tScrapper.gotoPartnerMutationPage();
    await tScrapper.clickMutationDataExportButton();

    const [isDownloaded, filePath] = await tScrapper.waitForFileDownload();
    if (!isDownloaded) {
        throw new Error("File Download Failed");
    }

    await tScrapper.unzipCSVFile(filePath)
};

const run = async () => {
    console.log("Will launch browser...");

    const tScrapper = new TopedScrapper();
    await tScrapper.init();

    try {
        let retries = 3;
        let loggedIn = false;
        for (let i = 0; i < retries; i++) {
            await tScrapper.setCookies();
            await tScrapper.gotoLandingPage();
            const isLoggedIn = await tScrapper.isLoggedIn();
            if (!isLoggedIn) {
                console.log("== [Not Logged In]");
                await handleLogin(tScrapper);
            } else {
                loggedIn = true;
                break;
            }
        }

        if (!loggedIn) {
            throw new Error("logging in failed 3 times");
        }

        console.log("== [Logged In]");
        await tScrapper.saveCookies();

        await handleDownloadDepositMutation(tScrapper);

        console.log("Sleeping...");
        await sleep(7000);

        console.log("Quitting browser...");
        await tScrapper.close();
    } catch (error) {
        await tScrapper.doScreenshot("error-occured");
        console.error(error);
    }
};

run();
