export const groups = {
	none:         { desc: { e: "none", i: "nessuno" }, state: { c: 0, d: 0, h: 0, a: 0, b: 0, i: 0, n: 0, p: 0, s: 0, t: 0 } },
	all:          { desc: { e: "all", i: "tutti" }, state: { c: 1, d: 1, h: 1, a: 1, b: 1, i: 1, n: 1, p: 1, s: 1, t: 0 } },
	positives:    { desc: { e: "positives", i: "positivi" }, state: { c: 0, d: 0, h: 0, a: 1, b: 1, i: 1, n: 0, p: 1, s: 1, t: 0 } },
	hospitalized: { desc: { e: "hospitalized", i: "ospedalizzati" }, state: { c: 0, d: 0, h: 0, a: 0, b: 1, i: 1, n: 0, p: 0, s: 1, t: 0 } },
	gross:        { desc: { e: "gross", i: "totali" }, state: { c: 1, d: 1, h: 1, a: 0, b: 0, i: 0, n: 1, p: 0, s: 0, t: 0 } },
	tests:        { desc: { e: "tests", i: "tamponi" }, state: { c: 0, d: 0, h: 0, a: 0, b: 0, i: 0, n: 0, p: 0, s: 0, t: 1 } }
};

export const stats = {
	h: { color: "green", desc: { e: "healed", i: "dimessi guariti" }, legend: { e: "healed", i: "guariti" }, source: "dimessi_guariti", param: "h" },
	a: { color: "orange", desc: { e: "home isolation", i: "isolamento domiciliare" }, legend: { e: "home", i: "domiciliare" }, source: "isolamento_domiciliare", param: "a" },
	s: { color: "magenta", desc: { e: "hospitalized with symptoms", i: "ricoverati con sintomi" }, legend: { e: "symptoms", i: "sintomi" }, source: "ricoverati_con_sintomi", param: "s" },
	i: { color: "purple", desc: { e: "intensive care", i: "terapia intensiva" }, legend: { e: "intensive", i: "intensiva" }, source: "terapia_intensiva", param: "i" },
	b: { color: "brown", desc: { e: "gross hospitalized", i: "totale ospedalizzati" }, legend: { e: "hospitalized", i: "ospedalizzati" }, source: "totale_ospedalizzati", param: "b" },
	p: { color: "violet", desc: { e: "gross currently positives", i: "totale attualmente positivi" }, legend: { e: "positives", i: "positivi" }, source: "totale_attualmente_positivi", param: "p" },
	n: { color: "blue", desc: { e: "new currently positives", i: "nuovi attualmente positivi" }, legend: { e: "new", i: "nuovi" }, source: "nuovi_attualmente_positivi", param: "n" },
	c: { color: "red", desc: { e: "cases", i: "casi" }, legend: { e: "cases", i: "casi" }, source: "totale_casi", param: "c" },
	d: { color: "black", desc: { e: "deceased", i: "deceduti" }, legend: { e: "deceased", i: "deceduti" }, source: "deceduti", param: "d" },
	t: { color: "pink", desc: { e: "tests", i: "tamponi" }, legend: { e: "tests", i: "tamponi" }, source: "tamponi", param: "t" }
};

export const date2day = {};
export const day2date = [];
export const prociv = [];

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

function fromSource(source) {
	const code = source.codice_regione ? (source.denominazione_regione === "P.A. Bolzano" ? 21 : source.codice_regione) : 0;
	const data = {};

	Object.entries(stats).map(([stat, value]) => (data[stat] = source[value.source]));

	return { code, data, name: source.denominazione_regione ? source.denominazione_regione : "Italia" };
}

// https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json
export function refresh(done) {
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

					setTimeout(() => refresh(done), 600000);
					done();
				});
		});
}
