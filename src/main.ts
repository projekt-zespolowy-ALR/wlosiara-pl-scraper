import {App} from "./app/App.js";
import {WizazScraper} from "./scrapers/wizaz/WizazScraper.js";

const wizazScraper = new WizazScraper();
const app = new App([wizazScraper]);

await app.run();
