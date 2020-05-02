const { T } = require("owen-s-t-function");
const erf = require("math-erf");

const { exp, SQRT2 } = Math;

const stats = {
	cases:    { color: "red", desc: { e: "cases", i: "casi" }, legend: { e: "cases", i: "casi" }, model: "integral", source: "totale_casi", url: "c" },
	deceased: { color: "black", desc: { e: "deceased", i: "deceduti" }, legend: { e: "deceased", i: "deceduti" }, model: "integral", source: "deceduti", url: "d" },
	healed:   { color: "green", desc: { e: "healed", i: "dimessi guariti" }, legend: { e: "healed", i: "guariti" }, model: "integral", source: "dimessi_guariti", url: "h" },
	home:     { color: "orange", desc: { e: "home isolation", i: "isolamento domiciliare" }, legend: { e: "home", i: "domiciliare" }, model: "normal", source: "isolamento_domiciliare", url: "a" },
	symptoms: {
		color:  "magenta",
		desc:   { e: "hospitalized with symptoms", i: "ricoverati con sintomi" },
		legend: { e: "symptoms", i: "sintomi" },
		model:  "normal",
		source: "ricoverati_con_sintomi",
		url:    "s"
	},
	intensive:    { color: "purple", desc: { e: "intensive care", i: "terapia intensiva" }, legend: { e: "intensive", i: "intensiva" }, model: "normal", source: "terapia_intensiva", url: "i" },
	hospitalized: {
		color:  "brown",
		desc:   { e: "gross hospitalized", i: "totale ospedalizzati" },
		legend: { e: "hospitalized", i: "ospedalizzati" },
		model:  "normal",
		source: "totale_ospedalizzati",
		url:    "b"
	},
	positives: { color: "violet", desc: { e: "gross positives", i: "totale positivi" }, legend: { e: "positives", i: "positivi" }, model: "normal", source: "totale_positivi", url: "p" },
	change:    {
		color:  "blue",
		desc:   { e: "gross positives ghange", i: "variazione totale positivi" },
		legend: { e: "change", i: "variazione" },
		source: "variazione_totale_positivi",
		url:    "n"
	},
	new:   { color: "cyan", desc: { e: "new positives", i: "nuovi positivi" }, legend: { e: "new", i: "nuovi" }, source: "nuovi_positivi", url: "e" },
	tests: { color: "pink", desc: { e: "tests", i: "tamponi" }, legend: { e: "tests", i: "tamponi" }, model: "integral", source: "tamponi", url: "t" }
};

const groups = {
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

const models = {
	normal: {
		f: ([a, b, c, d]) => t => a * exp(-((t - b) ** 2) / (2 * c ** 2)) * (1 + erf((d * (t - b)) / c / SQRT2))
	},
	integral: {
		f: ([a, b, c, d]) => t => a * ((1 + erf((t - b) / c / SQRT2)) / 2 - 2 * T((t - b) / c, d))
	}
};

const date2day = {};
const day2date = [];
const schema = [];
const tMax = 120;

function format(n) {
	return n > 9 ? n : "0" + n;
}

for(let i = 0; i < 300; ++i) {
	let date = new Date(2020, 1, 24 + i, 0, 1);
	let day = `${date.getFullYear()}-${format(date.getMonth() + 1)}-${format(date.getDate())}`;

	date2day[day] = i;
	day2date[i] = date;
}

module.exports.date2day = date2day;
module.exports.day2date = day2date;
module.exports.groups = groups;
module.exports.models = models;
module.exports.schema = schema;
module.exports.stats = stats;
module.exports.tMax = tMax;
