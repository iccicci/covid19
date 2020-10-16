const { parentPort, workerData } = require("worker_threads");
// eslint-disable-next-line no-native-reassign
require = require("esm")(module);
const { distributions } = require("./client/src/forecasts");
const { stats } = require("./client/src/schema");

const schema = workerData;

try {
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
						city,
						data => parentPort.postMessage(data),
						schema[region][city].forecasts[stat]
					);
					parentPort.postMessage({ region, city, stat, time: new Date().getTime() - begin });
				})
		)
	);
} catch(e) {}

parentPort.postMessage({ schema });
