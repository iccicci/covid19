import { Matrix, inverse } from "ml-matrix";
import { checkExclude, day2date, getData, registerSchemaHandle, stats, schema } from "./schema";
import { T } from "owen-s-t-function";
import erf from "math-erf";
import regression from "regression";

const { abs, exp, round, SQRT2 } = Math;
const regressionsHandles = {};
const regressionsHandlesMap = [];

export const tMax = 120;

let lastDay;

function roundBeta(beta) {
	return beta.map(e => Math.round(e * 1000) / 1000);
}

function guessBetaPDF(data) {
	let yMax = 0;
	let tyMax;

	data.map(([t, y]) => {
		if(y > yMax) {
			yMax = y;
			tyMax = t;
		}
		return null;
	});

	return [yMax, tyMax, 10];
}

function guessBetaCDF(data) {
	const mArray = [];
	let mMax = 0;
	let tmMax;

	for(let i = 6; i < lastDay - 5; ++i) {
		const res = regression.linear(
			data.filter(([day]) => day >= i && day < i + 7),
			{ precision: 3 }
		);

		const m = (mArray[i + 3] = res.equation[0]);
		if(m > mMax) {
			mMax = m;
			tmMax = i + 3;
		}
	}

	return [mMax, tmMax, data[tmMax - 6][1] / mMax, data[tmMax - 6][1]];
}

const models = {
	derivate: {
		beta0: data => {
			const ret = guessBetaPDF(data);

			return [ret[0] * 10, 40, 10];
		},
		f: ([a, b, c]) => t => (-a * (t - b) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c ** 2
	},
	normal: {
		beta0: data => {
			const ret = guessBetaPDF(data);
			const a = (ret[0] / 3) * 2;
			const b = (ret[1] / 3) * 2;

			return [a, b, 20, 2];
		},
		f: ([a, b, c, d]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)) * (1 + erf((d * (t - b)) / c / SQRT2))
	},
	integral: {
		beta0: data => {
			const pdf = guessBetaPDF(data);
			const ret = guessBetaCDF(data);
			const a = Math.max(ret[3] * 2, pdf[0]);
			const b = (ret[1] / 3) * 2;
			const c = (ret[2] * 3) / 2;

			return [a, b, c, 2];
		},
		f: ([a, b, c, d]) => t => a * ((1 + erf((t - b) / c / SQRT2)) / 2 - 2 * T((t - b) / c, d))
	}
};

const infinite = 1e60;
const rounds = 21000;
const exit = {};

function distributions(data, stat, region, city) {
	const m = models[stats[stat].model];
	const t = data.map(([t]) => t);
	const beta0 = m.beta0(data);
	const func = m.f;

	let beta = beta0;
	let fs;
	let prevSr2 = infinite;

	fs = [];

	const rows = data.length;
	const cols = beta.length;
	const D = Matrix.eye(cols, cols);
	const I = Matrix.eye(cols, cols);

	for(let s = 0; s < rounds; ++s) {
		const f = func(beta);

		fs[s] = f;

		const r = Matrix.columnVector(data.map(([t, y]) => y - f(t)));
		const Jrjs = [];

		for(let i = 0; i < rows; ++i) {
			const row = [];

			for(let j = 0; j < cols; ++j) {
				const beta1 = [...beta];
				const beta2 = [...beta];

				beta1[j] -= 0.0001;
				beta2[j] += 0.0001;

				row.push((func(beta1)(t[i]) - func(beta2)(t[i])) / 0.0002);
			}

			Jrjs.push(row);
		}

		let bestSr2 = infinite;
		let ex;

		const Beta = Matrix.columnVector(beta);
		const Jr = new Matrix(Jrjs);
		const JrT = Jr.transpose();
		const JrT_Jr = JrT.mmul(Jr);
		const JrT_r = JrT.mmul(r);

		beta.forEach((e, i) => (D.data[i][i] = JrT_Jr.data[i][i]));

		// eslint-disable-next-line no-loop-func
		[false, true].forEach(diagonal =>
			[0, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 2, 3, 5, 7, 10].forEach(lambda => {
				try {
					const LevenbergMarquardt = Matrix.add(JrT_Jr, Matrix.mul(diagonal ? D : I, lambda));
					const nextBeta = Matrix.sub(Beta, inverse(LevenbergMarquardt).mmul(JrT_r)).data.map(e => e[0]);
					const f = func(nextBeta);
					const Sr2 = data.reduce((s, [t, y]) => s + (y - f(t)) ** 2, 0);

					if(Sr2 < bestSr2) {
						bestSr2 = Sr2;
						beta = nextBeta;
						ex = `${diagonal} ${lambda}`;
					}
				} catch(e) {}
			})
		);

		if(! exit[ex]) exit[ex] = 0;
		exit[ex]++;

		if(bestSr2 === infinite) {
			console.log("aih aih aih");
			return { beta: roundBeta(beta), beta0: roundBeta(beta0), fs };
		}

		if(abs(prevSr2 - bestSr2) / bestSr2 < 0.001) return { beta: roundBeta(beta), beta0: roundBeta(beta0), fs };

		prevSr2 = bestSr2;
	}
}

const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];

function distributionsChart(data, stat, region, city) {
	const chart = [];
	const model = {};

	const { beta, beta0, fs } = distributions(data, stat, region, city);

	model.f = fs[fs.length - 1];
	model.skew = [];
	model.skew.push({ beta, beta0 });

	if(checkExclude) {
		for(let s = 0; s < 8; ++s) {
			const dataPoints = [];
			let f = fs[round(((fs.length - 1) * s) / 8)];

			for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

			chart.push({ color: colors[s], dataPoints, legendText: `s: ${round(((fs.length - 1) * s) / 8)}`, legend: () => null });
		}

		return { chart, model };
	}

	const dataPoints = [];
	const { f } = model;

	for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: Math.round(f(t)) });

	const line = { color: stat === "deceased" ? "#606060" : "#000000", dataPoints };

	line.legend = language => (line.legendText = language === "i" ? "proiezione" : "forecast");

	return { chart: [line], model };
}

export function registerForecastsHandle(region, city, handle) {
	const key = Math.random();

	if(schema[region] && schema[region][city].forecasts.cases) handle();
	if(! regressionsHandlesMap[region]) regressionsHandlesMap[region] = {};
	if(! regressionsHandlesMap[region][city]) regressionsHandlesMap[region][city] = {};
	regressionsHandlesMap[region][city][key] = handle;
	regressionsHandles[key] = { city, region };

	return key;
}

export function unregisterForecastsHandle(key) {
	const { city, region } = regressionsHandles[key];

	delete regressionsHandlesMap[region][city][key];
	delete regressionsHandles[key];
}

function calculateForecasts(region, entry, entries, statId) {
	if(entry === entries.length) {
		region++;

		if(region === schema.length) return console.log(exit);

		return calculateForecasts(region, 0, Object.entries(schema[region]), 0);
	}

	const city = entries[entry][0];
	const stat = Object.keys(stats)[statId];

	if(stat === "cases" || city === "0") {
		const data = getData(stat, region, city);
		const { chart, model } = distributionsChart(data, stat, region, city);

		schema[region][city].forecasts[stat] = { chart, data, model };
	}

	if(statId !== Object.keys(stats).length - 1) return setTimeout(() => calculateForecasts(region, entry, entries, statId + 1), 10);

	const handles = (entries, i) => {
		if(i === entries.length) return;

		if(entries[i][0] in regressionsHandlesMap[region][city]) entries[i][1]();

		setTimeout(() => handles(entries, i + 1), 10);
	};

	if(regressionsHandlesMap[region] && regressionsHandlesMap[region][city]) handles(Object.entries(regressionsHandlesMap[region][city]), 0);

	setTimeout(() => calculateForecasts(region, entry + 1, entries, 0), 10);
}

registerSchemaHandle(() => {
	const arr = schema[0][0].recordset.cases;

	lastDay = arr.lastIndexOf(arr.slice(-1)[0]);

	setTimeout(() => calculateForecasts(0, 0, Object.entries(schema[0]), 0), 50);
});
