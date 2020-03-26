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

			return [ret[0] / 10, ret[1], ret[2], ret[0] * 2];
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

export function gauss(data, model, ita) {
	const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];
	const fs = [];
	const m = models[model];
	const ret = [];
	const rounds = 8;
	const t = data.map(([t]) => t);

	let beta = m.beta0(data);
	let tMax = 0;
	let Srp = 1e20;
	let Sr2p = 1e20;

	const rows = data.length;
	const cols = beta.length;

	for(let s = 0; s < rounds; ++s) {
		const f = m.f(beta);
		const tmax = ceil(m.tMax(beta));

		if(tmax > tMax) tMax = tmax;
		if(tMax > 100) tMax = 100;
		fs[s] = f;

		const r = Matrix.columnVector(data.map(([t, y]) => y - f(t)));
		const Jrjs = [];
		const Sr = r.data.map(e => e[0]).reduce((t, e) => t + e, 0);
		const Sr2 = r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0);

		console.log(`beta${s}`, beta);
		console.log(`r${s}`, r);
		console.log(`Sr${s}`, Sr, Srp - Sr);
		console.log(`Sr2${s}`, Sr2, Sr2p - Sr2);

		Srp = Sr;
		Sr2p = Sr2;

		if(r.data.map(e => e[0]).reduce((t, e) => t + e ** 2, 0) > 1e20) throw new Error("Sr2");

		const d = [];

		for(let j = 0; j < cols; ++j) d[j] = m.d[j](beta);

		for(let i = 0; i < rows; ++i) {
			const row = [];

			for(let j = 0; j < cols; ++j) row.push(d[j](t[i]));

			Jrjs.push(row);
		}

		const Jr = new Matrix(Jrjs);

		console.log(`Jr${s}`, Jr);

		const Beta = Matrix.sub(Matrix.columnVector(beta), pseudoInverse(Jr).mmul(r));

		beta = Beta.data.map(e => e[0]);
	}

	fill(tMax);

	for(let s = 0; s < rounds; ++s) {
		const dataPoints = [];
		let f = fs[s];

		for(let t = 6; t <= tMax; ++t) dataPoints.push({ x: day2date[t], y: f(t) });

		ret.push({ color: colors[s], dataPoints, legendText: `s: ${s}` });
	}

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

export function gauss2(ita) {
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

	base.forEach(s => (beta = [...beta, ...lines[s].beta]));

	for(let step = 0; step < steps; ++step) {
		const Step = step;

		fs[step] = {};

		// eslint-disable-next-line no-loop-func
		base.forEach(s => {
			const line = lines[s];
			const tmax = ceil(line.m.tMax(line.beta));

			fs[step][s] = line.f = line.m.f(line.beta);

			if(tmax > tMax) tMax = tmax;
		});

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

					for(let j = 0; j < colL.beta.length; ++j) row.push(rowL === colL ? d[colS][j](t[i]) : 0);
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

	for(let step = 1; step < steps; ++step) {
		// eslint-disable-next-line no-loop-func
		Object.keys(functions).forEach(s => {
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

	return ret;
}
