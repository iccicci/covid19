import React, { Component } from "react";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

const date2day = {};
const day2date = {};
const prociv = {};

const presets = {
	all:          { cases: true, deceased: true, healed: true, home_isolation: true, hospitalized: true, intensive: true, new_positives: true, positives: true, symptoms: true, tests: false },
	positives:    { cases: false, deceased: false, healed: false, home_isolation: true, hospitalized: true, intensive: true, new_positives: false, positives: true, symptoms: true, tests: false },
	hospitalized: { cases: false, deceased: false, healed: false, home_isolation: false, hospitalized: true, intensive: true, new_positives: false, positives: false, symptoms: true, tests: false },
	tests:        { cases: false, deceased: false, healed: false, home_isolation: false, hospitalized: false, intensive: false, new_positives: false, positives: false, symptoms: false, tests: true },
	gross:        { cases: true, deceased: true, healed: true, home_isolation: false, hospitalized: false, intensive: false, new_positives: true, positives: false, symptoms: false, tests: false }
};

const stats = {
	cases:          { color: "red", legend: "cases" },
	deceased:       { color: "black", legend: "deceased" },
	healed:         { color: "green", legend: "healed" },
	home_isolation: { color: "orange", legend: "home isolation" },
	hospitalized:   { color: "brown", legend: "hospitalized" },
	intensive:      { color: "grey", legend: "intensive care" },
	new_positives:  { color: "blue", legend: "new positives" },
	positives:      { color: "purple", legend: "positives" },
	symptoms:       { color: "magenta", legend: "symptoms" },
	tests:          { color: "pink", legend: "tests" }
};

class App extends Component {
	constructor() {
		super();
		this.state = {
			cases:          true,
			deceased:       true,
			healed:         true,
			home_isolation: true,
			hospitalized:   true,
			intensive:      true,
			new_positives:  true,
			positives:      true,
			region:         0,
			symptoms:       true,
			tests:          false
		};
	}

	componentDidMount() {
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
						cases:          totale_casi,
						deceased:       deceduti,
						healed:         dimessi_guariti,
						home_isolation: isolamento_domiciliare,
						hospitalized:   totale_ospedalizzati,
						intensive:      terapia_intensiva,
						new_positives:  nuovi_attualmente_positivi,
						positives:      totale_attualmente_positivi,
						symptoms:       ricoverati_con_sintomi,
						tests:          tamponi
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

							if(denominazione_regione === "Bolzano") return null;
							if(! prociv[codice_regione]) prociv[codice_regione] = { code: codice_regione, data: {}, name: denominazione_regione };

							prociv[codice_regione].data[date2day[day]] = {
								cases:          totale_casi,
								deceased:       deceduti,
								healed:         dimessi_guariti,
								home_isolation: isolamento_domiciliare,
								hospitalized:   totale_ospedalizzati,
								intensive:      terapia_intensiva,
								new_positives:  nuovi_attualmente_positivi,
								positives:      totale_attualmente_positivi,
								symptoms:       ricoverati_con_sintomi,
								tests:          tamponi
							};

							return null;
						});

						this.setState({});
					});
			});
	}

	handleButton(event) {
		this.setState(presets[event.target.value]);
	}

	handleInputChange(event) {
		const target = event.target;
		const value = target.type === "checkbox" ? target.checked : target.value;
		const name = target.name;

		this.setState({
			[name]: value
		});
	}

	render() {
		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 20, text: "Italia" },
			data:  []
		};

		if(! prociv[0]) return <div className="App" />;

		for(let s in stats) {
			if(this.state[s]) {
				const dataPoints = [];

				for(let i in prociv[0].data) {
					const d = prociv[0].data[i];

					dataPoints.push({ x: day2date[i], y: d[s] });
				}

				options.data.push({ color: stats[s].color, dataPoints, legendText: stats[s].legend, markerType: "circle", showInLegend: true, type: "line" });
			}
		}

		return (
			<div className="App">
				<header>
					<form>
						<table>
							<tbody>
								<tr>
									<td>
										<label>
											<input type="checkbox" name="healed" checked={this.state.healed} onChange={this.handleInputChange.bind(this)} /> healed (dimessi guariti)
										</label>
										<br />
										<label>
											<input type="checkbox" name="home_isolation" checked={this.state.home_isolation} onChange={this.handleInputChange.bind(this)} /> home isolation (isolamento domiciliare)
										</label>
										<br />
										<label>
											<input type="checkbox" name="intensive" checked={this.state.intensive} onChange={this.handleInputChange.bind(this)} /> intensive care (terapia intensiva)
										</label>
										<br />
										<label>
											<input type="checkbox" name="symptoms" checked={this.state.symptoms} onChange={this.handleInputChange.bind(this)} /> hospitalized with symptoms (ricoverati con sintomi)
										</label>
										<br />
										<label>
											<input type="checkbox" name="hospitalized" checked={this.state.hospitalized} onChange={this.handleInputChange.bind(this)} /> hospitalized (totale ospedalizzati)
										</label>
										<br />
										<label>
											<input type="checkbox" name="positives" checked={this.state.positives} onChange={this.handleInputChange.bind(this)} /> positives (totale attualmente positivi)
										</label>
										<br />
										<label>
											<input type="checkbox" name="new_positives" checked={this.state.new_positives} onChange={this.handleInputChange.bind(this)} /> new positives (nuovi attualmente positivi)
										</label>
										<br />
										<label>
											<input type="checkbox" name="cases" checked={this.state.cases} onChange={this.handleInputChange.bind(this)} /> cases (totale casi)
										</label>
										<br />
										<label>
											<input type="checkbox" name="deceased" checked={this.state.deceased} onChange={this.handleInputChange.bind(this)} /> deceased (deceduti)
										</label>
										<br />
										<label>
											<input type="checkbox" name="tests" checked={this.state.tests} onChange={this.handleInputChange.bind(this)} /> tests (tamponi)
										</label>
									</td>
									<td align="center">
										<input type="button" value="all" onClick={this.handleButton.bind(this)} />
										<br />
										<br />
										<input type="button" value="positives" onClick={this.handleButton.bind(this)} />
										<br />
										<br />
										<input type="button" value="hospitalized" onClick={this.handleButton.bind(this)} />
										<br />
										<br />
										<input type="button" value="gross" onClick={this.handleButton.bind(this)} />
										<br />
										<br />
										<input type="button" value="tests" onClick={this.handleButton.bind(this)} />
									</td>
								</tr>
							</tbody>
						</table>
					</form>
					<div>
						<CanvasJSChart
							options={options}
							/* onRef = {ref => this.chart = ref} */
						/>
					</div>
				</header>
				<footer>
					<p>
						by (a cura di):{" "}
						<a href="https://www.trinityteam.it/DanieleRicci#en" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
						<br />
						data source (fonte dati):{" "}
						<a href="https://github.com/pcm-dpc/COVID-19/blob/master/README.md" target="_blank" rel="noopener noreferrer">
							Protezione Civile
						</a>{" "}
						- charts (grafici):{" "}
						<a href="https://canvasjs.com/" target="_blank" rel="noopener noreferrer">
							canvasJS
						</a>
					</p>
				</footer>
			</div>
		);
	}
}

export default App;
