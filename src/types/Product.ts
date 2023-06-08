import type {Brand} from "./Brand.js";
import type {Category} from "./Category.js";
import type {Ingredient} from "./Ingredient.js";

export type Product = {
	slug: string;

	massKilograms: number | null;

	volumeLiters: number | null;

	name: string | null;

	brand: Brand | null;

	categories: Category[] | null;

	ingredients: Ingredient[] | null;
};
