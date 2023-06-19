import {Browser} from "puppeteer";

export class WizazClient {
    private readonly browser: Browser;

    constructor(browser: Browser) {
        this.browser = browser;
    }
}
