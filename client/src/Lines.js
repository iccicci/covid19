import React, { Component } from "react";
import { day2date, groups, models, schema, stats, tMax } from "./schema";
import { Option } from "./Option";

let CanvasJS = require("./canvasjs.min");
CanvasJS = CanvasJS.Chart ? CanvasJS : window.CanvasJS;

const axisX = { valueFormatString: "DD-MMM", labelAngle: -50 };
const common = { markerSize: 8, markerType: "circle", showInLegend: true, type: "line" };
const dict = {
	add:      { e: "add forecast", i: "aggiungi proiezione" },
	forecast: { e: "forecast", i: "proiezione" },
	groups:   { e: "groups", i: "gruppi" },
	remove:   { e: "remove this forecast", i: "rimuovi questa proiezione" }
};

class Forecast extends Component {
	componentDidMount() {
		this.refresh();
	}

	componentDidUpdate() {
		this.refresh();
	}

	refresh() {
		const { i, language, parent } = this.props;
		const { forecasts } = parent.parent.state;
		const dataPoints = [];
		const forecast = forecasts[i];
		let { city, region, stat } = forecast;

		if(! city) city = 0;
		if(! stat) stat = "cases";

		let stat2 = stat;

		if(stat === "change") stat2 = "positives";
		if(stat === "new") stat2 = "cases";

		const f = models[stats[stat2].model].f(schema[region][city].forecasts[stat2]);

		for(let t = 0; t < tMax; ++t) dataPoints.push({ x: day2date[t], y: Math.round(f(t) - (stat === stat2 ? 0 : f(t - 1))) });

		const options = {
			axisX,
			title: { fontSize: 18, text: schema[region][city].name },
			data:  [
				{
					...common,
					color:      stat === "deceased" ? "#808080" : "#000000",
					dataPoints,
					legendText: dict.forecast[language]
				},
				{
					...common,
					color:      stats[stat].color,
					dataPoints: schema[region][city].recordset[stat].map((y, i) => ({ x: day2date[i], y })),
					legendText: stats[stat].legend[language]
				}
			]
		};

		new CanvasJS.Chart("f" + i, options).render();
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
				<div id={"f" + i} style={{ height: "400px", width: "100%" }}></div>
				<Option enabled={true} desc={dict.remove[language]} onClick={remove} />
			</div>
		);
	}
}

export class LinesChart extends Component {
	addForecast() {
		const forecast = { region: 0, stat: "cases" };

		this.parent.setState({ forecasts: [...this.parent.state.forecasts, forecast] });
	}

	componentDidMount() {
		this.refresh();
	}

	componentDidUpdate() {
		this.refresh();
	}

	refresh() {
		const { city, language, region } = this.parent.state;
		const lines = Object.entries(stats).filter(city ? ([stat]) => stat === "cases" : ([stat]) => this.parent.state[stat]);
		const options = {
			axisX,
			title: { fontSize: 18, text: schema[region][city].name },
			data:  lines.map(([stat, value]) => ({
				...common,
				color:      value.color,
				dataPoints: schema[region][city].recordset[stat].map((y, i) => ({ x: day2date[i], y })),
				legendText: value.legend[language]
			}))
		};

		new CanvasJS.Chart("lines", options).render();
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
					<div id="lines" style={{ height: "400px", width: "100%" }}></div>
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
