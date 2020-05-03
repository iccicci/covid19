const dc = require("daemon-control");
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const morgan = require("morgan");
const path = require("path");
const { Worker } = require("worker_threads");
// eslint-disable-next-line no-native-reassign
require = require("esm")(module);
const { date2day, schema, stats } = require("./client/src/schema");

let data = {};
let log = () => {};
let recordsNumber = 0;

fs.readFile("data.json", (err, content) => {
	if(err) return;

	data = JSON.parse(content);
	recordsNumber = data[0][0].recordset.cases.length;
});

function daemon(daemonized) {
	const rfs = require("rotating-file-stream");
	const stream = rfs.createStream("covid-19.log", {
		compress:         true,
		interval:         "1d",
		intervalBoundary: true,
		path:             path.join(process.env.HOME, "covid-19"),
		size:             "1M",
		teeToStdout:      ! daemonized
	});

	log = function () {
		stream.write(toString.apply(null, arguments));
	};

	process.on("uncaughtException", err => log("Caught exception", err));

	log("Init");

	process.on("SIGTERM", () => log("Shutting down due to SIGTERM"));

	const app = express();

	app.use(morgan("combined", { stream }));
	app.use(express.static(path.join(__dirname, "client", "build")));
	app.post("/data", (req, res) => res.send(data));
	app.get("*", (req, res) => res.sendFile(path.join(__dirname, "client", "build", "index.html")));

	const server = app.listen(23000, "localhost", () => process.on("SIGTERM", () => server.close()));

	if(daemonized) {
		process.stdout.end();
		process.stderr.end();
	}

	setTimeout(refresh, 5000);
}

function fromSource(source) {
	const { codice_provincia, codice_regione, data, denominazione_provincia, denominazione_regione, sigla_provincia } = source;

	const city = codice_provincia;
	const day = date2day[data.substr(0, 10)];
	const name = codice_provincia ? `${denominazione_provincia} (${sigla_provincia})` : denominazione_regione;
	const region = denominazione_regione === "P.A. Bolzano" ? 21 : codice_regione;

	return { city, day, name, region };
}

function initRecordset() {
	const recordset = {};

	Object.keys(stats).map(stat => (recordset[stat] = []));

	return recordset;
}

function refresh() {
	const built = [];

	setTimeout(() => refresh(), 600000).unref();

	fetch("https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json")
		.then(res => res.json())
		.then(res => {
			const recordset = initRecordset();

			if(res.length === recordsNumber) return;

			recordsNumber = res.length;
			built[0] = { 0: { forecasts: {}, name: "Italia", recordset } };

			res.forEach(e => {
				const { day } = fromSource(e);

				Object.entries(stats).forEach(([stat, details]) => (recordset[stat][day] = e[details.source]));
			});

			fetch("https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json")
				.then(res => res.json())
				.then(res => {
					res.forEach(e => {
						const { day, name, region } = fromSource(e);

						if(! built[region]) {
							const recordset = initRecordset();

							built[region] = { 0: { forecasts: {}, name, recordset } };
						}

						Object.entries(stats).forEach(([stat, details]) => (built[region][0].recordset[stat][day] = e[details.source]));
					});

					fetch("https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json")
						.then(res => res.json())
						.then(res => {
							res.forEach(e => {
								if(! e.sigla_provincia) return;

								const { city, day, name, region } = fromSource(e);

								if(! built[region][city]) built[region][city] = { forecasts: {}, name, recordset: { cases: [] } };

								built[region][city].recordset.cases[day] = e[stats.cases.source];
							});

							const worker = new Worker("./forecasts.js", { workerData: built });

							worker.on("message", result => {
								if(result.schema) return fs.writeFile("data.json", JSON.stringify((data = result.schema)), () => {});

								log(result);
							});
						})
						.catch(e => log("Fetching cities", e));
				})
				.catch(e => log("Fetching regions", e));
		})
		.catch(e => log("Fetching Italy", e));
}

function toString() {
	let str = Object.entries(arguments)
		.map(([, msg]) => {
			switch(typeof msg) {
			case "object":
				if(msg instanceof Error) return msg.stack;
				return JSON.stringify(msg);
			case "string":
				return msg;
			}
			return "" + msg;
		})
		.join(", ");

	if(str.length && str.substr(str.length - 1) !== "\n") str += "\n";

	return new Date().toISOString() + " " + str;
}

dc(daemon, path.join(process.env.HOME, "covid-19", "covid-19.pid"), {
	hooks: {
		start: (done, child) => {
			if(child.pid) {
				child.stdio[1].pipe(process.stdout);
				child.stdio[2].pipe(process.stderr);
			}

			done(true);
		}
	},
	stdio: ["inherit", "pipe", "pipe"]
}).on("error", err => process.stderr.write(err.stack + err.message));
