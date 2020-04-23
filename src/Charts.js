import React, { Component } from "react";
import { checkExclude, groups, registerSchemaHandle, schema, stats, unregisterSchemaHandle } from "./schema";
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
	constructor() {
		super();

		this.state = { ...groups.all.state, city: 0, language: "i", forecasts: [], region: 0, view: "proiezioni" };
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
				} else if(keyCode === 40) {
					if(current === this.checks.length - 1) return;
					forecast = this.checks[++current];
				} else return;

				const { city, region, stat } = forecast;
				const { model } = schema[region][0].forecasts[stat];

				console.log(schema[region][city].name, city ? city : region);

				if(model) {
					Object.keys(model).forEach(distribution => {
						if(distribution === "f") return;

						model[distribution].forEach(e => {
							console.log(distribution, "beta0: ", e.beta0);
							console.log(distribution, "beta: ", e.beta);
							if(e.error) console.log(distribution, "error: ", e.error);
						});
					});
				}

				this.setState({ forecasts: [] }, () => this.setState({ forecasts: [forecast] }));
			};

			window.addEventListener("keydown", this.keyEvent);
		}

		this.url = this.props.match.url;
		this.urlParams = this.props.location.pathname.substr(this.url.length);

		this.setState(this.getStateFromUrlParams(this.urlParams));

		this.schemaHandle = registerSchemaHandle(() => {
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
			}
		});
	}

	componentWillUnmount() {
		if(this.keyEvent) window.removeEventListener("keydown", this.keyEvent);

		unregisterSchemaHandle(this.schemaHandle);
	}

	getStateFromUrlParams(params) {
		const [, view, region, city, language, lines, ...rest] = params.split("/");
		const forecasts = [];
		const state = { city: parseInt(city, 10), language, forecasts, region: parseInt(region, 10), view };

		if(view !== "proiezioni" && view !== "andamento") return {};
		if(isNaN(state.city) || isNaN(state.region)) return { view };

		lines.split("").forEach(line =>
			Object.entries(stats).forEach(([stat, details]) => {
				if(details.url === line) state[stat] = true;
			})
		);

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
