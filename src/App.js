import React, { Component } from "react";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

const date2day = {};
const day2date = {};
const prociv = {};

class App extends Component {
	constructor() {
		super();
		this.state = {};
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
						cases:              totale_casi,
						deceased:           deceduti,
						healed:             dimessi_guariti,
						home_isolation:     isolamento_domiciliare,
						hospitalized:       ricoverati_con_sintomi,
						hospitalized_total: totale_ospedalizzati,
						intensive_care:     terapia_intensiva,
						new_positives:      nuovi_attualmente_positivi,
						positives:          totale_attualmente_positivi,
						tests:              tamponi
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
								cases:              totale_casi,
								deceased:           deceduti,
								healed:             dimessi_guariti,
								home_isolation:     isolamento_domiciliare,
								hospitalized:       ricoverati_con_sintomi,
								hospitalized_total: totale_ospedalizzati,
								intensive_care:     terapia_intensiva,
								new_positives:      nuovi_attualmente_positivi,
								positives:          totale_attualmente_positivi,
								tests:              tamponi
							};

							return null;
						});

						this.setState({});
					});
			});
	}

	render() {
		const options = { axisX: { valueFormatString: "DD-MMM", labelAngle: -50 }, title: { fontSize: 20, text: "Italia" }, data: [] };
		const dataPoints = [];

		if(! prociv[0]) return <div className="App" />;

		for(let i in prociv[0].data) {
			const d = prociv[0].data[i];

			dataPoints.push({ x: day2date[i], y: d.cases });
		}

		options.data.push({ color: "red", dataPoints, legendText: "cases", markerType: "circle", showInLegend: true, type: "line" });

		return (
			<div className="App">
				<header>
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
