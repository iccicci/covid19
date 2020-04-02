export const groups = {
	none:         { desc: { e: "none", i: "nessuno" }, state: { c: 0, d: 0, h: 0, a: 0, b: 0, i: 0, n: 0, p: 0, s: 0, t: 0, e: 0 } },
	all:          { desc: { e: "all", i: "tutti" }, state: { c: 1, d: 1, h: 1, a: 1, b: 1, i: 1, n: 1, p: 1, s: 1, t: 0, e: 1 } },
	positives:    { desc: { e: "positives", i: "positivi" }, state: { c: 0, d: 0, h: 0, a: 1, b: 1, i: 1, n: 0, p: 1, s: 1, t: 0, e: 0 } },
	hospitalized: { desc: { e: "hospitalized", i: "ospedalizzati" }, state: { c: 0, d: 0, h: 0, a: 0, b: 1, i: 1, n: 0, p: 0, s: 1, t: 0, e: 0 } },
	gross:        { desc: { e: "gross", i: "totali" }, state: { c: 1, d: 1, h: 1, a: 0, b: 0, i: 0, n: 1, p: 0, s: 0, t: 0, e: 1 } },
	tests:        { desc: { e: "tests", i: "tamponi" }, state: { c: 0, d: 0, h: 0, a: 0, b: 0, i: 0, n: 0, p: 0, s: 0, t: 1, e: 0 } }
};

export const stats = {
	h: { color: "green", desc: { e: "healed", i: "dimessi guariti" }, legend: { e: "healed", i: "guariti" }, model: "integral", source: "dimessi_guariti" },
	a: { color: "orange", desc: { e: "home isolation", i: "isolamento domiciliare" }, legend: { e: "home", i: "domiciliare" }, model: "gauss", source: "isolamento_domiciliare" },
	s: { color: "magenta", desc: { e: "hospitalized with symptoms", i: "ricoverati con sintomi" }, legend: { e: "symptoms", i: "sintomi" }, model: "gauss", source: "ricoverati_con_sintomi" },
	i: { color: "purple", desc: { e: "intensive care", i: "terapia intensiva" }, legend: { e: "intensive", i: "intensiva" }, model: "gauss", source: "terapia_intensiva" },
	b: { color: "brown", desc: { e: "gross hospitalized", i: "totale ospedalizzati" }, legend: { e: "hospitalized", i: "ospedalizzati" }, model: "gauss", source: "totale_ospedalizzati" },
	p: { color: "violet", desc: { e: "gross positives", i: "totale positivi" }, legend: { e: "positives", i: "positivi" }, model: "gauss", source: "totale_positivi" },
	n: { color: "blue", desc: { e: "gross positives ghange", i: "variazione totale positivi" }, legend: { e: "change", i: "variazione" }, model: "derivate", source: "variazione_totale_positivi" },
	e: { color: "cyan", desc: { e: "new positives", i: "nuovi positivi" }, legend: { e: "new", i: "nuovi" }, model: "derivate", source: "nuovi_positivi" },
	c: { color: "red", desc: { e: "cases", i: "casi" }, legend: { e: "cases", i: "casi" }, model: "integral", source: "totale_casi" },
	d: { color: "black", desc: { e: "deceased", i: "deceduti" }, legend: { e: "deceased", i: "deceduti" }, model: "integral", source: "deceduti" },
	t: { color: "pink", desc: { e: "tests", i: "tamponi" }, legend: { e: "tests", i: "tamponi" }, source: "tamponi" }
};

export const checkExclude = false;
export const date2day = {};
export const day2date = [];
export const prociv = [];
export const procivc = [];

let i = 0;
let missing = 7;
let today = new Date();

while(missing) {
	let date = new Date(2020, 1, 18 + i, 3);
	let day = date.toISOString().substr(0, 10);

	date2day[day] = i;
	day2date[i] = date;

	i++;
	if(date > today) missing--;
}

export function getData(stat, region, city) {
	return (city ? procivc[region][city].data.map((e, i) => [i, e[stat]]) : prociv[region].data.map((e, i) => [i, e[stat]])).filter((e, i) => i > 5);
}

export function fill(max) {
	if(day2date[max]) return day2date[max];

	const prev = fill(max - 1);
	const date = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1, 3);
	const day = date.toISOString().substr(0, 10);

	date2day[day] = max;
	day2date[max] = date;

	return date;
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

export function refresh(done) {
	setTimeout(() => refresh(done), 600000);

	fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json")
		.then(res => res.json())
		.then(res => {
			prociv[0] = { code: 0, data: [], name: "Italia" };
			res.map(e => (prociv[0].data[date2day[e.data.substr(0, 10)]] = fromSource(e).data));

			fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json")
				.then(res => res.json())
				.then(res => {
					res.map(e => {
						const { code, data, name } = fromSource(e);

						if(! prociv[code]) prociv[code] = { code, data: [], name };

						return (prociv[code].data[date2day[e.data.substr(0, 10)]] = data);
					});

					fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json")
						.then(res => res.json())
						.then(res => {
							res.map(e => {
								if(! e.sigla_provincia) return 0;

								const { city, code, data, name } = fromSource(e, true);

								if(! procivc[code]) procivc[code] = [];
								if(! procivc[code][city]) procivc[code][city] = { city, data: [], name };

								return (procivc[code][city].data[date2day[e.data.substr(0, 10)]] = data);
							});

							done();
						});
				});
		});
}
