import puppeteer, {Browser, ElementHandle, Page} from "puppeteer";
import latinize from "latinize";
import type {Scraper} from "../../scraper/Scraper.js";
import type {Offer} from "../../types/Offer.js";
import type {DataSource} from "../../types/DataSource.js";
import type {Product} from "../../types/Product.js";
import type {Ingredient} from "../../types/Ingredient.js";
import type {Category} from "../../types/Category.js";
import type {Brand} from "../../types/Brand.js";

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
			const randomTimeout = this.getRandomTimeout(20000, 100000);
			await this.delay(randomTimeout);
		}
		await browser.close();
		// get total nr of pages
		// then loop through all pages
		// for each page, get all offers and call onScraped
		// if something goes wrong, log it and continue
		// await browser.close();
	}

	getRandomTimeout(max: number, min: number): number {
		// get a random number between 20 and 100
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	async delay(time: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, time));
	}

	async createBrowserInstance(): Promise<Browser> {
		return await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			headless: false,
			"ignoreHTTPSErrors": true,
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
		const lastPageButton = await page.$$eval(
			".page-switcher > ul:nth-child(2) > li:nth-child(5) > a",
			(elements) => elements.map((el) => el.textContent)
		);
		return parseInt(lastPageButton?.[0] ?? "1");
	}

	async scrapePage(browser: Browser, page: Page, pageNumber: number): Promise<void> {
		if (pageNumber === 1) {
			await page.goto("https://wizaz.pl/kosmetyki/wlosy");
		} else {
			const baseUrl =
				"https://wizaz.pl/kosmetyki/wlosy?search_full%5Bsort%5D=popularity&search_full%5Bfilter_reviews_min%5D=&search_full%5Bfilter_hits_min%5D=&page=";
			await page.goto(baseUrl + pageNumber);
		}

		const product_urls = await page.$$eval("article.list-product", (urls: HTMLElement[]) => {
			return (
				urls.map((el: HTMLElement) => el.querySelector("div > header > a")?.getAttribute("href")) ??
				null
			);
		});

		for (const url of product_urls) {
			const randomTimeout = this.getRandomTimeout(500, 5000);
			await this.delay(randomTimeout);
			const newPage = await browser.newPage();
			await this.scrapeOffer(newPage, url!);
			await newPage.close();
		}
	}

	async scrapeOffer(page: Page, url: string): Promise<void> {
		let dataObject: Offer = {} as Offer;
		let productObject: Product = {} as Product;
		let brandObject: Brand = {} as Brand;
		await page.goto(url);
		await page.waitForSelector("#main-wrapper");
		const showIngredientsButton = await page.$(".ingreedients > a");
		await page.click(".properties > a");
		if (showIngredientsButton) {
			await page.click(".ingreedients > a");
		}

		const referenceUrl = url;
		const imageUrl =
			(await page.$$eval(
				".product__gallery__item > img",
				(elements: HTMLElement[]) => elements.map((el: HTMLElement) => el.getAttribute("src"))[0]
			)) ?? null;
		const description =
			(await page.$$eval(
				".product-description > article > p",
				(elements: HTMLElement[]) => elements.map((el: HTMLElement) => el.textContent)[0]
			)) ?? null;

		const productSlug: string | null =
			(await page.$$eval(
				"header > h1",
				(elements: HTMLElement[]) => elements.map((el: HTMLElement) => el.textContent)[0]
			)) ?? null;
		function idify(str: string): string {
			return latinize(str)
				.toLowerCase()
				.replace(/[^a-z0-9]/g, " ")
				.trim()
				.replace(/\s+/g, "-");
		}
		const productSlugIdified: string | null = idify(productSlug as string) ?? null;
		const data = (
			await page.$$eval(".product-extras > .column", (elements) =>
				elements.map((e) => {
					const label = e.querySelector(".label")?.textContent;
					const value = e.querySelector(".value")?.textContent;
					return {label, value};
				})
			)
		).reduce((acc: Record<string, string>, cur) => {
			const label = cur.label;
			const value = cur.value;
			if (!label || !value) {
				console.warn("Missing label or value", cur, `at url ${url}`);
				return acc;
			}
			acc[label] = value;
			return acc;
		}, {});

		console.log(data);
		const category = data["Kategoria"] ?? null;
		const brand = data["Marka"] ?? null;
		const capacity = data["Pojemność"] ?? null;
		const price = data["Cena"] ?? null;

		if (price) {
			const withoutCurrency = price.match(/(\d+(,|\.)\d+)/g)?.[0] ?? null;
			console.log(withoutCurrency);
			if (withoutCurrency?.match(/(,)/g)) {
				const pricePLN = parseFloat(withoutCurrency.replace(/(,)/g, "."));
				console.log("PRICE PLN: ", pricePLN);
				dataObject.pricePln = pricePLN;
			} else if (withoutCurrency?.match(/(\.)/g)) {
				const pricePLN = parseFloat(withoutCurrency);
				dataObject.pricePln = pricePLN;
			} else {
				dataObject.pricePln = null;
			}
		} else {
			dataObject.pricePln = null;
		}
		let volume: string | null = null;
		let weight: string | null = null;

		if (capacity?.match(/(ml)/g)) {
			volume = capacity?.match(/(\d+)/g)?.[0] ?? null;
		} else if (capacity?.match(/(g)/g)) {
			weight = capacity?.match(/(\d+)/g)?.[0] ?? null;
		} else {
			volume = null;
			weight = null;
		}
		// skladniki
		const ingredientList = await page.$$eval(
			" div.properties-ingreedients > div.ingreedients > ul > li",
			(elements) =>
				elements.map((el) => el.textContent?.toLocaleLowerCase().trim().replace(/(,)/g, ""))
		);

		console.log(ingredientList);
		productObject.slug = productSlugIdified;
		const productNameArray = productSlug?.split(", ");
		productObject.name = productNameArray?.slice(1).join(", ") ?? null;
		brandObject.name = brand;
		brandObject.slug = idify(brand as string);
		productObject.brand = brandObject;

		if (category) {
			category.length > 0
				? (productObject.categories = [{name: category, slug: idify(category)}])
				: null;
		} else {
			productObject.categories = null;
		}

		volume ? (productObject.volumeLiters = parseFloat(volume) / 1000) : null;
		weight ? (productObject.massKilograms = parseFloat(weight) / 1000) : null;

		if (ingredientList) {
			const ingredientsArray: Ingredient[] = [];
			if (ingredientList.length === 0) {
				productObject.ingredients = null;
			} else if (ingredientList.filter((ingredient) => ingredient!.length > 100).length > 0) {
				productObject.ingredients = null;
			} else {
				for (const ingredient of ingredientList) {
					const ingredientObject: Ingredient = {} as Ingredient;
					ingredientObject.latinName = ingredient ?? null;
					ingredient ? (ingredientObject.slug = idify(ingredient)) : null;
					ingredientObject.latinName && ingredientObject.slug
						? ingredientsArray.push(ingredientObject)
						: null;
				}
				productObject.ingredients = ingredientsArray;
			}
		}
		console.log(productObject);

		dataObject.referenceUrl = referenceUrl;
		dataObject.dataSource = this.getDataSource();
		dataObject.imageUrl = imageUrl;
		dataObject.description = description;
		dataObject.product = productObject;
		console.log(
			"------------------------------------------------------------------------------------"
		);
		console.log(JSON.stringify(dataObject));

		console.log(
			"------------------------------------------------------------------------------------"
		);
	}

	getDataSource(): DataSource {
		const dataSourceName = "Wizaż.pl";
		const dataSourceSlug = "wizaz";
		const dataSourceURL = "https://wizaz.pl";
		return {
			name: dataSourceName,
			slug: dataSourceSlug,
			url: dataSourceURL,
		} as DataSource;
	}
}
