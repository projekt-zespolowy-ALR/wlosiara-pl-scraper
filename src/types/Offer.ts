import type {DataSource} from "./DataSource.js";
import type {Product} from "./Product.js";

export type Offer = {
	product: Product;
	dataSource: DataSource;
	pricePln: number | null;
	description: string | null;
	imageUrl: string | null;
	referenceUrl: string | null;
};
