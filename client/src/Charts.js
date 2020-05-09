import React, { Component } from "react";
import { groups, schema, stats } from "./schema";
import { LinesChart } from "./Lines";
import { Option, OptionLink } from "./Option";
import { SurfaceChart } from "./Surface";

const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;

const dict = {
	by:       { e: "by", i: "a cura di" },
	chart:    { e: "chart", i: "grafico" },
	city:     { e: "city", i: "provincia" },
	code:     { e: "source code and issue report on", i: "codice sorgente e segnalazione errori su" },
	language: { e: "language", i: "lingua" },
	lines:    { e: "lines", i: "linee" },
	region:   { e: "region", i: "regione" },
	source:   { e: "data source", i: "fonte dati" },
	surface:  { e: "surface", i: "area" }
};

export class Charts extends Component {
	constructor(props) {
		super(props);

		this.url = props.match.url;
		this.urlParams = props.location.pathname.substr(this.url.length);
		this.state = this.getStateFromUrlParams(this.urlParams);
	}

	componentDidMount() {
		const refresh = () => {
			setTimeout(refresh, 600000);

			fetch("/data", { accept: "application/json", method: "POST" })
				.then(res => res.json())
				.then(res => {
					res.forEach((e, i) => (schema[i] = e));

					if(! this.regionOptions) {
						this.cityOptions = [];
						this.regionOptions = [];

						schema.forEach((cities, region) => {
							this.cityOptions[region] = [];

							Object.entries(cities).forEach(([city, set]) => {
								if(city !== "0") {
									return this.cityOptions[region].push(
										<option key={city} value={city}>
											{set.name}
										</option>
									);
								}

								if(region) {
									this.cityOptions[region].push(
										<option key={city} value={city}>
											-
										</option>
									);
								}

								this.regionOptions.push(
									<option key={region} value={region}>
										{set.name}
									</option>
								);
							});
						});

						this.regionOptions.sort((a, b) => (a.props.children === "Italia" ? -1 : b.props.children === "Italia" ? 1 : a.props.children < b.props.children ? -1 : 1));
						this.cityOptions.forEach(cities => cities.sort((a, b) => (a.props.children === "-" ? -1 : b.props.children === "-" ? 1 : a.props.children < b.props.children ? -1 : 1)));
						this.setState({});

						this.checks = [
							...Object.keys(stats)
								.filter(stat => stat !== "tests")
								.reduce((ret, stat) => [...ret, ...schema.map((e, region) => ({ city: 0, region, stat }))], []),
							...schema
								.map((cities, region) =>
									Object.keys(cities)
										.filter(city => city !== "0")
										.map(city => ({ city, region, stat: "cases" }))
								)
								.reduce((res, e) => [...res, ...e], [])
						];

						if(false) {
							let current = -1;

							this.keyEvent = event => {
								const { keyCode } = event;

								let forecast;

								if(keyCode === 38) {
									if(current <= 0) return;
									forecast = this.checks[--current];
								} else if(keyCode === 40) {
									if(current === this.checks.length - 1) return;
									forecast = this.checks[++current];
								} else return;

								this.setState({ forecasts: [] }, () => this.setState({ forecasts: [forecast] }));
							};

							window.addEventListener("keydown", this.keyEvent);
						}
					}

					res.forEach((e, i) => (schema[i] = e));

					this.setState({});
				});
		};

		refresh();
	}

	componentWillUnmount() {
		if(this.keyEvent) window.removeEventListener("keydown", this.keyEvent);
	}

	getStateFromUrlParams(params) {
		let [, view, region, city, language, lines, ...rest] = params.split("/");
		const forecasts = [];

		if(view !== "proiezioni" && view !== "andamento") view = "proiezioni";
		if(language !== "i" && language !== "e") language = "i";

		region = parseInt(region, 10);
		if(isNaN(region)) region = 0;

		city = parseInt(city, 10);
		if(isNaN(city)) city = 0;

		const state = { ...groups.all.state, city, language, forecasts, region, view };

		if(lines) {
			Object.keys(stats).forEach(stat => (state[stat] = 0));
			lines.split("").forEach(line =>
				Object.entries(stats).forEach(([stat, details]) => {
					if(details.url === line) state[stat] = 1;
				})
			);
		}

		while(rest.length) {
			const forecast = {};
			const region = parseInt(rest.shift(), 10);

			if(isNaN(region) || ! rest.length) return state;

			const next = rest.shift();
			const city = parseInt(next, 10);

			forecast.region = region;

			if(isNaN(city)) {
				Object.entries(stats).forEach(([stat, details]) => {
					if(details.url === next) forecast.stat = stat;
				});

				if(! forecast.stat) return state;
			} else forecast.city = city;

			forecasts.push(forecast);
		}

		return state;
	}

	getUrlParamsFromState(state) {
		if(! state) state = this.state; //remove with hash

		const { city, forecasts, language, region, view } = state;
		const lines = Object.entries(stats)
			.filter(([stat]) => state[stat])
			.map(([, details]) => details.url)
			.join("");

		const rest = forecasts ? forecasts.map(forecast => `/${forecast.region}/${forecast.city || stats[forecast.stat || "cases"].url}`).join("") : "";

		return `/${view}/${region}/${city}/${language}/${lines}` + rest;
	}

	render() {
		const { city, language, region, view } = this.state;
		const urlParams = this.getUrlParamsFromState();
		const params = urlParams.split("/");

		const exitFullscreen = done => {
			if(document.fullscreenElement) document.exitFullscreen();
			if(done) done();
		};

		const requestFullscreen = done => {
			if(mobile) document.getElementById("root").requestFullscreen({ navigationUI: "hide" });
			done();
		};

		if(this.url) window.history.pushState({}, null, this.url + urlParams);
		params.shift();
		params.shift();
		params.unshift("");

		if(! schema.length) {
			setTimeout(() => this.setState({}), 1000);

			return null;
		}

		return (
			<div className="App">
				<p id="head">
					<OptionLink desc="home" to={params.join("/")} onClick={() => exitFullscreen()} />
					{" - " + dict.chart[language] + ": "}
					<Option enabled={view !== "andamento"} desc={dict.lines[language]} onClick={() => exitFullscreen(() => this.setState({ view: "proiezioni" }))} />
					<Option enabled={view === "andamento"} desc={dict.surface[language]} onClick={() => requestFullscreen(() => this.setState({ view: "andamento" }))} />
					{" - " + dict.language[language] + ": "}
					<Option enabled={language === "e"} desc="english" onClick={() => this.setState({ language: "e" })} />
					<Option enabled={language === "i"} desc="italiano" onClick={() => this.setState({ language: "i" })} />
					{" - " + dict.region[language] + ": "}
					<select value={region} onChange={event => this.setState({ region: parseInt(event.target.value, 10), city: 0 })}>
						{this.regionOptions}
					</select>
					{region && view !== "andamento" ? " " + dict.city[language] + ": " : ""}
					{region && this.cityOptions && view !== "andamento" ? (
						<select value={city} onChange={event => this.setState({ city: parseInt(event.target.value, 10) })}>
							{this.cityOptions[region]}
						</select>
					) : null}
				</p>
				{view === "proiezioni" ? <LinesChart cityOptions={this.cityOptions} parent={this} regionOptions={this.regionOptions} /> : <SurfaceChart parent={this} />}
				<footer id="foot">
					<p>
						{dict.by[language] + ": "}
						<a href="https://www.trinityteam.it/DanieleRicci#en" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
						{"  -  " + dict.code[language] + ": "}
						<a href="https://github.com/iccicci/covid19" target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
						{"  -  " + dict.source[language] + ": "}
						<a href="https://github.com/pcm-dpc/COVID-19/blob/master/README.md" target="_blank" rel="noopener noreferrer">
							Protezione Civile
						</a>
					</p>
				</footer>
			</div>
		);
	}
}
