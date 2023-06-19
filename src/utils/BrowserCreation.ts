import puppeteer from "puppeteer";

export const createBrowser = async () => {
    return await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: false,
        "ignoreHTTPSErrors": true
    });
}

// const puppeteer = require("puppeteer");
//
// async function startBrowser() {
//     let browser;
//     try {
//         console.log("Opening the browser......");
//         browser = await puppeteer.launch({
//             headless: true,
//             args: ["--no-sandbox", "--disable-setuid-sandbox"],
//             "ignoreHTTPSErrors": true,
//         });
//     } catch (err) {
//         console.log("Could not create a browser instance => : ", err);
//     }
//     return browser;
// }
//
// module.exports = {
//     startBrowser,
// };