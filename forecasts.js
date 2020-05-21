const { Matrix, inverse } = require("ml-matrix");
const { parentPort, workerData } = require("worker_threads");
const regression = require("regression");
// eslint-disable-next-line no-native-reassign
require = require("esm")(module);
const { models, stats } = require("./client/src/schema");

const { abs } = Math;

const exit = {};
const infinite = 1e60;
const rounds = 30000;
const schema = workerData;

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
	const length = data.length - 7;
	const mArray = [];
	let mMax = 0;
	let tmMax;

	for(let i = 0; i < length; ++i) {
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

	return [mMax, tmMax, data[tmMax][1] / mMax, data[tmMax][1]];
}

models.normal.beta0 = data => {
	const ret = guessBetaPDF(data);
	const a = (ret[0] / 3) * 2;
	const b = (ret[1] / 3) * 2;

	return [a, b, 20, 2];
};

models.integral.beta0 = data => {
	const pdf = guessBetaPDF(data);
	const ret = guessBetaCDF(data);
	const a = Math.max(ret[3] * 2, pdf[0]);
	const b = (ret[1] / 3) * 2;
	const c = (ret[2] * 3) / 2;

	return [a, b, c, 2];
};

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
			[0, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 2, 3, 5, 7, 10, 20, 30, 50, 70, 100].forEach(lambda => {
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
			parentPort.postMessage({ error: "can't find better", region, city, stat, s });
			return beta;
		}

		if(abs(prevSr2 - bestSr2) / bestSr2 < 0.000001) return beta;

		prevSr2 = bestSr2;
	}

	parentPort.postMessage({ error: "too many steps", region, city, stat });
	return beta;
}

schema.forEach((data, region) =>
	Object.entries(data).forEach(([city, data]) =>
		Object.entries(data.recordset)
			.filter(([stat]) => stats[stat].model)
			.forEach(([stat, data]) => {
				const begin = new Date().getTime();

				schema[region][city].forecasts[stat] = distributions(
					data.map((e, i) => [i, e]),
					stat,
					region,
					city
				);
				parentPort.postMessage({ region, city, stat, time: new Date().getTime() - begin });
			})
	)
);

parentPort.postMessage({ schema });
