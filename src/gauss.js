import { Matrix, pseudoInverse } from "ml-matrix";
import { day2date, fill, prociv, stats } from "./definitions";
import erf from "math-erf";

const { PI, ceil, exp, sqrt, SQRT2 } = Math;
const SQRTPI2 = sqrt(PI / 2);

function guess(data) {
	let a = 0;
	let b;

	data.map(([t, y]) => {
		if(y > a) {
			a = y;
			b = t;
		}
		return null;
	});

	return [a, b, 10];
}

const models = {
	derivate: {
		beta0: data => {
			const ret = guess(data);

			return [ret[0] * 10, 40, 10];
		},
		d: [
			([, b, c]) => t => ((t - b) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c ** 2,
			([a, b, c]) => t => (a * exp(-((t - b) ** 2 / (2 * c ** 2))) * (b ** 2 - 2 * b * t - c ** 2 + t ** 2)) / c ** 4,
			([a, b, c]) => t => (a * (t - b) * exp(-((t - b) ** 2 / (2 * c ** 2))) * (b ** 2 - 2 * b * t - 2 * c ** 2 + t ** 2)) / c ** 5
		],
		f:    ([a, b, c]) => t => (-a * (t - b) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c ** 2,
		tMax: ([, b]) => 2 * b - 6
	},
	gauss: {
		beta0: guess,
		d:     [
			([, b, c]) => t => -exp(-((t - b) ** 2 / (2 * c ** 2))),
			([a, b, c]) => t => -(((a * 4) / (2 * c ** 2) ** 2) * (t - b) * c ** 2 * exp(-((t - b) ** 2 / (2 * c ** 2)))),
			([a, b, c]) => t => -(((a * 4) / (2 * c ** 2) ** 2) * (t - b) ** 2 * c * exp(-((t - b) ** 2 / (2 * c ** 2))))
		],
		f:    ([a, b, c]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)),
		tMax: ([, b]) => 2 * b - 6
	},
	integral: {
		beta0: data => {
			const ret = guess(data);

			return [ret[0] / 10, ret[1], ret[2], ret[0]];
		},
		d: [
			([, b, c]) => t => SQRTPI2 * c * erf((b - t) / (SQRT2 * c)),
			([a, b, c]) => t => a * exp(-((b - t) ** 2) / (2 * c ** 2)),
			([a, b, c]) => t => SQRTPI2 * a * erf((b - t) / (SQRT2 * c)) - (a * (b - t) * exp(-((b - t) ** 2) / (2 * c ** 2))) / c,
			() => () => -1
		],
		f:    ([a, b, c, d]) => t => d - SQRTPI2 * a * c * erf((b - t) / (SQRT2 * c)),
		tMax: ([, b]) => 2 * b - 6
	}
};

export function gauss(data, stat, region, city) {
	if(stat === "a" && region === 2) throw new Error("Exclude home Aosta");
	if(stat === "s" && region === 17) throw new Error("Exclude symptoms Basilicata");
	if(city === 59) throw new Error("Exclude Latina");
	if(city === 80) throw new Error("Exclude Reggio Calabria");

	const fs = [];
	const m = models[stats[stat].model];
	const rounds = 8;
	const t = data.map(([t]) => t);

	let beta = m.beta0(data);
	let tMax = 0;
	//let Srp = 1e20;
	//let Sr2p = 1e20;

	const rows = data.length;
	const cols = beta.length;

	for(let s = 0; s < rounds; ++s) {
		const f = m.f(beta);
		const tmax = ceil(m.tMax(beta));

		if(tmax > tMax) tMax = tmax;
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

		const d = [];

		for(let j = 0; j < cols; ++j) d[j] = m.d[j](beta);

		for(let i = 0; i < rows; ++i) {
			const row = [];

			for(let j = 0; j < cols; ++j) row.push(d[j](t[i]));

			Jrjs.push(row);
		}

		const Jr = new Matrix(Jrjs);

		//console.log(`Jr${s}`, Jr);

		const Beta = Matrix.sub(Matrix.columnVector(beta), pseudoInverse(Jr).mmul(r));

		beta = Beta.data.map(e => e[0]);

		if(beta[1] < 0) throw new Error("Negative peak");
		if(beta[1] > 1000) throw new Error("Lost peak");
	}

	return { fs, tMax };
}

export function gaussChart(data, stat, region, city, language) {
	const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];
	const ret = [];
	const { fs, tMax } = gauss(data, stat, region, city);

	fill(tMax);

	/*
	for(let s = 0; s < rounds; ++s) {
		const dataPoints = [];
		let f = fs[s];

		for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

		ret.push({ color: colors[s], dataPoints, legendText: `s: ${s}` });
	}
	*/

	const dataPoints = [];
	let f = fs[7];

	for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: Math.round(f(t)) });

	ret.push({ color: colors[7], dataPoints, legendText: language === "i" ? "proiezione" : "forecast" });

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
	const t = prociv[0].data.map((e, i) => i).filter((e, i) => i > 5);

	let beta = [];
	let tMax = 0;
	let Srp = 1e20;
	let Sr2p = 1e20;

	console.log("base", base);
	console.log("t", t);

	Object.entries(functions).forEach(([s, fun]) => {
		const data = prociv[0].data.map((e, i) => [i, e[s]]).filter((e, i) => i > 5);
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

		//		if(r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0) > 1e20) throw new Error("Sr2");

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
	fill(tMax);

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
			dataPoints: prociv[0].data
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
