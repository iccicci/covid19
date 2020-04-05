export const stats = {
	healed:   { color: "green", desc: { e: "healed", i: "dimessi guariti" }, legend: { e: "healed", i: "guariti" }, model: "integral", source: "dimessi_guariti", url: "h" },
	home:     { color: "orange", desc: { e: "home isolation", i: "isolamento domiciliare" }, legend: { e: "home", i: "domiciliare" }, model: "gauss", source: "isolamento_domiciliare", url: "a" },
	symptoms: {
		color:  "magenta",
		desc:   { e: "hospitalized with symptoms", i: "ricoverati con sintomi" },
		legend: { e: "symptoms", i: "sintomi" },
		model:  "gauss",
		source: "ricoverati_con_sintomi",
		url:    "s"
	},
	intensive:    { color: "purple", desc: { e: "intensive care", i: "terapia intensiva" }, legend: { e: "intensive", i: "intensiva" }, model: "gauss", source: "terapia_intensiva", url: "i" },
	hospitalized: {
		color:  "brown",
		desc:   { e: "gross hospitalized", i: "totale ospedalizzati" },
		legend: { e: "hospitalized", i: "ospedalizzati" },
		model:  "gauss",
		source: "totale_ospedalizzati",
		url:    "b"
	},
	positives: { color: "violet", desc: { e: "gross positives", i: "totale positivi" }, legend: { e: "positives", i: "positivi" }, model: "gauss", source: "totale_positivi", url: "p" },
	change:    {
		color:  "blue",
		desc:   { e: "gross positives ghange", i: "variazione totale positivi" },
		legend: { e: "change", i: "variazione" },
		model:  "derivate",
		source: "variazione_totale_positivi",
		url:    "n"
	},
	new:      { color: "cyan", desc: { e: "new positives", i: "nuovi positivi" }, legend: { e: "new", i: "nuovi" }, model: "derivate", source: "nuovi_positivi", url: "e" },
	cases:    { color: "red", desc: { e: "cases", i: "casi" }, legend: { e: "cases", i: "casi" }, model: "integral", source: "totale_casi", url: "c" },
	deceased: { color: "black", desc: { e: "deceased", i: "deceduti" }, legend: { e: "deceased", i: "deceduti" }, model: "integral", source: "deceduti", url: "d" },
	tests:    { color: "pink", desc: { e: "tests", i: "tamponi" }, legend: { e: "tests", i: "tamponi" }, source: "tamponi", url: "t" }
};

export const groups = {
	none:         { desc: { e: "none", i: "nessuno" }, state: { healed: 0, home: 0, symptoms: 0, intensive: 0, hospitalized: 0, positives: 0, change: 0, new: 0, cases: 0, deceased: 0, tests: 0 } },
	all:          { desc: { e: "all", i: "tutti" }, state: { healed: 1, home: 1, symptoms: 1, intensive: 1, hospitalized: 1, positives: 1, change: 1, new: 1, cases: 1, deceased: 1, tests: 0 } },
	positives:    { desc: { e: "positives", i: "positivi" }, state: { healed: 0, home: 1, symptoms: 1, intensive: 1, hospitalized: 1, positives: 1, change: 0, new: 0, cases: 0, deceased: 0, tests: 0 } },
	hospitalized: {
		desc:  { e: "hospitalized", i: "ospedalizzati" },
		state: { healed: 0, home: 0, symptoms: 1, intensive: 1, hospitalized: 1, positives: 0, change: 0, new: 0, cases: 0, deceased: 0, tests: 0 }
	},
	gross: { desc: { e: "gross", i: "totali" }, state: { healed: 1, home: 0, symptoms: 0, intensive: 0, hospitalized: 0, positives: 0, change: 1, new: 1, cases: 1, deceased: 1, tests: 0 } },
	tests: { desc: { e: "tests", i: "tamponi" }, state: { healed: 0, home: 0, symptoms: 0, intensive: 0, hospitalized: 0, positives: 0, change: 0, new: 0, cases: 0, deceased: 0, tests: 1 } }
};

export const checkExclude = false;
export const date2day = {};
export const day2date = [];
export const prociv = [];
export const procivc = [];
export const schema = [];

const schemaHandles = {};

let recordsNumber = 0;

function format(n) {
	return n > 9 ? n : "0" + n;
}

for(let i = 0; i < 300; ++i) {
	let date = new Date(2020, 1, 18 + i, 0, 1);
	let day = `${date.getFullYear()}-${format(date.getMonth() + 1)}-${format(date.getDate())}`;

	date2day[day] = i;
	day2date[i] = date;
}

export function getData(stat, region, city) {
	return schema[region][city].recordset[stat].map((e, i) => [i, e]).filter((e, i) => i > 5);
}

function fromSource(source, city) {
	const code = source.codice_regione ? (source.denominazione_regione === "P.A. Bolzano" ? 21 : source.codice_regione) : 0;
	const data = {};
	const name = city ? `${source.denominazione_provincia} (${source.sigla_provincia})` : source.denominazione_regione ? source.denominazione_regione : "Italia";
	const ret = { code, data, name };

	Object.entries(stats).map(([stat, value]) => {
		const s = source[value.source];

		if(s !== undefined) data[stat] = s;

		return null;
	});

	if(city) ret.city = source.codice_provincia;

	return ret;
}

function fromSource2(source) {
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

	setTimeout(refresh, 600000);

	fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json")
		.then(res => res.json())
		.then(res => {
			const recordset = initRecordset();

			if(res.length === recordsNumber) return;

			recordsNumber = res.length;
			built[0] = { 0: { forecasts: {}, name: "Italia", recordset } };

			res.forEach(e => {
				const day = date2day[e.data.substr(0, 10)];

				Object.entries(stats).forEach(([stat, details]) => (recordset[stat][day] = e[details.source]));
			});

			prociv[0] = { code: 0, data: [], name: "Italia" };
			res.map(e => (prociv[0].data[date2day[e.data.substr(0, 10)]] = fromSource(e).data));

			fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json")
				.then(res => res.json())
				.then(res => {
					res.forEach(e => {
						const { day, name, region } = fromSource2(e);

						if(! built[region]) {
							const recordset = initRecordset();

							built[region] = { 0: { forecasts: {}, name, recordset } };
						}

						Object.entries(stats).forEach(([stat, details]) => (built[region][0].recordset[stat][day] = e[details.source]));
					});

					res.map(e => {
						const { code, data, name } = fromSource(e);

						if(! prociv[code]) prociv[code] = { code, data: [], name };

						return (prociv[code].data[date2day[e.data.substr(0, 10)]] = data);
					});

					fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json")
						.then(res => res.json())
						.then(res => {
							res.forEach(e => {
								if(! e.sigla_provincia) return;

								const { city, day, name, region } = fromSource2(e);

								if(! built[region][city]) built[region][city] = { forecasts: {}, name, recordset: { cases: [] } };

								built[region][city].recordset.cases[day] = e[stats.cases.source];
							});

							res.map(e => {
								if(! e.sigla_provincia) return 0;

								const { city, code, data, name } = fromSource(e, true);

								if(! procivc[code]) procivc[code] = [];
								if(! procivc[code][city]) procivc[code][city] = { city, data: [], name };

								return (procivc[code][city].data[date2day[e.data.substr(0, 10)]] = data);
							});

							built.forEach((cities, region) => (schema[region] = cities));

							const handles = (entries, i) => {
								if(i === entries.length) return;

								if(entries[i][0] in schemaHandles) entries[i][1]();

								setTimeout(() => handles(entries, i + 1), 10);
							};

							handles(Object.entries(schemaHandles), 0);
						});
				});
		});
}

export function registerSchemaHandle(handle) {
	const key = Math.random();

	if(schema.length) handle();

	schemaHandles[key] = handle;

	return key;
}

export function unregisterSchemaHandle(key) {
	delete schemaHandles[key];
}

refresh();
