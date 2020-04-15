import { Matrix, pseudoInverse } from "ml-matrix";
import { checkExclude, day2date, getData, registerSchemaHandle, stats, schema } from "./schema";
import { T } from "owen-s-t-function";
import erf from "math-erf";
import regression from "regression";

const { PI, ceil, exp, sqrt, SQRT2 } = Math;
const SQRTPI2 = sqrt(PI / 2);
const regressionsHandles = {};
const regressionsHandlesMap = [];
const regressionColors = ["#000000", "#505050", "#a0a0a0"];

export const tMax = 120;

const regressions = [
	{ filter: () => 1, func: "linear", legend: { i: "lineare", e: "linear" }, order: {} },
	{ filter: e => e[1], func: "exponential", legend: { i: "esponenziale", e: "exponential" }, order: {} },
	{ filter: e => e[1], func: "power", legend: { i: "potenza", e: "power" }, order: {} },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 2°", e: "polynomial 2rd" }, order: { order: 2 } },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 3°", e: "polynomial 3rd" }, order: { order: 3 } }
];

let lastDay;

function roundBeta(beta) {
	return beta.map(e => Math.round(e * 1000) / 1000);
}

function logBeta(beta, step) {
	console.log("beta" + step, roundBeta(beta));
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

	return [[yMax, tyMax, 10]];
}

let verbose;

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

	if(verbose) console.log("mmax", mMax, "t mmax", tmMax, "y mmax", data[tmMax - 6][1]);

	return [[mMax, tmMax, data[tmMax - 6][1] / mMax, data[tmMax - 6][1]]];
}

const models = {
	derivate: {
		normal: {
			beta0: data => {
				const ret = guessBetaPDF(data)[0];

				return [[ret[0] * 10, 40, 10]];
			},
			f: ([a, b, c]) => t => (-a * (t - b) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c ** 2
		}
	},
	normal: {
		normal: {
			beta0: guessBetaPDF,
			f:     ([a, b, c]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2))
		},
		skew: {
			beta0: data => {
				const ret = guessBetaPDF(data)[0];
				const a = (ret[0] / 3) * 2;
				const b = (ret[1] / 3) * 2;

				return [[a, b, 20, 2], [a / 2 * 3, b, 20, 2]];
			},
			f: ([a, b, c, d]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)) * (1 + erf((d * (t - b)) / c / SQRT2))
		}
	},
	integral: {
		normal: {
			beta0: guessBetaCDF,
			f:     ([a, b, c, d]) => t => d - SQRTPI2 * a * c * erf((b - t) / (SQRT2 * c))
		},
		skew: {
			beta0: data => {
				const pdf = guessBetaPDF(data)[0];
				const ret = guessBetaCDF(data)[0];
				const a = Math.max(ret[3] * 2, pdf[0]);
				const b = (ret[1] / 3) * 2;
				const c = (ret[2] * 3) / 2;

				return [
					[a, b, c, 2],
					[a, (b * 3) / 2, c, 2],
					[a, (b * 4) / 3, c, 2]
				];
			},
			f: ([a, b, c, d]) => t => a * ((1 + erf((t - b) / c / SQRT2)) / 2 - 2 * T((t - b) / c, d))
		}
	}
};

const rounds = 8;

function distributions(data, distribution, stat, region, city) {
	if(! checkExclude) {
		if(region === 11 && stat === "healed") return { error: "Exclude symptoms Marche" };
		if(region === 11 && stat === "healed") return { error: "Exclude symptoms Marche" };
	}

	//verbose = city === "0" && region === 11 && stat === "healed";
	//verbose = city === "0" && region === 9 && stat === "healed";
	//verbose = city === "0" && (region === 0 || region === 9) && stat === "healed";
	//verbose = city === "0" && region === 0 && stat === "cases";

	if(verbose) console.log("region", region, "city", city, schema[region][0].name, stat);

	const m = models[stats[stat].model];
	const t = data.map(([t]) => t);
	const beta0 = m[distribution].beta0(data);
	const func = m[distribution].f;
	const ret = [];

	let beta;
	let betas = [...beta0];
	let error = true;
	let fs;
	//let Srp = 1e20;
	//let Sr2p = 1e20;

	if(city === "98") betas = [[70, 20, 20, 900]];

	for(let l = 0; l < betas.length && error; ++l) {
		beta = betas[l];
		error = false;
		fs = [];

		const rows = data.length;
		const cols = beta.length;

		if(verbose) console.log("beta0", beta);

		for(let s = 0; s < rounds && ! error; ++s) {
			const f = func(beta);

			fs[s] = f;

			const r = Matrix.columnVector(data.map(([t, y]) => y - f(t)));
			const Jrjs = [];

			if(r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0) > 1e20) error = "Sr2";

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

			beta = Matrix.sub(Matrix.columnVector(beta), pseudoInverse(new Matrix(Jrjs)).mmul(r)).data.map(e => e[0]);

			if(verbose) logBeta(beta, s + 1);
			if(beta[0] < 0) error = "Negative a";
			if(stats[stat].model === "integral" && beta[3] < -5) error = "Negative d";
			if(beta[1] < 0) error = "Negative peak";
			if(beta[1] > 1000) error = "Lost peak";
			if(beta[2] < 0) error = "Negative variance";
			if(beta[2] > 1000) error = "Lost variance";
		}

		if(verbose && error) console.log(error);

		ret.push({ beta: roundBeta(beta), beta0: roundBeta(beta0[l]), error, fs });
	}

	return ret;
}

const distributionAttempts = [
	["skew", true],
	["skew", false],
	["normal", true],
	["normal", false]
];

const colors = {
	normal: [["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"]],
	skew:   [
		["#e07070", "#c06060", "#a05050", "#804040", "#603030", "#402020", "#201010", "#000000"],
		["#70e070", "#60c060", "#50a050", "#408040", "#306030", "#204020", "#102010", "#000000"],
		["#7070e0", "#6060c0", "#5050a0", "#404080", "#303060", "#202040", "#101020", "#000000"]
	]
};

function distributionsChart(data, stat, region, city) {
	const chart = [];
	const model = {};

	for(let i = 0; i < distributionAttempts.length; ++i) {
		const [distribution, trick] = distributionAttempts[i];

		if(trick || ! models[stats[stat].model][distribution]) continue;

		const dists = distributions(data, distribution, stat, region, city);

		model[distribution] = [];

		for(let l = 0; l < dists.length; ++l) {
			const { beta, beta0, error, fs } = dists[l];

			model[distribution].push({ beta, beta0, error });

			if(checkExclude) {
				for(let s = 0; s < fs.length; ++s) {
					const dataPoints = [];
					let f = fs[s];

					for(let t = 6; t <= tMax && t <= 120; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

					chart.push({ color: colors[distribution][l][s], dataPoints, legendText: `s: ${s}`, legend: () => null });
				}
			}

			if(! error) {
				model.f = fs[rounds - 1];

				if(! checkExclude) {
					const dataPoints = [];
					const { f } = model;

					for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: Math.round(f(t)) });

					const line = { color: stat === "deceased" ? "#606060" : "#000000", dataPoints };

					line.legend = language => (line.legendText = language === "i" ? "proiezione" : "forecast");

					chart.push(line);

					return { chart: [line], error, model };
				}

				return { chart, error, model };
			}
		}
	}

	return checkExclude ? { chart, error: false, model } : { chart: [], error: true, model };
}

const functions = {
	c: {
		model: "integral",
		sum:   ["d", "h", "p"]
	},
	d: {
		model: "integral"
	},
	h: {
		model: "integral"
	},
	p: {
		model: "normal"
	}
};

const all = Object.keys(functions).sort();
// prettier-ignore
const base = Object.entries(functions).filter(([, fun]) => fun.model).map(e => e[0]).sort((a, b) => a < b);

export function gauss2() {
	const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];
	const fs = [];
	const lines = {};
	const ret = [];
	const steps = 8;
	//const t = prociv[0].data.map((e, i) => i).filter((e, i) => i > 5);
	const t = schema[0].data.map((e, i) => i).filter((e, i) => i > 5);

	let beta = [];
	let tMax = 0;
	let Srp = 1e20;
	let Sr2p = 1e20;

	console.log("base", base);
	console.log("t", t);

	Object.entries(functions).forEach(([s, fun]) => {
		//const data = prociv[0].data.map((e, i) => [i, e[s]]).filter((e, i) => i > 5);
		const data = schema[0].data.map((e, i) => [i, e[s]]).filter((e, i) => i > 5);
		const m = models[stats[s].model];
		const beta0 = m.beta0(data);
		const y = data.map(([, y]) => y);

		lines[s] = { y, ...(fun.model ? { beta: beta0, beta0, m } : { f: t => fun.sum.reduce((s, e) => s + lines[e].f(t), 0) }) };
	});

	console.log("lines", lines);

	//lines.c.beta = [5835.86718389771, 35.49198051859061, 9.839026388422745, 72249.91328194283];
	//lines.d.beta = [793.492725536609, 38.22902426656094, 9.371610992335139, 9314.43392498987];
	//lines.h.beta = [967.1909508825153, 38.48008062398988, 9.640194366150224, 11739.187989254617];
	//lines.p.beta = [78836.02556879247, 44.96390454109033, 11.492699545279464];

	//lines.h.beta = [4573.184326086097, 53.727936901024584, 10.900830977780688, 63696.486927000944];

	base.forEach(s => (beta = [...beta, ...lines[s].beta]));

	for(let step = 0; step < steps; ++step) {
		//const Step = step;

		fs[step] = {};

		// eslint-disable-next-line no-loop-func
		base.forEach(s => {
			const line = lines[s];
			const tmax = ceil(line.m.tMax(line.beta));

			fs[step][s] = line.f = line.m.f(line.beta);

			if(tmax > tMax) tMax = tmax;
		});

		//fs[step].h = t => fs[Step].c(t) - fs[Step].d(t) - fs[Step].p(t);

		/*
		Object.entries(functions)
			.filter(([, fun]) => fun.sum)
			.forEach(([s, { sum }]) => (fs[step][s] = lines.f = t => sum.reduce((s, e) => s + fs[Step][e](t), 0)));
			*/

		let rjs = [];

		// eslint-disable-next-line no-loop-func
		all.forEach(s => (rjs = [...rjs, ...t.map((t, i) => lines[s].y[i] - lines[s].f(t))]));

		const d = {};
		const r = Matrix.columnVector(rjs);
		const Jrjs = [];
		const Sr = r.data.map(e => e[0]).reduce((t, e) => t + e, 0);
		const Sr2 = r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0);

		console.log(`beta${step}`, beta);
		console.log(`r${step}`, r);
		console.log(`Sr${step}`, Sr, Srp - Sr);
		console.log(`Sr2${step}`, Sr2, Sr2p - Sr2);

		Srp = Sr;
		Sr2p = Sr2;

		//if(r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0) > 1e20) throw new Error("Sr2");

		base.forEach(s => {
			const line = lines[s];

			d[s] = [];
			for(let j = 0; j < line.beta.length; ++j) d[s][j] = line.m.d[j](line.beta);
		});

		// eslint-disable-next-line no-loop-func
		all.forEach(rowS => {
			const rowL = lines[rowS];

			for(let i = 0; i < t.length; ++i) {
				const row = [];

				// eslint-disable-next-line no-loop-func
				base.forEach(colS => {
					const colL = lines[colS];

					for(let j = 0; j < colL.beta.length; ++j) row.push((rowL === colL ? 1 : 0) * d[colS][j](t[i]));
				});

				Jrjs.push(row);
			}
		});

		console.log(Jrjs);

		const Jr = new Matrix(Jrjs);

		console.log(`Jr${step}`, Jr);
		console.log(`pseudoInverse(Jr${step})`, pseudoInverse(Jr));

		const Beta = Matrix.sub(Matrix.columnVector(beta), pseudoInverse(Jr).mmul(r));

		beta = Beta.data.map(e => e[0]);

		let i = 0;

		// eslint-disable-next-line no-loop-func
		base.forEach(s => {
			const line = lines[s];

			line.beta = [];
			line.beta0.forEach(() => line.beta.push(beta[i++]));
		});

		beta = Beta.data.map(e => e[0]);
	}

	console.log("tMax", tMax);
	if(tMax > 100) tMax = 100;

	for(let step = 0; step < steps; ++step) {
		// eslint-disable-next-line no-loop-func
		all.forEach(s => {
			const dataPoints = [];
			let f = fs[step][s];

			for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

			ret.push({ color: colors[step], dataPoints, legendText: `s: ${step}` });
		});
	}

	base.forEach(s =>
		ret.push({
			color:      stats[s].color,
			//dataPoints: prociv[0].data
			dataPoints: schema[0].data
				.map((e, i) => [i, e[s]])
				.filter((e, i) => i > 5)
				.map(e => ({ x: day2date[e[0]], y: e[1] })),
			legendText: stats[s].legend.i
		})
	);

	/*
	const data = [];
	for(let t = 6; t <= tMax; ++t) data.push([t, fs[7].h(t)]);
	console.log("prova", data);
	try {
		distributions(data, "integral");
	} catch(e) {}
	*/

	return ret;
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

function calculateForecasts(region, entry, entries) {
	if(entry === entries.length) {
		region++;

		if(region === schema.length) return;

		return calculateForecasts(region, 0, Object.entries(schema[region]));
	}

	const city = entries[entry][0];

	Object.keys(stats).forEach(stat => {
		if(stat !== "cases" && city !== "0") return;

		const data = getData(stat, region, city);

		let chart,
			error = true,
			model;

		/*
		if(stat === "healed" && schema[region][city].forecasts.cases.model.f && schema[region][city].forecasts.deceased.model.f) {
			const data2 = [...data];
			const offset = Math.max(schema[region][city].forecasts.cases.model.tMax, schema[region][city].forecasts.deceased.model.tMax) + 60;
			const y = schema[region][city].forecasts.cases.model.f(offset) - schema[region][city].forecasts.deceased.model.f(offset);

			for(let i = 0; i < 10; ++i) data2.push([offset + i, y]);

			//if(city === "0" && ! region) debugger;

			({ chart, error, model } = distributionsChart(data2, stat, region, city));
		} else if(stats[stat].model) ({ chart, error, model } = distributionsChart(data, stat, region, city));
		*/

		if(stats[stat].model) ({ chart, error, model } = distributionsChart(data, stat, region, city));

		if(error) {
			chart = regressions
				.map(f => {
					const res = regression[f.func](data.filter(f.filter), { ...f.order, precision: 3 });
					const { equation, points, predict, r2 } = res;

					for(let i = 1; i <= 7; ++i) points.push(predict(lastDay + i));

					const ret = { dataPoints: points.map(e => ({ x: day2date[e[0]], y: e[1] })), r2 };

					ret.legend = language => (ret.legendText = `${f.legend[language]} ${f.func === "power" ? equation[1] : ""} r2: ${r2}`);

					return ret;
				})
				.filter(e => ! isNaN(e.r2) && e.r2 > 0)
				.sort((a, b) => (a.r2 < b.r2 ? 1 : -1))
				.filter((e, i) => i < 3)
				.map((e, i) => {
					e.color = regressionColors[i];
					return e;
				})
				.reverse();
		}

		schema[region][city].forecasts[stat] = { chart, data, model };
	});

	const handles = (entries, i) => {
		if(i === entries.length) return;

		if(entries[i][0] in regressionsHandlesMap[region][city]) entries[i][1]();

		setTimeout(() => handles(entries, i + 1), 10);
	};

	if(regressionsHandlesMap[region] && regressionsHandlesMap[region][city]) handles(Object.entries(regressionsHandlesMap[region][city]), 0);

	setTimeout(() => calculateForecasts(region, entry + 1, entries), 10);
}

registerSchemaHandle(() => {
	const arr = schema[0][0].recordset.cases;

	lastDay = arr.lastIndexOf(arr.slice(-1)[0]);

	setTimeout(() => calculateForecasts(0, 0, Object.entries(schema[0])), 20);
});
