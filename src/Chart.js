import React, { Component } from "react";
import { Link } from "react-router-dom";
import { compressToBase64, decompressFromBase64 } from "./lz-string";
import { checkExclude, day2date, getData, groups, prociv, procivc, refresh, stats } from "./definitions";
import { gauss2, gaussChart } from "./gauss";
import regression from "regression";

import CanvasJSReact from "./canvasjs.react";
import Advanced from "./Advanced";
import Option from "./Option";

const regressions = [
	{ filter: () => 1, func: "linear", legend: { i: "lineare", e: "linear" }, order: {} },
	{ filter: e => e[1], func: "exponential", legend: { i: "esponenziale", e: "exponential" }, order: {} },
	{ filter: e => e[1], func: "power", legend: { i: "potenza", e: "power" }, order: {} },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 2°", e: "polynomial 2rd" }, order: { order: 2 } },
	{ filter: () => 1, func: "polynomial", legend: { i: "polinomiale 3°", e: "polynomial 3rd" }, order: { order: 3 } }
];

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

class Chart extends Component {
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

		if(! l) l = this.state.l;
		if(! s) s = "c";

		const colors = ["#000000", "#505050", "#a0a0a0"];
		const data = getData(s, r, w);

		let flines;

		if(s === "cc" && r === 0) {
			try {
				flines = gauss2();
			} catch(e) {
				console.log(e);
			}
		} else if(stats[s].model) {
			try {
				flines = gaussChart(data, s, r, w, l);
			} catch(e) {
				console.log(e);
			}
		}

		if(! flines) {
			flines = regressions
				.map(f => {
					const res = regression[f.func](data.filter(f.filter), { ...f.order, precision: 3 });
					const { equation, points, predict, r2 } = res;

					for(let i = 1; i <= 7; ++i) points.push(predict(this.last + i));

					return { legendText: `${f.legend[l]} ${f.func === "power" ? equation[1] : ""} r2: ${r2}`, dataPoints: points.map(e => ({ x: day2date[e[0]], y: e[1] })), r2 };
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
		this.setState({ l });
	}

	componentDidMount() {
		if(checkExclude) {
			let current = -1;

			this.keyEvent = event => {
				const { keyCode } = event;

				let forecast;

				if(keyCode === 38) {
					if(current <= 0) return;
					forecast = this.checks[--current];
				} else
				if(keyCode === 40) {
					if(current === this.checks.length - 1) return;
					forecast = this.checks[++current];
				} else return;

				this.setState({ f: [forecast] });
				this.calculateForecasts(this.state.l);
				console.log(forecast);
			};

			document.addEventListener("keydown", this.keyEvent);
		}

		const { hash, origin } = window.location;

		this.origin = origin + `/coronavirus/grafico/proiezioni${this.props.surface ? "/andamento" : ""}#`;

		if(hash) {
			try {
				this.setState(JSON.parse(decompressFromBase64(hash.substr(1))));
			} catch(e) {}
		}

		refresh(() => {
			if(checkExclude) this.checks = Object.keys(stats).filter(s => s !== "t").reduce((ret, s) => [...ret, ...prociv.map((e, r) => ({ r, s }))], []);

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

			const last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);

			if(last !== this.last) {
				this.last = last;
				this.calculateForecasts(this.state.l);
				if(this.refs.advanced) this.refs.advanced.forecast(this.state.r);
			}
		});
	}

	componentWillUnmount() {
		if(this.keyEvent) {
			document.addEventListener("keydown", this.keyEvent);
			this.keyEvent = null;
		}
	}

	render() {
		if(! prociv[0]) return <div className="App" />;

		const { f, l, r, w } = this.state;

		const common = { markerSize: 8, markerType: "circle", showInLegend: true, type: "line" };
		const lines = Object.entries(stats).filter(w ? ([stat]) => stat === "c" : ([stat]) => this.state[stat]);
		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 18, text: w ? procivc[r][w].name : prociv[r].name },
			data:  lines.map(([stat, value]) => ({
				...common,
				color:      value.color,
				dataPoints: getData(stat, r, w).map(([x, y]) => ({ x: day2date[x], y })),
				legendText: value.legend[l]
			}))
		};

		window.history.pushState({}, null, this.origin + compressToBase64(JSON.stringify(this.state)));
		const toggleClass = event => event.target.classList.toggle("NoDecoration");
		const OptionLink = ({ desc, disabled, to }) => (
			<Link to={to} onMouseOut={toggleClass} onMouseOver={toggleClass} style={disabled ? { color: "gray" } : {}}>
				{desc}
			</Link>
		);

		return (
			<div className="App">
				<header id="head">
					<p>
						<OptionLink desc="home" to="/" />
						{l === "i" ? " - grafico: " : " - chart: "}
						<OptionLink desc={l === "i" ? "linee" : "lines"} disabled={this.props.surface} to="/coronavirus/grafico/proiezioni" />{" "}
						<OptionLink desc={l === "i" ? "area" : "surface"} disabled={! this.props.surface} to="/coronavirus/grafico/proiezioni/andamento" /> -{l === "i" ? " lingua" : " language"}:
						<Option enabled={l === "e"} desc="english" onClick={() => this.calculateForecasts("e")} />
						<Option enabled={l === "i"} desc="italiano" onClick={() => this.calculateForecasts("i")} />
						{l === "i" ? "  -  regione: " : "  -  region: "}
						<select value={r} onChange={event => this.setState({ r: parseInt(event.target.value, 10), w: 0 })}>
							{this.regionsItems}
						</select>
						{r && ! this.props.surface ? (l === "i" ? " provincia: " : " city: ") : ""}
						{r && ! this.props.surface ? (
							<select value={w} onChange={event => this.setState({ w: parseInt(event.target.value, 10) })}>
								{this.citiesItems[r]}
							</select>
						) : null}
					</p>
					{this.props.surface ? null : (
						<div>
							<p>
								trends:
								{Object.entries(stats).map(([stat, value]) => (
									<Option
										enabled={stat === "c" && w ? true : this.state[stat] && ! w}
										key={stat}
										desc={value.desc[l]}
										onClick={() => (w ? null : this.setState({ [stat]: this.state[stat] ? 0 : 1 }))}
									/>
								))}
							</p>
							<p>
								{l === "i" ? "gruppi" : "groups"}:
								{Object.entries(groups).map(([group, value]) => (
									<Option enabled={! w} key={group} desc={value.desc[l]} onClick={() => (w ? null : this.setState(value.state))} />
								))}
							</p>
						</div>
					)}
				</header>
				{this.props.surface ? (
					<div>
						<Advanced language={l} region={r} ref="advanced" />
					</div>
				) : (
					<div style={{ paddingBottom: "20px" }}>
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
					</div>
				)}
				<footer id="foot">
					<p>
						{l === "i" ? "a cura di: " : "by: "}
						<a href="https://www.trinityteam.it/DanieleRicci#en" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
						{"  -  " + (l === "i" ? "codice sorgente e segnalazione errori su: " : "source code and issue report on: ")}
						<a href="https://github.com/iccicci/covid19" target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
						{"  -  " + (l === "i" ? "fonte dati: " : "data source: ")}
						<a href="https://github.com/pcm-dpc/COVID-19/blob/master/README.md" target="_blank" rel="noopener noreferrer">
							Protezione Civile
						</a>
					</p>
				</footer>
			</div>
		);
	}
}

export default Chart;
