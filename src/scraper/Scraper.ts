import type {Offer} from "../types/Offer.js";

export interface Scraper {
	scrape(onScraped: (offer: Offer) => void): Promise<void>;
}
