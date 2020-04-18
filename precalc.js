import { writeFile } from "fs";
import { distributions, registerForecastsHandle } from "./src/forecasts.js";
import { getData, schema, stats } from "./src/schema";

const missing = [];
const precalc = {};

Object.keys(stats)
	.filter(stat => {
		if(stat === "change") return false;
		if(stat === "new") return false;
		if(stat === "tests") return false;

		return true;
	})
	.forEach(e => (precalc[e] = {}));

function register(region, city) {
	const done = () => {
		console.log(missing);
		writeFile("./src/precalc.js", `export const precalc= ${JSON.stringify(precalc, null, "\t")}`, () => {});
	};

	const retry = (stat, beta0) => {
		const aStep = beta0[0] / 10;
		const aStop = beta0[0] * 2.05;
		const data = getData(stat, region, city);

		if(region !== 0 || city !== 0 || stat !== "healed") return;
		console.log("retry", stat, region, city);

		for(let a = beta0[0] * .7; a < aStop; a += aStep) {
			for(let b = 15; b < 60; ++b) {
				for(let c = 5; c < 80; ++c) {
					for(let d = -5; d < 20; ++d) {
						const [{ beta, error }] = distributions(data, "skew", stat, region, city, [a, b, c, d]);

						if(! error) return (precalc[stat][region][city] = [beta, [a, b, c, d]]);
					}
				}
			}
		}
		console.log("still missing", stat, region, city);
	};

	const forecasts = () => {
		const { forecasts } = schema[region][city];

		Object.keys(forecasts).forEach(stat => {
			if(["change", "new", "tests"].indexOf(stat) !== -1) return;

			const { skew } = forecasts[stat].model;
			let error = true;
			let i;

			for(i = 0; i < skew.length && error; ++i) if(! skew[i].error) error = false;
			if(! precalc[stat][region]) precalc[stat][region] = {};
			if(! error) return (precalc[stat][region][city] = [skew[i - 1].beta, skew[0].beta0]);

			if(! skew[0]) return console.log("obbe", stat, region, city);

			retry(stat, skew[0].beta0);

			missing.push({ city, region, stat });
		});

		if(region === 21 && city === 21) done();
	};

	registerForecastsHandle(region, city, forecasts);
}

for(let r = 0; r < 22; ++r) for(let c = 0; c < 220; ++c) register(r, c);
