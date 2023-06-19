import type { Offer } from "../../types/Offer.js";

import type { Scraper } from "../../scraper/Scraper.js";
import puppeteer, { Browser, Page } from "puppeteer";
import type { DataSource } from "../../types/DataSource.js";
import latinize from "latinize";


export class WizazScraper implements Scraper {
    async scrape(onScraped: (offer: Offer) => void): Promise<void> {
        // const browser = await createBrowser();
        // const client = new WizazClient(browser);
        const browser: Browser = await this.createBrowserInstance();
        const page: Page = await this.setUpScraping(browser, "https://www.wizaz.pl/kosmetyki/wlosy");
        await page.waitForSelector("#main-wrapper");
        await this.closeCookiePopUp(page);
        const numberOfPages: number = await this.getNumberOfPages(page);
        console.log(numberOfPages);
        for (let i = 1; i <= numberOfPages; i++) {
            await this.scrapePage(browser, page, i);
        }
        await browser.close();
        // get total nr of pages
        // then loop through all pages
        // for each page, get all offers and call onScraped
        // if something goes wrong, log it and continue
        // await browser.close();
    }
    async createBrowserInstance(): Promise<Browser> {
        return await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: false,
            "ignoreHTTPSErrors": true
        });
    }

    async setUpScraping(browser: Browser, urlToVisit: string): Promise<Page> {
        const page: Page = await browser.newPage();
        await page.goto(urlToVisit);
        return page;
    }

    async closeCookiePopUp(page: Page): Promise<void> {
        try {
            await page.waitForSelector(
                "#tcf277-permissions-modal > div:nth-child(3) > div  > button:nth-child(2)"
            );
            await page.click("#tcf277-permissions-modal > div:nth-child(3) > div  > button:nth-child(2)");
        } catch (err) {
            console.log("Cookie popup not found");
        }
    }

    async getNumberOfPages(page: Page): Promise<number> {
        const lastPageButton = await page.$$eval(".page-switcher > ul:nth-child(2) > li:nth-child(5) > a", (elements) => elements.map((el) => el.textContent));
        return parseInt(lastPageButton?.[0] ?? "1");
    }

    async scrapePage(browser: Browser, page: Page, pageNumber: number): Promise<void> {
        if (pageNumber === 1) {
            await page.goto("https://wizaz.pl/kosmetyki/wlosy");
        }
        else {
            const baseUrl = "https://wizaz.pl/kosmetyki/wlosy?search_full%5Bsort%5D=popularity&search_full%5Bfilter_reviews_min%5D=&search_full%5Bfilter_hits_min%5D=&page=";
            await page.goto(baseUrl + pageNumber);
        }

        const product_urls = await page.$$eval("article.list-product", (urls) => {
            return urls.map((el) => el.querySelector("div > header > a")?.getAttribute("href")) ?? null;
        });

        for (const url of product_urls) {
            const newPage = await browser.newPage();
            await this.scrapeOffer(newPage, url!);
        }
    }

    async scrapeOffer(page: Page, url: string): Promise<void> {

        let dataObject: Offer = {} as Offer;
        await page.goto(url);
        await page.waitForSelector("#main-wrapper");
        await this.closeCookiePopUp(page);
        await page.click(".properties > a");
        await page.click(".ingreedients > a");
        const dataSourceName = "Wizaż.pl";
        const dataSourceSlug = "wizaz";
        const dataSourceURL = "https://wizaz.pl";
        const dataSource: DataSource = {
            name: dataSourceName,
            slug: dataSourceSlug,
            url: dataSourceURL
        } as DataSource;

        const referenceUrl = url;
        const imageUrl = await page.$$eval(".product__gallery__item > img", (elements) => elements.map((el) => el.getAttribute("src"))[0]) ?? null;
        const description = await page.$$eval(".product-description > article > p", (elements) => elements.map((el) => el.textContent)[0]) ?? null;
        const price = null;

        const productSlug: string | null = await page.$$eval("header > h1", (elements) => elements.map((el) => el.textContent)[0]) ?? null;
        function idify(str: string): string {
            return latinize(str)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, " ")
                .trim()
                .replace(/\s+/g, "-");
        }
        const productSlugIdified: string | null = idify(productSlug as string) ?? null;
        const data = Array.from(document.querySelectorAll(".product-extras"))
            .flatMap(e => Array.from(e.children)).map(e => ({
                label: e.querySelector(".label")?.textContent,
                value: e.querySelector(".value")?.textContent
            }))
            .reduce((acc: Record<string, string>, cur) => {
                const label = cur.label;
                const value = cur.value;
                if (!label || !value) {
                    console.warn("Missing label or value", cur, `at url ${url}`);
                    return acc;
                }
                acc[label] = value;
                return acc;
            }, {})
        console.log(data);
        // const mass_or_volume = await page.$$eval("")
        console.log(dataObject);
    }
}