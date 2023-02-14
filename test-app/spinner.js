const spinner = require("cli-spinner").Spinner;

const mSpin = new spinner();
mSpin.setSpinnerString("|/-\\");
let start = 0;

module.exports = {
    log: (message) => {
        mSpin.setSpinnerTitle(`${message} %s `);
        mSpin.start();
        start = Date.now();
    },
    close: () => {
        mSpin.stop();
        const elapsed = (Date.now() - start) / 1000;
        console.log(`- took ${elapsed}s`);
    },
};