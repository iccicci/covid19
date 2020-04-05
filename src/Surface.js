import React, { Component } from "react";

import { schema, stats } from "./schema";
import { registerForecastsHandle, unregisterForecastsHandle } from "./forecasts";

const dict = {
	data:    { e: "data", i: "dato" },
	day:     { e: "day", i: "giorno" },
	desktop: {
		e: (
			<span>
				<b>COMING SOON: </b>horizontal zoom: <b>wheel</b> - vertical zoom: <b>&lt;SHIFT> + wheel</b>
			</span>
		),
		i: (
			<span>
				<b>A BREVE: </b>zoom orizzontale: <b>rotella</b> - zoom verticale: <b>&lt;SHIFT> + rotella</b>
			</span>
		)
	},
	err:      { e: "error", i: "errore" },
	error:    { e: "Not enough data to produce a valid forecast for", i: "Non ci sono ancora abbastanza dati per fare una proiezione affidabile in" },
	forecast: { e: "forecast", i: "proiezione" },
	mobile:   { e: "horizontal zoom - vertical zoom", i: "zoom orizzontale - zoom verticale" },
	record:   { e: "record", i: "registrato" },
	units:    { e: "units", i: "unità" }
};

const drawXOffset = 50;
const drawYOffset = 20;
const imgScale = window.devicePixelRatio;
const lines = {};
const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;
const relevant = ["home", "cases", "deceased", "intensive", "symptoms", "hospitalized", "positives", "healed"];
const rgb = { deceased: { r: 200, g: 100, b: 30 }, intensive: { r: 255, g: 0, b: 0 }, symptoms: { r: 255, g: 128, b: 0 }, home: { r: 255, g: 255, b: 0 }, cases: { r: 0, g: 255, b: 0 } };
const tip = [
	["cases", "#000000"],
	["healed", "#00dd00"],
	["positives", "#000000"],
	["home", "#dddd00"],
	["hospitalized", "#000000"],
	["symptoms", "#ff8000"],
	["intensive", "#dd0000"],
	["deceased", "#c8641e"]
];

const records = [
	["#00c000", ["deceased", "intensive", "symptoms", "home", "healed"]],
	["#c0c000", ["deceased", "intensive", "symptoms", "home"]],
	["#c06000", ["deceased", "intensive", "symptoms"]],
	["#c00000", ["deceased", "intensive"]],
	["#64320f", ["deceased"]]
];

//console.log(JSON.stringify(records.map(e => [e[0], e[1].map(r => Object.keys(stats).reduce((c, s) => (c ? c : stats[s].url === r[0] ? s : null), null))])));

let isPortrait;
let shift;
let x2t = () => 0;
let y2units = () => 0;

document.addEventListener("keydown", event => (event.keyCode === 16 ? (shift = true) : null));
document.addEventListener("keyup", event => (event.keyCode === 16 ? (shift = false) : null));

relevant.forEach(stat => (lines[stat] = { f: () => 0 }));

class ToolTip extends Component {
	constructor() {
		super();
		this.state = { day: 0, display: "none", left: "0px", top: "0px" };
	}

	hide() {
		this.setState({ day: 0 });
	}

	render() {
		const { language, region } = this.props;
		const { day, display, left, units, top } = this.state;
		const forecasts = {};
		const functions = {};
		const record = {};
		const date = new Date(2020, 1, 18 + day, 3).toISOString().substr(5, 5);

		if(schema[region][0].recordset.cases[day]) Object.keys(lines).forEach(stat => (record[stat] = schema[region][0].recordset[stat][day]));

		relevant.forEach(stat => {
			if(schema[region][0].recordset[stat][day]) record[stat] = schema[region][0].recordset[stat][day];
			forecasts[stat] = functions[stat] = Math.floor(lines[stat].f(day));
			if(stat === "healed") forecasts.healed = forecasts.cases - forecasts.deceased - forecasts.positives;
			if(stat === "positives") forecasts.positives = forecasts.home + forecasts.hospitalized;
			if(stat === "hospitalized") forecasts.hospitalized = forecasts.intensive + forecasts.symptoms;
		});

		const single = stat => (forecasts[stat] < 2 && functions[stat] < 2 ? 0 : Math.abs(forecasts[stat] - functions[stat]) / Math.max(forecasts[stat], functions[stat]));
		const error = 100 * ["healed", "positives", "hospitalized"].reduce((avg, stat) => avg + single(stat), 0);

		return (
			<div className="Table" style={{ display, left, top }} onTouchStart={event => this.hide()}>
				<div className="TRow">
					<div className="TCellL">{dict.day[language]}:</div>
					<div className="TCellR">{date}</div>
				</div>
				<div className="TRow">
					<div className="TCellL">{dict.units[language]}:</div>
					<div className="TCellR">{units}</div>
				</div>
				<div className="TRow">
					<div className="TCellL">{dict.data[language]}:</div>
					<div className="TCellR">{dict[record.cases ? "record" : "forecast"][language]}</div>
				</div>
				{tip.map(([stat, color]) => (
					<div className="TRow" key={stat}>
						<div className="TCellL">
							<span style={{ color }}>{stats[stat].legend[language]}</span>:
						</div>
						<div className="TCellR">{record.cases ? record[stat] : forecasts[stat]}</div>
					</div>
				))}
				<div className="TRow">
					<div className="TCellL">{dict.err[language]}:</div>
					<div className="TCellR">{record.cases ? "NA" : "±" + error.toFixed(2) + "%"}</div>
				</div>
			</div>
		);
	}

	setState(state) {
		const { day, units, x, y } = state;

		if(day < 6 || units < 0) return super.setState({ display: "none" });

		state.display = "table";

		const distance = mobile ? 50 : 5;
		const sizeX = 193 + distance;
		const sizeY = 212 + distance;

		if(y > sizeY) {
			state.left = (x > sizeX ? x - sizeX : 0) + "px";
			state.top = y - sizeY + "px";
		} else if(mobile && isPortrait && x <= sizeX) {
			state.left = "0px";
			state.top = y + distance + "px";
		} else {
			state.left = x + (x > sizeX ? -sizeX : distance) + "px";
			state.top = "0px";
		}

		super.setState(state);
	}
}

export class SurfaceChart extends Component {
	constructor(props) {
		super(props);

		this.disappeared = false;
		this.prevProps = {};
		this.state = {};
		this.viewportHeight = window.innerHeight;
		this.viewportWidth = window.innerWidth;

		isPortrait = this.viewportHeight > this.viewportWidth;
	}

	componentDidMount() {
		this.registerHandle();
		this.handleResize = () => this.resize();
		window.addEventListener("resize", this.handleResize);
	}

	componentDidUpdate() {
		this.registerHandle();
		//		this.draw();
	}

	componentWillUnmount() {
		this.unregisterHandle();
		window.removeEventListener("resize", this.handleResize);
	}

	registerHandle() {
		const { region } = this.props.parent.state;
		const prevProps = { region };

		Object.entries(prevProps).forEach(([key, value]) => {
			if(this.prevProps[key] !== value) {
				this.unregisterHandle();
				this.prevProps = prevProps;
				this.forecastHandle = registerForecastsHandle(region, 0, () => {
					this.retrivedData = true;

					let error = false;
					let tmax = 0;

					Object.keys(stats).forEach(stat => (error = ! schema[region][0].forecasts[stat].model));

					if(error) return this.setState({ error: true });

					relevant.forEach(stat => {
						const { data, model } = schema[region][0].forecasts[stat];
						const { f, tMax } = model;

						if(tmax < tMax) tmax = tMax;

						lines[stat] = { data, f };
					});

					this.lines = lines;
					this.tMax = tmax;
					this.setState({ error }, () => this.resize());
				});
			}
		});
	}

	unregisterHandle() {
		if(this.forecastHandle) unregisterForecastsHandle(this.forecastHandle);
	}

	handleMouseMove(event) {
		if(mobile) return;

		if(this.hideTimeout) clearTimeout(this.hideTimeout);

		this.handleToolTip(event);
	}

	handleMouseOut() {
		if(this.hideTimeout) clearTimeout(this.hideTimeout);

		this.hideTimeout = setTimeout(() => this.tooltip.hide((this.hideTimeout = null)), 300);
	}

	handleToolTip(event) {
		const { clientX, clientY, target } = event;
		const rect = target.getBoundingClientRect();
		const offsetX = clientX - rect.left;
		const offsetY = clientY - rect.top;

		if(offsetX < 0 || offsetY < 0) return this.tooltip.hide();

		this.tooltip.setState({ day: x2t(offsetX) + 1, units: y2units(offsetY), x: clientX, y: clientY });
	}

	handleTouchEnd(event) {}

	handleTouchMove(event) {
		this.handleToolTip(event.touches[0], true);
	}

	handleTouchStart(event) {
		this.handleToolTip(event.touches[0], true);
	}

	render() {
		const { language, region } = this.props.parent.state;

		return this.retrivedData ? (
			this.state.error ? (
				<div align="center" className="Error">{`${dict.error[language]} ${schema[region][0].name}`}</div>
			) : (
				<div>
					{/*<p id="tip">{dict[mobile ? "mobile" : "desktop"][language]}</p>*/}
					<div align="center">
						<canvas
							ref={ref => (this.canvas = ref)}
							onMouseMove={event => this.handleMouseMove(event)}
							onMouseOut={event => this.handleMouseOut(event)}
							onTouchEnd={event => this.handleTouchEnd(event)}
							onTouchMove={event => this.handleTouchMove(event)}
							onTouchStart={event => this.handleTouchStart(event)}
						/>
						<ToolTip language={language} ref={ref => (this.tooltip = ref)} region={region} />
					</div>
				</div>
			)
		) : null;
	}

	resize() {
		const newViewportHeight = window.innerHeight;
		const newViewportWidth = window.innerWidth;
		const newIsPortrait = newViewportHeight > newViewportWidth;
		const rest = document.getElementById("head").clientHeight + document.getElementById("foot").clientHeight; // + document.getElementById("tip").clientHeight;

		if(mobile) {
			if(newIsPortrait !== isPortrait) window.location.reload();
			if(this.disappeared) return;
			if(newViewportHeight > this.viewportHeight) {
				this.disappeared = true;
				this.canvas.style.touchAction = "none";
			}
		}

		this.viewportHeight = newViewportHeight;
		this.viewportWidth = newViewportWidth;
		isPortrait = this.viewportHeight > this.viewportWidth;

		if(this.state.error) return;

		this.canvas.style.width = (this.canvasWidth = this.viewportWidth - 20) + "px";
		this.canvas.style.height = (this.canvasHeight = this.viewportHeight - 30 - rest + (this.disappeared || ! mobile ? 0 : 200)) + "px";

		this.draw();
	}

	draw() {
		const { canvas, canvasWidth, canvasHeight, lines, tMax } = this;
		const { region } = this.props.parent.state;

		if(! this.tMax) return;
		if(! this.canvas) return;

		canvas.width = canvasWidth * imgScale;
		canvas.height = canvasHeight * imgScale;

		const ctx = canvas.getContext("2d");

		ctx.scale(imgScale, imgScale);

		let yMax = 0;

		for(let t = 6; t <= tMax; ++t) {
			const yc = lines.cases.f(t);
			const ys = lines.deceased.f(t) + lines.healed.f(t) + lines.positives.f(t);

			if(yMax < yc) yMax = yc;
			if(yMax < ys) yMax = ys;
		}

		const chartXmin = 5.5;
		const chartXmax = tMax + 0.5;
		const chartWidth = chartXmax - chartXmin;
		const chartYmin = 0;
		const chartYmax = yMax * 1.01;
		const chartHeight = chartYmax - chartYmin;
		const drawWidth = canvasWidth - drawXOffset;
		const drawHeight = canvasHeight - drawYOffset;
		const imgWidth = Math.floor((canvasWidth - drawXOffset) * imgScale);
		const imgHeight = Math.floor((canvasHeight - drawYOffset) * imgScale);
		const viewXmin = chartXmin;
		const viewXmax = chartXmax;
		const viewWidth = chartWidth;
		const view2CanvasXScale = drawWidth / viewWidth;
		const view2ImgXScale = imgWidth / viewWidth;
		const viewYmin = chartYmin;
		const viewYmax = chartYmax;
		const viewHeight = chartHeight;
		const view2CanvasYScale = drawHeight / viewHeight;
		const view2ImgYScale = imgHeight / viewHeight;
		const step = imgWidth * 4;

		const x2Canvas = x => (x - viewXmin) * view2CanvasXScale + drawXOffset;
		const y2Canvas = y => drawHeight - (y - viewYmin) * view2CanvasYScale;
		const x2Img = x => Math.floor((x - viewXmin) * view2ImgXScale);
		const y2Img = y => imgHeight - Math.floor((y - viewYmin) * view2ImgYScale) - 1;

		x2t = x => Math.floor((x - drawXOffset) / view2CanvasXScale + viewXmin);
		y2units = y => Math.floor((drawHeight - y) / view2CanvasYScale + viewYmin);

		const back = ctx.getImageData(drawXOffset * imgScale, 0, imgWidth, imgHeight);

		for(let i = 0; i < imgWidth; ++i) {
			const t = viewXmin + i / view2ImgXScale;

			let first = (i + imgWidth * (imgHeight - 1)) * 4;
			let sum = 0;

			["deceased", "intensive", "symptoms", "home", "cases"].forEach(stat => {
				const f = this.lines[stat].f(t);
				const last = y2Img((stat === "cases" ? 0 : sum) + f) * imgWidth * 4;
				const { r, g, b } = rgb[stat];

				for(let y = first; y > last; y -= step) {
					back.data[y] = r;
					back.data[y + 1] = g;
					back.data[y + 2] = b;
					back.data[y + 3] = 255;
				}

				first -= Math.floor(f * view2ImgYScale) * imgWidth * 4;
				sum += f;
			});
		}

		ctx.putImageData(back, drawXOffset * imgScale, 0);

		records.forEach(([color, adds]) => {
			const sum = day => adds.reduce((tot, stat) => tot + schema[region][0].recordset[stat][day], 0);

			ctx.lineWidth = 2;
			ctx.strokeStyle = color;
			ctx.beginPath();
			ctx.moveTo(x2Canvas(6), y2Canvas(sum(6)));
			schema[region][0].recordset.cases.forEach((e, i) => (i > 6 ? ctx.lineTo(x2Canvas(i), y2Canvas(sum(i))) : null));
			ctx.stroke();
		});

		const img = ctx.getImageData(drawXOffset * imgScale, 0, imgWidth, imgHeight);

		const drawXScale = () => {
			let steps = 1;

			while(steps * view2CanvasXScale < 35) ++steps;

			ctx.fillStyle = "#ffffff";
			ctx.fillRect(drawXOffset, canvasHeight - drawYOffset, canvasWidth - drawXOffset, drawYOffset);
			ctx.fillStyle = "#000000";
			ctx.font = "12px Arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "top";

			for(let t = Math.ceil(viewXmin); t < viewXmax; t += steps) {
				const first = x2Img(t) * 4;
				const last = imgWidth * imgHeight * 4;

				for(let i = first; i < last; i += step) {
					img.data[i] = 64;
					img.data[i + 1] = 64;
					img.data[i + 2] = 64;
					img.data[i + 3] = 255;
				}

				ctx.fillText(new Date(2020, 1, 18 + t, 3).toISOString().substr(5, 5), x2Canvas(t), drawHeight + 2);
			}
		};

		const drawYScale = () => {
			let next = true;
			let scale = (viewYmax - viewYmin) / (drawHeight / 50);
			let prev = 1;
			let diff = scale;
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

				if(Math.abs(scale - uni * exp) < diff) {
					prev = uni * exp;
					diff = Math.abs(scale - prev);
				} else {
					next = false;
					scale = prev;
				}
			}

			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, drawXOffset, canvasHeight);
			ctx.fillStyle = "#000000";
			ctx.font = "12px Arial";
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";

			for(let units = Math.floor(viewYmin / scale) * scale; units < viewYmax; units += scale) {
				const first = imgWidth * 4 * y2Img(units);
				const last = first + imgWidth * 4;

				for(let i = first; i < last; i += 4) {
					img.data[i] = 64;
					img.data[i + 1] = 64;
					img.data[i + 2] = 64;
					img.data[i + 3] = 255;
				}

				ctx.fillText(units, drawXOffset - 2, y2Canvas(units));
			}
		};

		drawYScale();
		drawXScale();

		ctx.putImageData(img, drawXOffset * imgScale, 0);
	}
}
