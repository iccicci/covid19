import React, { Component } from "react";
import { compressToBase64, decompressFromBase64 } from "./lz-string";
import { day2date, groups, prociv, refresh, stats } from "./definitions";
import regression from "regression";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";

function Forecast(props) {
	const { i, l, parent } = props;
	const { f } = parent.state;
	const forecast = f[i];

	const refresh = forecast => {
		const forecasts = [...f];

		forecasts[i] = forecast;
		parent.forecasts[i] = parent.calculateForecast(forecast);
		parent.setState({ f: forecasts });
	};

	const remove = () => {
		const forecasts = [...f];

		forecasts.splice(i, 1);
		parent.forecasts.splice(i, 1);
		parent.setState({ f: forecasts });
	};

	return (
		<div>
			<p>
				<br />
				<br />
				<br />
				<select value={forecast.r} onChange={event => refresh({ ...forecast, r: event.target.value })}>
					{parent.optionItems}
				</select>
				{Object.entries(stats).map(([stat, value]) => (
					<Option enabled={stat === forecast.s} key={stat} desc={value.desc[l]} onClick={() => refresh({ ...forecast, s: stat })} />
				))}
			</p>
			<div>
				<CanvasJSReact.CanvasJSChart options={parent.forecasts[i]} />
			</div>
			<Option enabled={true} desc={l === "i" ? "rimuovi questa proiezione" : "remove this forecast"} onClick={remove} />
		</div>
	);
}

function Option(props) {
	return (
		<button className={props.enabled ? "EnabledOption" : "DisabledOption"} onClick={props.onClick}>
			{props.desc}
		</button>
	);
}

class App extends Component {
	constructor() {
		super();
		this.forecasts = [];
		this.last = 0;
		this.optionItems = [];
		this.state = { ...groups.all.state, f: [], l: "i", r: 0 };
	}

	addForecast() {
		const forecast = { r: 0, s: "c" };

		this.forecasts.push(this.calculateForecast(forecast));
		this.setState({ f: [...this.state.f, forecast] });
	}

	calculateForecast(forecast, l) {
		const { r, s } = forecast;
		const colors = ["#000000", "#505050", "#a0a0a0"];
		const data = prociv[r].data.map((e, i) => [i, e[s]]).filter((e, i) => i > 5);
		const ita = (l ? l : this.state.l) === "i";

		return {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 18, text: prociv[r].name },
			data:  [
				...[
					{ filter: () => 1, func: "linear", legend: ita ? "lineare" : "linear", order: {} },
					{ filter: e => e[1], func: "exponential", legend: ita ? "esponenziale" : "exponential", order: {} },
					{ filter: e => e[1], func: "power", legend: ita ? "potenza" : "power", order: {} },
					{ filter: () => 1, func: "polynomial", legend: ita ? "polinomiale 2°" : "polynomial 2rd", order: { order: 2 } },
					{ filter: () => 1, func: "polynomial", legend: ita ? "polinomiale 3°" : "polynomial 3rd", order: { order: 3 } }
				]
					.map(f => {
						const res = regression[f.func](data.filter(f.filter), { ...f.order, precision: 3 });
						const { equation, points, predict, r2 } = res;
						let i = this.last + 1;

						while(day2date[i]) {
							points.push(predict(i));
							++i;
						}

						return { legendText: `${f.legend} ${f.func === "power" ? equation[1] : ""} r2: ${r2}`, dataPoints: points.map(e => ({ x: day2date[e[0]], y: e[1] })), r2 };
					})
					.filter(e => ! isNaN(e.r2) && e.r2 > 0)
					.sort((a, b) => (a.r2 < b.r2 ? 1 : -1))
					.filter((e, i) => i < 3)
					.map((e, i) => ({ ...e, color: colors[i] }))
					.reverse(),
				{ color: stats[s].color, dataPoints: data.map(e => ({ x: day2date[e[0]], y: e[1] })), legendText: stats[s].legend[l ? l : this.state.l] }
			].map(e => ({ ...e, markerSize: 8, markerType: "circle", showInLegend: true, type: "line" }))
		};
	}

	calculateForecasts(l) {
		this.forecasts = this.state.f.map(e => this.calculateForecast(e, l));
	}

	componentDidMount() {
		const { hash, origin } = window.location;

		this.origin = origin + "/#";

		if(hash) {
			try {
				this.setState(JSON.parse(decompressFromBase64(hash.substr(1))));
			} catch(e) {}
		}

		refresh(() => {
			this.optionItems = [...prociv]
				.sort((a, b) => (a.code === 0 ? -1 : b.code === 0 ? 1 : a.name < b.name ? -1 : 1))
				.map(region => (
					<option key={region.code} value={region.code}>
						{region.name}
					</option>
				));
			this.last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);
			this.calculateForecasts();
			this.setState({});
		});
	}

	render() {
		if(! prociv[0]) return <div className="App" />;

		const { f, l, r } = this.state;

		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 18, text: prociv[r].name },
			data:  Object.entries(stats)
				.filter(([stat, value]) => this.state[stat])
				.map(([stat, value]) => ({
					color:        value.color,
					dataPoints:   prociv[r].data.map((e, i) => ({ x: day2date[i], y: e[stat] })).filter((e, i) => i > 5),
					legendText:   value.legend[l],
					markerSize:   8,
					markerType:   "circle",
					showInLegend: true,
					type:         "line"
				}))
		};

		window.history.pushState({}, null, this.origin + compressToBase64(JSON.stringify(this.state)));

		return (
			<div className="App">
				<header>
					<p>
						{l === "i" ? "lingua" : "language"}:
						<Option
							enabled={l === "e"}
							desc="english"
							onClick={() => {
								this.calculateForecasts("e");
								this.setState({ l: "e" });
							}}
						/>
						<Option
							enabled={l === "i"}
							desc="italiano"
							onClick={() => {
								this.calculateForecasts("i");
								this.setState({ l: "i" });
							}}
						/>
					</p>
					<p>
						trends:
						{Object.entries(stats).map(([stat, value]) => (
							<Option enabled={this.state[stat]} key={stat} desc={value.desc[l]} onClick={() => this.setState({ [stat]: this.state[stat] ? 0 : 1 })} />
						))}
					</p>
					<p>
						{l === "i" ? "gruppi" : "groups"}:
						{Object.entries(groups).map(([group, value]) => (
							<Option enabled={true} key={group} desc={value.desc[l]} onClick={() => this.setState(value.state)} />
						))}
					</p>
					<p>
						{l === "i" ? "regione: " : "region: "}
						<select value={r} onChange={event => this.setState({ r: event.target.value })}>
							{this.optionItems}
						</select>
					</p>
					<div>
						<CanvasJSReact.CanvasJSChart options={options} />
					</div>
					{f.map((e, i) => (
						<Forecast key={i} i={i} l={l} parent={this} />
					))}
					<p>
						<br />
						<Option enabled={true} desc={l === "i" ? "aggiungi proiezione" : "add forecast"} onClick={() => this.addForecast()} />
					</p>
				</header>
				<footer>
					<p>
						{l === "i" ? "a cura di" : "by"}:{" "}
						<a href="https://www.trinityteam.it/DanieleRicci#en" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
						<br />
						{l === "i" ? "codice sorgente e segnalazione errori su" : "source code and issue report on"}:{" "}
						<a href="https://github.com/iccicci/covid19" target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
						<br />
						{l === "i" ? "fonte dati" : "data source"}:{" "}
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
