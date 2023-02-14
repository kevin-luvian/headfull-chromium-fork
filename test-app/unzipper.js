const fs = require("fs")
const unzipper = require("unzipper")

const unzipCSVFile = async (filePath, targetPath, tempDir) => {
    await new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: tempDir }))
            .on("close", () => resolve())
            .on("error", () => resolve());
    });

    const files = fs.readdirSync(tempDir);

    for (const file of files) {
        if (file.includes(".csv")) {
            const filePath = `${tempDir}/${file}`;
            fs.renameSync(filePath, targetPath);
            return [true, targetPath];
        }
    }

    return [false, ""];
};

module.exports = {
    unzipCSVFile
}