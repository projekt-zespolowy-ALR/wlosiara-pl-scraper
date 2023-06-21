import type {Scraper} from "../scraper/Scraper.js";
import type {DeepReadonly} from "ts-essentials";

export class App {
	private scrapers: DeepReadonly<Scraper[]>;
	public constructor(scrapers: Scraper[]) {
		this.scrapers = scrapers;
	}

	public async run(): Promise<void> {
		for (const scraper of this.scrapers) {
			await scraper.scrape((offer) => {
				fetch("https://api.wlosiara.pl/products/v1/dump", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(offer),
				});
			});
		}
	}
}
