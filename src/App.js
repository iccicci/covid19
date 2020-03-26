import React, { Component } from "react";
import { compressToBase64, decompressFromBase64 } from "./lz-string";
import { day2date, groups, prociv, procivc, refresh, stats } from "./definitions";
import { gauss, gauss2 } from "./gauss";
import regression from "regression";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";

function regressions(ita) {
	return [
		{ filter: () => 1, func: "linear", legend: ita ? "lineare" : "linear", order: {} },
		{ filter: e => e[1], func: "exponential", legend: ita ? "esponenziale" : "exponential", order: {} },
		{ filter: e => e[1], func: "power", legend: ita ? "potenza" : "power", order: {} },
		{ filter: () => 1, func: "polynomial", legend: ita ? "polinomiale 2°" : "polynomial 2rd", order: { order: 2 } },
		{ filter: () => 1, func: "polynomial", legend: ita ? "polinomiale 3°" : "polynomial 3rd", order: { order: 3 } }
	];
}

function Forecast(props) {
	const { i, l, parent } = props;
	const { f } = parent.state;
	const forecast = f[i];
	let { r, s, w } = forecast;

	if(! s) s = "c";

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
				<select value={r} onChange={event => refresh({ r: parseInt(event.target.value, 10), s })}>
					{parent.regionsItems}
				</select>
				{r ? " " : ""}
				{r ? (
					<select value={w} onChange={event => refresh({ r, w: parseInt(event.target.value, 10) })}>
						{parent.citiesItems[r]}
					</select>
				) : (
					""
				)}
				{Object.entries(stats).map(([stat, value]) => (
					<Option enabled={stat === s} key={stat} desc={value.desc[l]} onClick={() => (w ? null : refresh({ r, s: stat }))} />
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
		this.citiesItems = [];
		this.forecasts = [];
		this.last = 0;
		this.regionsItems = [];
		this.state = { ...groups.all.state, f: [], l: "i", r: 0, w: 0 };
	}

	addForecast() {
		const forecast = { r: 0, s: "c" };

		this.forecasts.push(this.calculateForecast(forecast));
		this.setState({ f: [...this.state.f, forecast] });
	}

	calculateForecast(forecast, l) {
		let { r, s, w } = forecast;

		if(! s) s = "c";

		const colors = ["#000000", "#505050", "#a0a0a0"];
		const data = (w ? procivc[r][w].data.map((e, i) => [i, e[s]]) : prociv[r].data.map((e, i) => [i, e[s]])).filter((e, i) => i > 5);
		const ita = (l ? l : this.state.l) === "i";

		let flines;

		if(s === "c" && r === 0) {
			try {
				flines = gauss2(ita);
			} catch(e) {
				console.log(e);
			}
		} else if(stats[s].model) {
			try {
				flines = gauss(data, stats[s].model, ita);
			} catch(e) {
				console.log(e);
			}
		}

		if(! flines) {
			flines = regressions(ita)
				.map(f => {
					const res = regression[f.func](data.filter(f.filter), { ...f.order, precision: 3 });
					const { equation, points, predict, r2 } = res;

					for(let i = 1; i <= 7; ++i) points.push(predict(this.last + i));

					return { legendText: `${f.legend} ${f.func === "power" ? equation[1] : ""} r2: ${r2}`, dataPoints: points.map(e => ({ x: day2date[e[0]], y: e[1] })), r2 };
				})
				.filter(e => ! isNaN(e.r2) && e.r2 > 0)
				.sort((a, b) => (a.r2 < b.r2 ? 1 : -1))
				.filter((e, i) => i < 3)
				.map((e, i) => ({ ...e, color: colors[i] }))
				.reverse();
		}

		return {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 18, text: w ? procivc[r][w].name : prociv[r].name },
			data:  [...flines, { color: stats[s].color, dataPoints: data.map(e => ({ x: day2date[e[0]], y: e[1] })), legendText: stats[s].legend[l ? l : this.state.l] }].map(e => ({
				...e,
				markerSize:   8,
				markerType:   "circle",
				showInLegend: true,
				type:         "line"
			}))
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
			this.regionsItems = [...prociv]
				.sort((a, b) => (a.code === 0 ? -1 : b.code === 0 ? 1 : a.name < b.name ? -1 : 1))
				.map(region => (
					<option key={region.code} value={region.code}>
						{region.name}
					</option>
				));

			this.citiesItems = [];
			procivc.map(
				(e, i) =>
					(this.citiesItems[i] = [
						<option key={0} value={0}>
							-
						</option>,
						...[...e]
							.sort((a, b) => (a.name < b.name ? -1 : 1))
							.filter(e => e)
							.map(city => (
								<option key={city.city} value={city.city}>
									{city.name}
								</option>
							))
					])
			);

			this.last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);
			this.calculateForecasts();
			this.setState({});
		});
	}

	render() {
		if(! prociv[0]) return <div className="App" />;

		const { f, l, r, w } = this.state;

		const common = { markerSize: 8, markerType: "circle", showInLegend: true, type: "line" };
		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 18, text: prociv[r].name },
			data:  w
				? Object.entries(stats)
					.filter(([stat, value]) => stat === "c")
					.map(([stat, value]) => ({
						...common,
						color:      value.color,
						dataPoints: procivc[r][w].data.map((e, i) => ({ x: day2date[i], y: e[stat] })).filter((e, i) => i > 5),
						legendText: value.legend[l]
					}))
				: Object.entries(stats)
					.filter(([stat, value]) => this.state[stat])
					.map(([stat, value]) => ({
						...common,
						color:      value.color,
						dataPoints: prociv[r].data.map((e, i) => ({ x: day2date[i], y: e[stat] })).filter((e, i) => i > 5),
						legendText: value.legend[l]
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
							<Option enabled={stat === "c" && w ? true : this.state[stat] && ! w} key={stat} desc={value.desc[l]} onClick={() => (w ? null : this.setState({ [stat]: this.state[stat] ? 0 : 1 }))} />
						))}
					</p>
					<p>
						{l === "i" ? "gruppi" : "groups"}:
						{Object.entries(groups).map(([group, value]) => (
							<Option enabled={! w} key={group} desc={value.desc[l]} onClick={() => (w ? null : this.setState(value.state))} />
						))}
					</p>
					<p>
						{l === "i" ? "regione: " : "region: "}
						<select value={r} onChange={event => this.setState({ r: parseInt(event.target.value, 10), w: 0 })}>
							{this.regionsItems}
						</select>
						{r ? (l === "i" ? " provincia: " : " city: ") : ""}
						{r ? (
							<select value={w} onChange={event => this.setState({ w: parseInt(event.target.value, 10) })}>
								{this.citiesItems[r]}
							</select>
						) : (
							""
						)}
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
