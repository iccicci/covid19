import { writeFile } from "fs";
import { registerForecastsHandle } from "./src/forecasts.js";
import { schema, stats } from "./src/schema";

const missing = [];
const precalc = {};
const sort = ["healed", "deceased", "cases"];
const sorted = Object.keys(stats).sort((a, b) => {
	a = sort.indexOf(a);
	b = sort.indexOf(b);

	if(a > b) return -1;
	if(a < b) return 1;
	return 0;
});

sorted.forEach(e => (precalc[e] = {}));

function register(region, city) {
	const done = () => {
		//console.log(JSON.stringify(precalc, null, "\t"));
		console.log(missing);
		writeFile("./src/precalc.js", `export const precalc= ${JSON.stringify(precalc, null, "\t")}`, () => {});
	};

	const forecasts = () => {
		const { forecasts } = schema[region][city];

		Object.keys(forecasts).forEach(stat => {
			if(! forecasts[stat].model) return missing.push({ city, region, stat });

			if(! precalc[stat][region]) precalc[stat][region] = {};

			precalc[stat][region][city] = forecasts[stat].model.beta;
		});

		if(region === 21 && city === 21) done();
	};

	registerForecastsHandle(region, city, forecasts);
}

for(let r = 0; r < 22; ++r) for(let c = 0; c < 220; ++c) register(r, c);
