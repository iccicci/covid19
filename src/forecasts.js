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

const regressions = [
	{ filter: () => 1, func: "linear", legend: { i: "lineare", e: "linear" }, order: {} },
	{ filter: e => e[1], func: "exponential", legend: { i: "esponenziale", e: "exponential" }, order: {} },
	{ filter: e => e[1], func: "power", legend: { i: "potenza", e: "power" }, order: {} },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 2°", e: "polynomial 2rd" }, order: { order: 2 } },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 3°", e: "polynomial 3rd" }, order: { order: 3 } }
];

let lastDay;

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

	if(verbose) console.log("mmax", mMax, "t mmax", tmMax, "y mmax", data[tmMax - 6]);

	return [[mMax, tmMax, data[tmMax - 6][1] / mMax, data[tmMax - 6][1]]];
}

const models = {
	derivate: {
		beta0: data => {
			const ret = guessBetaPDF(data);

			return [[ret[0] * 10, 40, 10]];
		},
		f:    ([a, b, c]) => t => (-a * (t - b) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c ** 2,
		tMax: ([, b]) => 2 * b - 6
	},
	gauss: {
		beta2: data => {
			const ret = guessBetaPDF(data);

			return [[(ret[0] / 3) * 2, (ret[1] / 3) * 2, 20, 2]];
		},
		beta0: data => [guessBetaPDF(data)],
		f2:    ([a, b, c, d]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)) * (1 + erf((d * (t - b)) / c / SQRT2)),
		f:     ([a, b, c]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)),
		tMax:  ([, b]) => 2 * b - 6
	},
	integral: {
		beta2: data => {
			const ret = guessBetaCDF(data)[0];

			return [[ret[3] * 2, (ret[1] / 3) * 2, (ret[2] * 3) / 2, 2]];
		},
		beta0: guessBetaCDF,
		f2:    ([a, b, c, d]) => t => a * ((1 + erf((t - b) / c / SQRT2)) / 2 - 2 * T((t - b) / c, d)),
		f:     ([a, b, c, d]) => t => d - SQRTPI2 * a * c * erf((b - t) / (SQRT2 * c)),
		tMax:  ([, b]) => 2 * b - 6
	}
};

const rounds = 8;

export function gauss(data, stat, region, city) {
	if(! checkExclude) {
		if(region === 11 && stat === "symptoms") throw new Error("Exclude symptoms Marche");
		if(region === 15 && stat === "home") throw new Error("Exclude home  Campania");
	}

	const m = models[stats[stat].model];
	const t = data.map(([t]) => t);
	const beta0 = m.beta0(data);

	verbose = city === "-" && region === 3;
	if(verbose) console.log("region", region, "city", city, schema[region][0].name);

	let betas = m.beta0(data);
	//let Srp = 1e20;
	//let Sr2p = 1e20;

	if(city === "98") betas = [[70, 20, 20, 900]];

	for(let beta of betas) {
		const fs = [];
		const rows = data.length;
		const cols = beta.length;

		if(verbose) console.log("beta0", beta);

		try {
			for(let s = 0; s < rounds; ++s) {
				const f = m.f(beta);

				fs[s] = f;

				const r = Matrix.columnVector(data.map(([t, y]) => y - f(t)));
				const Jrjs = [];
				//const Sr = r.data.map(e => e[0]).reduce((t, e) => t + e, 0);
				//const Sr2 = r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0);

				//console.log(`beta${s}`, beta);
				//console.log(`r${s}`, r);
				//console.log(`Sr${s}`, Sr, Srp - Sr);
				//console.log(`Sr2${s}`, Sr2, Sr2p - Sr2);

				//Srp = Sr;
				//Sr2p = Sr2;

				if(r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0) > 1e20) throw new Error("Sr2");

				for(let i = 0; i < rows; ++i) {
					const row = [];

					for(let j = 0; j < cols; ++j) {
						const beta1 = [...beta];
						const beta2 = [...beta];

						beta1[j] -= 0.0001;
						beta2[j] += 0.0001;

						row.push((m.f(beta1)(t[i]) - m.f(beta2)(t[i])) / 0.0002);
					}

					Jrjs.push(row);
				}

				const Jr = new Matrix(Jrjs);

				//console.log(`Jr${s}`, Jr);

				const Beta = Matrix.sub(Matrix.columnVector(beta), pseudoInverse(Jr).mmul(r));

				beta = Beta.data.map(e => e[0]);

				if(beta[0] < 0) throw new Error("Negative variance");
				if(beta[1] < 0) throw new Error("Negative peak");
				if(beta[1] > 1000) throw new Error("Lost peak");
			}

			if(verbose) {
				console.log(
					"beta",
					beta.map(e => Math.round(e * 100) / 100)
				);
			}

			return { beta: beta.map(e => Math.round(e * 100) / 100), beta0, fs, tMax: city === "98" ? 80 : ceil(m.tMax(beta)) };
		} catch(e) {
			if(verbose) console.log(e.message);
		}
	}

	throw new Error("no");
}

export function gaussChart(data, stat, region, city) {
	const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];
	const ret = [];
	const { beta, beta0, fs, tMax } = gauss(data, stat, region, city);

	/*
	for(let s = 0; s < rounds; ++s) {
		const dataPoints = [];
		let f = fs[s];

		for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

		ret.push({ color: colors[s], dataPoints, legendText: `s: ${s}`, legend: () => null });
	}

	return ret;
	*/

	const dataPoints = [];
	let f = fs[7];

	for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: Math.round(f(t)) });

	const line = { beta, beta0, color: stat === "deceased" ? "#606060" : colors[7], dataPoints };

	line.legend = language => (line.legendText = language === "i" ? "proiezione" : "forecast");

	ret.push(line);

	return ret;
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
		model: "gauss"
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
		gauss(data, "integral");
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

		let chart;
		let model;

		if(stats[stat].model) {
			try {
				const { beta, beta0, fs, tMax } = gauss(data, stat, region, city);
				chart = gaussChart(data, stat, region, city);
				model = { beta, beta0, f: fs[7], tMax };
			} catch(e) {}
		}

		if(! chart) {
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
