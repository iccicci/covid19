import React, { Component } from "react";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

const date2day = {};
const day2date = {};
const prociv = [];

const groups = {
	none: {
		desc:  { e: "none", i: "nessuno" },
		state: { cases: false, deceased: false, healed: false, home: false, hospitalized: false, intensive: false, new: false, positives: false, symptoms: false, tests: false }
	},
	all: {
		desc:  { e: "all", i: "tutti" },
		state: { cases: true, deceased: true, healed: true, home: true, hospitalized: true, intensive: true, new: true, positives: true, symptoms: true, tests: false }
	},
	positives: {
		desc:  { e: "positives", i: "positivi" },
		state: { cases: false, deceased: false, healed: false, home: true, hospitalized: true, intensive: true, new: false, positives: true, symptoms: true, tests: false }
	},
	hospitalized: {
		desc:  { e: "hospitalized", i: "ospedalizzati" },
		state: { cases: false, deceased: false, healed: false, home: false, hospitalized: true, intensive: true, new: false, positives: false, symptoms: true, tests: false }
	},
	gross: {
		desc:  { e: "gross", i: "totali" },
		state: { cases: true, deceased: true, healed: true, home: false, hospitalized: false, intensive: false, new: true, positives: false, symptoms: false, tests: false }
	},
	tests: {
		desc:  { e: "tests", i: "tamponi" },
		state: { cases: false, deceased: false, healed: false, home: false, hospitalized: false, intensive: false, new: false, positives: false, symptoms: false, tests: true }
	}
};

const stats = {
	healed:       { color: "green", desc: { e: "healed", i: "dimessi guariti" }, legend: { e: "healed", i: "guariti" }, param: "h" },
	home:         { color: "orange", desc: { e: "home isolation", i: "isolamento domiciliare" }, legend: { e: "home", i: "domiciliare" }, param: "a" },
	symptoms:     { color: "magenta", desc: { e: "hospitalized with symptoms", i: "ricoverati con sintomi" }, legend: { e: "symptoms", i: "sintomi" }, param: "s" },
	intensive:    { color: "grey", desc: { e: "intensive care", i: "terapia intensiva" }, legend: { e: "intensive", i: "intensiva" }, param: "i" },
	hospitalized: { color: "brown", desc: { e: "gross hospitalized", i: "totale ospedalizzati" }, legend: { e: "hospitalized", i: "ospedalizzati" }, param: "b" },
	positives:    { color: "purple", desc: { e: "gross currently positives", i: "totale attualmente positivi" }, legend: { e: "positives", i: "positivi" }, param: "p" },
	new:          { color: "blue", desc: { e: "new currently positives", i: "nuovi attualmente positivi" }, legend: { e: "new", i: "nuovi" }, param: "n" },
	cases:        { color: "red", desc: { e: "cases", i: "casi" }, legend: { e: "cases", i: "casi" }, param: "c" },
	deceased:     { color: "black", desc: { e: "deceased", i: "deceduti" }, legend: { e: "deceased", i: "deceduti" }, param: "d" },
	tests:        { color: "pink", desc: { e: "tests", i: "tamponi" }, legend: { e: "tests", i: "tamponi" }, param: "t" }
};
const par2state = { l: "language", r: "region" };

Object.entries(stats).map(([stat, value]) => (par2state[value.param] = stat));

function Option(props) {
	return (
		<button className={props.enabled ? "EnabledOption" : "DisabledOption"} onClick={props.onClick}>
			{props.short}
		</button>
	);
}

class App extends Component {
	constructor() {
		super();
		this.state = {
			cases:        true,
			deceased:     true,
			healed:       true,
			home:         true,
			hospitalized: true,
			intensive:    true,
			language:     "i",
			new:          true,
			positives:    true,
			region:       0,
			symptoms:     true,
			tests:        false
		};
	}

	componentDidMount() {
		const { hash, origin } = window.location;

		this.origin = origin + "/#";

		if(hash) {
			const par = Object.fromEntries(new URLSearchParams(hash.substr(1)));
			const state = {};

			for(let i in par2state) if(i in par) state[par2state[i]] = i === "l" ? par[i] : i === "r" ? parseInt(par[i], 10) : par[i] === "1";

			this.setState(state);
		}

		// https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json

		fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json")
			.then(res => res.json())
			.then(res => {
				prociv[0] = { code: 0, data: {}, name: "Italia" };

				res.map((e, i) => {
					const {
						data,
						deceduti,
						dimessi_guariti,
						isolamento_domiciliare,
						nuovi_attualmente_positivi,
						ricoverati_con_sintomi,
						tamponi,
						terapia_intensiva,
						totale_attualmente_positivi,
						totale_casi,
						totale_ospedalizzati
					} = e;
					const day = data.substr(0, 10);

					date2day[day] = i;
					day2date[i] = new Date(day);
					prociv[0].data[i] = {
						cases:        totale_casi,
						deceased:     deceduti,
						healed:       dimessi_guariti,
						home:         isolamento_domiciliare,
						hospitalized: totale_ospedalizzati,
						intensive:    terapia_intensiva,
						new:          nuovi_attualmente_positivi,
						positives:    totale_attualmente_positivi,
						symptoms:     ricoverati_con_sintomi,
						tests:        tamponi
					};

					return null;
				});

				fetch("https://raw.githack.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json")
					.then(res => res.json())
					.then(res => {
						res.map(e => {
							const {
								codice_regione,
								data,
								deceduti,
								denominazione_regione,
								dimessi_guariti,
								isolamento_domiciliare,
								nuovi_attualmente_positivi,
								ricoverati_con_sintomi,
								tamponi,
								terapia_intensiva,
								totale_attualmente_positivi,
								totale_casi,
								totale_ospedalizzati
							} = e;
							const day = data.substr(0, 10);
							let code = codice_regione;

							if(denominazione_regione === "P.A. Bolzano") code = 21;
							if(! prociv[code]) prociv[code] = { code, data: {}, name: denominazione_regione };

							prociv[code].data[date2day[day]] = {
								cases:        totale_casi,
								deceased:     deceduti,
								healed:       dimessi_guariti,
								home:         isolamento_domiciliare,
								hospitalized: totale_ospedalizzati,
								intensive:    terapia_intensiva,
								new:          nuovi_attualmente_positivi,
								positives:    totale_attualmente_positivi,
								symptoms:     ricoverati_con_sintomi,
								tests:        tamponi
							};

							return null;
						});

						this.setState({});
					});
			});
	}

	render() {
		if(! prociv[0]) return <div className="App" />;

		const region = this.state.region;
		const optionItems = [...prociv]
			.sort((a, b) => (a.code === 0 ? -1 : b.code === 0 ? 1 : a.name < b.name ? -1 : 1))
			.map(region => (
				<option key={region.code} value={region.code}>
					{region.name}
				</option>
			));
		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 20, text: prociv[region].name },
			data:  []
		};

		for(let s in stats) {
			if(this.state[s]) {
				const dataPoints = [];

				for(let i in prociv[region].data) {
					const d = prociv[region].data[i];

					dataPoints.push({ x: day2date[i], y: d[s] });
				}

				options.data.push({ color: stats[s].color, dataPoints, legendText: stats[s].legend[this.state.language], markerType: "circle", showInLegend: true, type: "line" });
			}
		}

		const par = { l: this.state.language, r: this.state.region };

		Object.entries(stats).map(([stat, value]) => (par[value.param] = this.state[stat] ? 1 : 0));
		window.history.pushState({}, null, this.origin + new URLSearchParams(par).toString());

		return (
			<div className="App">
				<header>
					<p>
						{this.state.language === "i" ? "lingua" : "language"}:
						<Option enabled={this.state.language === "e"} short="English" onClick={() => this.setState({ language: "e" })} />
						<Option enabled={this.state.language === "i"} short="Italiano" onClick={() => this.setState({ language: "i" })} />
					</p>
					<p>
						trends:
						{Object.entries(stats).map(([stat, value]) => (
							<Option enabled={this.state[stat]} key={stat} short={value.desc[this.state.language]} onClick={() => this.setState({ [stat]: ! this.state[stat] })} />
						))}
					</p>
					<p>
						{this.state.language === "i" ? "gruppi" : "groups"}:
						{Object.entries(groups).map(([group, value]) => (
							<Option enabled={true} key={group} short={value.desc[this.state.language]} onClick={() => this.setState(value.state)} />
						))}
					</p>
					<p>
						{this.state.language === "i" ? "regione: " : "region: "}
						<select value={this.state.region} onChange={event => this.setState({ region: event.target.value })}>
							{optionItems}
						</select>
					</p>
					<div>
						<CanvasJSChart options={options} />
					</div>
				</header>
				<footer>
					<p>
						{this.state.language === "i" ? "a cura di" : "by"}:{" "}
						<a href="https://www.trinityteam.it/DanieleRicci#en" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
						<br />
						{this.state.language === "i" ? "codice sorgente e segnalazione errori su" : "source code and issue report on"}:{" "}
						<a href="https://github.com/iccicci/covid19" target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
						<br />
						{this.state.language === "i" ? "fonte dati" : "data source"}:{" "}
						<a href="https://github.com/pcm-dpc/COVID-19/blob/master/README.md" target="_blank" rel="noopener noreferrer">
							Protezione Civile
						</a>
					</p>
				</footer>
			</div>
		);
	}
}

export default App;
