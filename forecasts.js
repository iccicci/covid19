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
					parentPort.postMessage({ region, city, name: schema[region][city].name, stat, time: new Date().getTime() - begin });
					if(Math.abs(schema[region][city].forecasts[stat][7]) - 250 > 200) parentPort.postMessage({ data: "strange b", name: schema[region][city].name });
					if(Math.abs(schema[region][city].forecasts[stat][7]) > 10000) parentPort.postMessage({ data: "really strange d", name: schema[region][city].name });
					else if(Math.abs(schema[region][city].forecasts[stat][7]) > 100) parentPort.postMessage({ data: "strange d", name: schema[region][city].name });
				})
		)
	);
} catch(e) {}

parentPort.postMessage({ schema });
