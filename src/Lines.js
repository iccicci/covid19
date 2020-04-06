import React, { Component } from "react";
import { day2date, getData, groups, registerSchemaHandle, schema, stats, unregisterSchemaHandle } from "./schema";
import { Option } from "./Option";
import { registerForecastsHandle, unregisterForecastsHandle } from "./forecasts";

import CanvasJS from "./canvasjs.min";

const dict = {
	add:    { e: "add forecast", i: "aggiungi proiezione" },
	groups: { e: "groups", i: "gruppi" },
	remove: {
		e: "remove this forecast",
		i: "rimuovi questa proiezione"
	}
};

class Forecast extends Component {
	constructor(props) {
		super(props);

		// prettier-ignore
		this.chardId = Math.random().toString().substr(2);
		this.prevProps = {};
	}

	componentDidMount() {
		this.registerHandle();
	}

	componentDidUpdate() {
		this.registerHandle();
	}

	componentWillUnmount() {
		this.unregisterHandle();
	}

	registerHandle() {
		const { i, language, parent } = this.props;
		const { forecasts } = parent.parent.state;
		const forecast = forecasts[i];
		let { city, region, stat } = forecast;

		if(! city) city = 0;
		if(! stat) stat = "cases";

		const prevProps = { city, language, region, stat };

		Object.entries(prevProps).forEach(([key, value]) => {
			if(this.prevProps[key] !== value) {
				this.unregisterHandle();
				this.prevProps = prevProps;
				this.forecastHandle = registerForecastsHandle(region, city, () => {
					const { chart, data } = schema[region][city].forecasts[stat];

					chart.forEach(line => line.legend(language));

					const options = {
						axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
						title: { fontSize: 18, text: schema[region][city].name },
						data:  [...chart, { color: stats[stat].color, dataPoints: data.map(e => ({ x: day2date[e[0]], y: e[1] })), legendText: stats[stat].legend[language] }].map(e => ({
							...e,
							markerSize:   8,
							markerType:   "circle",
							showInLegend: true,
							type:         "line"
						}))
					};

					new CanvasJS.Chart(this.chardId, options).render();
				});
			}
		});
	}

	unregisterHandle() {
		if(this.forecastHandle) unregisterForecastsHandle(this.forecastHandle);
	}

	render() {
		const { i, language, parent } = this.props;
		const { forecasts } = parent.parent.state;
		const forecast = forecasts[i];
		let { city, region, stat } = forecast;

		if(! stat) stat = "cases";

		const current = stat;

		const refresh = forecast => {
			const newForecasts = [...forecasts];

			newForecasts[i] = forecast;
			parent.parent.setState({ forecasts: newForecasts });
		};

		const remove = () => {
			const newForecasts = [...forecasts];

			newForecasts.splice(i, 1);
			parent.parent.setState({ forecasts: newForecasts });
		};

		return (
			<div>
				<p>
					<br />
					<br />
					<br />
					<select value={region} onChange={event => refresh({ region: parseInt(event.target.value, 10), stat })}>
						{parent.regionOptions}
					</select>
					{region ? " " : ""}
					{region && parent.cityOptions ? (
						<select value={city} onChange={event => refresh({ region, city: parseInt(event.target.value, 10) })}>
							{parent.cityOptions[region]}
						</select>
					) : null}
					{Object.entries(stats).map(([stat, value]) => (
						<Option enabled={stat === current} key={stat} desc={value.desc[language]} onClick={() => (city ? null : refresh({ region, stat }))} />
					))}
				</p>
				<div id={this.chardId} style={{ height: "400px", width: "100%" }}></div>
				<Option enabled={true} desc={dict.remove[language]} onClick={remove} />
			</div>
		);
	}
}

export class LinesChart extends Component {
	constructor(props) {
		super(props);

		// prettier-ignore
		this.chardId = Math.random().toString().substr(2);
		this.prevProps = {};
	}

	componentDidMount() {
		this.registerHandle();
	}

	componentDidUpdate() {
		this.registerHandle();
	}

	componentWillUnmount() {
		this.unregisterHandle();
	}

	registerHandle() {
		const { city, language, region } = this.parent.state;
		const prevProps = { city, language, region };

		if(! city) Object.keys(stats).forEach(stat => (prevProps[stat] = this.parent.state[stat]));

		Object.entries(prevProps).forEach(([key, value]) => {
			if(this.prevProps[key] !== value) {
				this.unregisterHandle();
				this.prevProps = prevProps;
				this.schemaHandle = registerSchemaHandle(() => {
					const common = { markerSize: 8, markerType: "circle", showInLegend: true, type: "line" };
					const lines = Object.entries(stats).filter(city ? ([stat]) => stat === "cases" : ([stat]) => this.parent.state[stat]);
					const options = {
						axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
						title: { fontSize: 18, text: schema[region][city].name },
						data:  lines.map(([stat, value]) => ({
							...common,
							color:      value.color,
							dataPoints: getData(stat, region, city).map(([x, y]) => ({ x: day2date[x], y })),
							legendText: value.legend[language]
						}))
					};

					new CanvasJS.Chart(this.chardId, options).render();
				});
			}
		});
	}

	unregisterHandle() {
		if(this.schemaHandle) unregisterSchemaHandle(this.schemaHandle);
	}

	addForecast() {
		const forecast = { region: 0, stat: "cases" };

		this.parent.setState({ forecasts: [...this.parent.state.forecasts, forecast] });
	}

	render() {
		const { cityOptions, parent, regionOptions } = this.props;
		const { city, forecasts, language } = parent.state;

		this.cityOptions = cityOptions;
		this.parent = parent;
		this.regionOptions = regionOptions;

		return (
			<div>
				<header id="head">
					<div>
						<p>
							trends:
							{Object.entries(stats).map(([stat, value]) => (
								<Option
									enabled={stat === "cases" && city ? true : parent.state[stat] && ! city}
									key={stat}
									desc={value.desc[language]}
									onClick={() => (city ? null : parent.setState({ [stat]: parent.state[stat] ? 0 : 1 }))}
								/>
							))}
						</p>
						<p>
							{dict.groups[language]}:
							{Object.entries(groups).map(([group, value]) => (
								<Option enabled={! city} key={group} desc={value.desc[language]} onClick={() => (city ? null : parent.setState(value.state))} />
							))}
						</p>
					</div>
				</header>
				<div style={{ paddingBottom: "20px" }}>
					<div id={this.chardId} style={{ height: "400px", width: "100%" }}></div>
					{forecasts.map((e, i) => (
						<Forecast key={i} i={i} language={language} parent={this} />
					))}
					<p>
						<br />
						<Option enabled={true} desc={dict.add[language]} onClick={() => this.addForecast()} />
					</p>
				</div>
			</div>
		);
	}
}
