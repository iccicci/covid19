import React, { Component } from "react";
import { groups, models, schema, stats, tMax } from "./schema";
import { BaseToolTip, mobile } from "./BaseToolTip";
import { Option } from "./Option";

const drawXOffset = 50;
const drawYOffset = 20;
const imgScale = window.devicePixelRatio;

const dict = {
	add:      { e: "add forecast", i: "aggiungi proiezione" },
	day:      { e: "day", i: "giorno" },
	forecast: { e: "forecast", i: "proiezione" },
	groups:   { e: "groups", i: "gruppi" },
	remove:   { e: "remove this forecast", i: "rimuovi questa proiezione" },
	units:    { e: "units", i: "unità" }
};

const tips = {};

class ToolTip extends BaseToolTip {
	constructor(props) {
		super(props);

		this.sizeY = 0;
	}

	componentDidMount() {
		tips[this.props.id] = this;
	}

	componentWillUnmount() {
		delete tips[this.props.id];
	}

	render() {
		const { id, language, parent } = this.props;
		const { day, display, left, top, units } = this.state;
		const date = new Date(2020, 1, 24 + day, 3).toISOString().substr(5, 5);

		if(! parent.lines) return null;

		return (
			<div id={"t" + id} className="Table" style={{ display, left, top }} onTouchStart={() => this.hide()}>
				<div className="TRow">
					<div className="TCellL">{dict.day[language]}:</div>
					<div className="TCellR">{date}</div>
				</div>
				<div className="TRow">
					<div className="TCellL">{dict.units[language]}:</div>
					<div className="TCellR">{units}</div>
				</div>
				{parent.lines.map(({ color, legend, points }) => (
					<div className="TRow" key={legend}>
						<div className="TCellL">
							<span style={{ color }}>{legend}</span>:
						</div>
						<div className="TCellR">{day < points.length ? points[day] : ""}</div>
					</div>
				))}
			</div>
		);
	}

	subSetState(state) {
		const { pageY, x, y } = state;
		const { id } = this.props;
		const elem = document.getElementById("t" + id);

		Object.entries(tips).forEach(([key, value]) => key === id ? null : value.hide());

		if(elem && ! this.sizeY) this.sizeY = elem.getBoundingClientRect().height;

		const distance = mobile ? 50 : 5;
		const sizeX = 193 + distance;
		const sizeY = this.sizeY + distance;

		if(y > sizeY) {
			state.left = (x > sizeX ? x - sizeX : 0) + "px";
			state.top = pageY - sizeY + "px";
		} else if(mobile && this.props.parent.isPortrait && x <= sizeX) {
			state.left = "0px";
			state.top = pageY + distance + "px";
		} else {
			state.left = x + (x > sizeX ? -sizeX : distance) + "px";
			state.top = pageY + "px";
		}
	}
}

class Chart extends Component {
	componentDidMount() {
		this.handleResize = () => this.refresh();
		window.addEventListener("resize", this.handleResize);
		this.refresh();
	}

	componentDidUpdate() {
		this.refresh();
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
	}

	drawXGrid(canvasHeight, chartXmin, chartXmax, ctx, drawWidth, t2x, XScale) {
		let stepXGrid = 1;

		while(stepXGrid * XScale < 35) ++stepXGrid;

		ctx.lineWidth = 1;
		ctx.strokeStyle = "#808080";

		for(let t = Math.ceil(chartXmin / stepXGrid) * stepXGrid; t < chartXmax; t += stepXGrid) {
			ctx.beginPath();
			ctx.moveTo(t2x(t), 0);
			ctx.lineTo(t2x(t), canvasHeight - drawYOffset);
			ctx.stroke();
		}

		return stepXGrid;
	}

	drawYGrid(canvasWidth, chartHeight, chartYmin, chartYmax, ctx, drawHeight, y2y) {
		let next = true;
		let stepYGrid = chartHeight / (drawHeight / 50);
		let prev = 1;
		let diff = stepYGrid;
		let exp = 1;
		let uni = 0;

		while(next) {
			if(uni === 0) uni = 1;
			else if(uni === 1) uni = 2;
			else if(uni === 2) uni = 5;
			else {
				uni = 1;
				exp *= 10;
			}

			if(Math.abs(stepYGrid - uni * exp) < diff) {
				prev = uni * exp;
				diff = Math.abs(stepYGrid - prev);
			} else {
				next = false;
				stepYGrid = prev;
			}
		}

		ctx.lineWidth = 1;
		ctx.strokeStyle = "#808080";

		for(let units = Math.floor(chartYmin / stepYGrid) * stepYGrid; units < chartYmax; units += stepYGrid) {
			ctx.beginPath();
			ctx.moveTo(drawXOffset, y2y(units));
			ctx.lineTo(canvasWidth, y2y(units));
			ctx.stroke();
		}

		return stepYGrid;
	}

	getOffsets(event) {
		const { clientX, clientY, target } = event;
		const rect = target.getBoundingClientRect();
		const offsetX = clientX - rect.left;
		const offsetY = clientY - rect.top;
		const originX = this.x2t(offsetX);
		const originY = this.y2Y(offsetY);

		return { offsetX, offsetY, originX, originY };
	}

	handleToolTip(event) {
		if(this.hideTimeout) clearTimeout(this.hideTimeout);

		const { clientX, clientY, pageY } = event;
		const { offsetX, offsetY, originX, originY } = this.getOffsets(event);

		if(this.disableTimeout > new Date().getTime() || offsetX < 0 || offsetY < 0) return this.tooltip.hide();

		this.tooltip.setState({ day: Math.ceil(originX), pageY, units: Math.floor(originY), x: clientX, y: clientY });
	}

	mousemove(event) {
		if(mobile) return;

		this.handleToolTip(event);
	}

	mouseout() {
		if(this.hideTimeout) clearTimeout(this.hideTimeout);

		this.hideTimeout = setTimeout(() => this.tooltip.hide((this.hideTimeout = null)), 200);
	}

	touchMove(event) {
		this.handleToolTip(event.touches[0]);
	}

	refresh() {
		const { canvas, lines } = this;

		if(! lines) return;

		canvas.width = canvas.clientWidth * imgScale;
		canvas.height = canvas.clientHeight * imgScale;
		const canvasWidth = canvas.clientWidth;
		const canvasHeight = canvas.clientHeight;
		const ctx = canvas.getContext("2d");
		ctx.scale(imgScale, imgScale);

		let chartXmin = 0;
		let chartXmax = 0;
		let chartYmin = 0;
		let chartYmax = 0;

		lines.forEach(({ points }) => {
			if(points.length > chartXmax) chartXmax = points.length;

			points.forEach(y => {
				if(y < chartYmin) chartYmin = y;
				if(y > chartYmax) chartYmax = y;
			});
		});

		const yDelta = (chartYmax - chartYmin) * 0.01;

		chartXmin -= 0.5;
		chartXmax -= 0.5;
		chartYmin -= yDelta;
		chartYmax += yDelta;

		this.tooltip.min = chartYmin;

		const chartWidth = chartXmax - chartXmin;
		const chartHeight = chartYmax - chartYmin;
		const drawWidth = canvasWidth - drawXOffset;
		const drawHeight = canvasHeight - drawYOffset;
		const XScale = drawWidth / chartWidth;
		const YScale = drawHeight / chartHeight;

		const t2x = t => (t - chartXmin) * XScale + drawXOffset;
		const y2y = y => drawHeight - (y - chartYmin) * YScale;
		const x2t = x => Math.round((x - drawXOffset) / XScale);
		const y2Y = y => (drawHeight - y) / YScale + chartYmin;

		const stepXGrid = this.drawXGrid(canvasHeight, chartXmin, chartXmax, ctx, drawWidth, t2x, XScale);
		const stepYGrid = this.drawYGrid(canvasWidth, chartHeight, chartYmin, chartYmax, ctx, drawHeight, y2y);

		this.x2t = x2t;
		this.y2Y = y2Y;

		lines.forEach(({ color, points }) => {
			ctx.lineWidth = 2;
			ctx.strokeStyle = color;
			ctx.beginPath();
			ctx.moveTo(t2x(0), y2y(points[0]));
			points.forEach((e, i) => ctx.lineTo(t2x(i), y2y(points[i])));
			ctx.stroke();
		});

		ctx.fillStyle = "#000000";
		ctx.font = "12px Arial";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		for(let units = Math.floor(chartYmin / stepYGrid) * stepYGrid; units < chartYmax; units += stepYGrid) ctx.fillText(units, drawXOffset - 2, y2y(units));

		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		for(let t = Math.ceil(chartXmin / stepXGrid) * stepXGrid; t < chartXmax; t += stepXGrid) ctx.fillText(new Date(2020, 1, 24 + t, 3).toISOString().substr(5, 5), t2x(t), drawHeight + 2);
	}

	render() {
		const { id, language } = this.props;

		return (
			<div style={{ width: "100%" }}>
				<div style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", width: "100%" }}>{this.props.title}</div>
				<canvas
					id={id}
					onMouseMove={event => this.mousemove(event)}
					onMouseOut={() => this.mouseout()}
					onTouchMove={event => this.touchMove(event)}
					onTouchStart={event => this.touchMove(event)}
					ref={ref => (this.canvas = ref)}
					style={{ width: "100%", height: "400px" }}
				/>
				<ToolTip id={id} language={language} parent={this} ref={ref => (this.tooltip = ref)} />
			</div>
		);
	}

	setLines(lines) {
		this.lines = lines;
	}
}

class Forecast extends Component {
	componentDidMount() {
		this.refresh();
	}

	componentDidUpdate() {
		this.refresh();
	}

	refresh() {
		const { chart, props } = this;

		if(! chart) return;

		const { i, language, parent } = props;
		const { forecasts } = parent.parent.state;
		const forecast = forecasts[i];
		const points = [];
		let { city, region, stat } = forecast;

		if(! city) city = 0;
		if(! stat) stat = "cases";

		let stat2 = stat;

		if(stat === "change") stat2 = "positives";
		if(stat === "new") stat2 = "cases";

		const f = models[stats[stat2].model].f(schema[region][city].forecasts[stat2]);

		for(let t = 0; t < tMax; ++t) points.push(Math.round(f(t) - (stat === stat2 ? 0 : f(t - 1))));

		this.chart.setLines([
			{ color: stat === "deceased" ? "#808080" : "#000000", legend: dict.forecast[language], points },
			{ color: stats[stat].color, legend: stats[stat].legend[language], points: schema[region][city].recordset[stat] }
		]);
		this.chart.setState({});
	}

	render() {
		const { i, language, parent } = this.props;
		const { forecasts } = parent.parent.state;
		const forecast = forecasts[i];
		let { city, region, stat } = forecast;

		if(! city) city = 0;
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
				<Chart id={"f" + i} language={language} parent={this} ref={ref => (this.chart = ref)} title={schema[region][city].name} />
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

		this.chart.setLines(lines.map(([stat, { color, legend }]) => ({ color, legend: legend[language], points: schema[region][city].recordset[stat] })));
		this.chart.setState({});
	}

	render() {
		const { cityOptions, parent, regionOptions } = this.props;
		const { city, forecasts, language, region } = parent.state;

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
					<Chart id="lines" language={language} parent={this} ref={ref => (this.chart = ref)} title={schema[region][city].name} />
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
