import { Matrix, pseudoInverse } from "ml-matrix";
import { day2date, fill } from "./definitions";
import erf from "math-erf";

const { PI, ceil, exp, pow, sqrt, SQRT2 } = Math;
const sqr = x => pow(x, 2);
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
		beta0: guess,
		f:     ([a, b, c]) => t => -(a * (t - b) * exp(-sqr(b - t) / (2 * sqr(c)))) / sqr(c),
		tMax:  ([, b]) => 2 * b - 6
	},
	gauss: {
		beta0: guess,
		f:     ([a, b, c]) => t => a * exp(-sqr(t - b) / (2 * sqr(c))),
		tMax:  ([, b]) => 2 * b - 6
	},
	integral: {
		beta0: data => {
			const ret = guess(data);

			return [ret[0] / 10, ret[1], ret[2], ret[0]];
		},
		f:    ([a, b, c, d]) => t => d - SQRTPI2 * a * c * erf((b - t) / (SQRT2 * c)),
		tMax: ([, b]) => 2 * b - 6
	}
};

export function gauss(data, model, ita) {
	const colors = ["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040", "#202020", "#000000"];
	const d = 0.01;
	const dd = d * 2;
	const fs = [];
	const m = models[model];
	const ret = [];
	const rounds = 8;
	const t = data.map(([t]) => t);

	let beta = m.beta0(data);
	let tMax = 0;

	const rows = data.length;
	const cols = beta.length;

	console.log("records", data);

	for(let s = 0; s < rounds; ++s) {
		const f = m.f(beta);
		const tmax = ceil(m.tMax(beta));

		if(tmax > tMax) tMax = tmax;
		fs[s] = f;

		const r = Matrix.columnVector(data.map(([t, y]) => y - f(t)));
		const Jrjs = [];

		console.log(`beta${s}`, beta);
		console.log(`r${s}`, r);
		console.log(
			`Sr2${s}`,
			r.data.map(e => e[0]).reduce((t, e) => t + sqr(e), 0)
		);

		for(let i = 0; i < rows; ++i) {
			const row = [];

			for(let j = 0; j < cols; ++j) {
				const beta1 = [...beta];
				const beta2 = [...beta];

				beta1[j] = beta[j] - d;
				beta2[j] = beta[j] + d;

				const fbeta1 = m.f(beta1);
				const fbeta2 = m.f(beta2);

				row.push((fbeta1(t[i]) - fbeta2(t[i])) / dd);
			}

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

	// if(model === "integral") ret.shift();

	return ret;
}
