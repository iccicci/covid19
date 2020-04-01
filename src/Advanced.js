import React, { Component } from "react";

import { prociv, getData, stats } from "./definitions";
import { gauss } from "./gauss";

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
const relevant = ["a", "c", "d", "i", "s", "b", "p", "h"];
const rgb = { d: { r: 200, g: 100, b: 30 }, i: { r: 255, g: 0, b: 0 }, s: { r: 255, g: 128, b: 0 }, a: { r: 255, g: 255, b: 0 }, c: { r: 0, g: 255, b: 0 } };
const tip = [
	["c", "#000000"],
	["h", "#00dd00"],
	["p", "#000000"],
	["a", "#dddd00"],
	["b", "#000000"],
	["s", "#ff8000"],
	["i", "#dd0000"],
	["d", "#c8641e"]
];

const records = [
	["#00c000", ["d", "i", "s", "a", "h"]],
	["#c0c000", ["d", "i", "s", "a"]],
	["#c06000", ["d", "i", "s"]],
	["#c00000", ["d", "i"]],
	["#64320f", ["d"]]
];

let isPortrait;
let reg = 0;
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
		const { language } = this.props;
		const { day, display, left, units, top } = this.state;
		const forecasts = {};
		const functions = {};
		const record = {};
		const date = new Date(2020, 1, 18 + day, 3).toISOString().substr(5, 5);

		if(prociv[reg].data[day]) Object.keys(lines).forEach(stat => (record[stat] = prociv[reg].data[day][stat]));

		relevant.forEach(stat => {
			if(prociv[reg].data[day]) record[stat] = prociv[reg].data[day][stat];
			forecasts[stat] = functions[stat] = Math.floor(lines[stat].f(day));
			if(stat === "h") forecasts.h = forecasts.c - forecasts.d - forecasts.p;
			if(stat === "p") forecasts.p = forecasts.a + forecasts.b;
			if(stat === "b") forecasts.b = forecasts.i + forecasts.s;
		});

		const single = stat => (forecasts[stat] < 2 && functions[stat] < 2 ? 0 : Math.abs(forecasts[stat] - functions[stat]) / Math.max(forecasts[stat], functions[stat]));
		const error = 100 * ["h", "p", "b"].reduce((avg, stat) => avg + single(stat), 0);

		return (
			<div className="Table" style={{ display, left, top }} onMouseMove={() => this.hide()}>
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
					<div className="TCellR">{dict[record.c ? "record" : "forecast"][language]}</div>
				</div>
				{tip.map(([stat, color]) => (
					<div className="TRow" key={stat}>
						<div className="TCellL">
							<span style={{ color }}>{stats[stat].legend[language]}</span>:
						</div>
						<div className="TCellR">{record.c ? record[stat] : forecasts[stat]}</div>
					</div>
				))}
				<div className="TRow">
					<div className="TCellL">{dict.err[language]}:</div>
					<div className="TCellR">{record.c ? "NA" : "±" + error.toFixed(2) + "%"}</div>
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

class Advanced extends Component {
	constructor() {
		super();
		this.disappeared = false;
		this.state = {};
		this.viewportHeight = window.innerHeight;
		this.viewportWidth = window.innerWidth;
		isPortrait = this.viewportHeight > this.viewportWidth;
	}

	componentDidMount() {
		this.handleResize = () => this.resize();
		window.addEventListener("resize", this.handleResize);

		this.resize();
		this.forecast(this.props.region);
	}

	componentDidUpdate() {
		this.forecast(this.props.region);
		this.draw();
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
	}

	forecast(region) {
		const last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);

		let tmax = 0;

		if(last === this.last && region === this.region) return;

		this.error = false;
		this.last = last;
		this.region = region;

		try {
			relevant.forEach(stat => {
				const data = getData(stat, region);
				const { fs, tMax } = gauss(data, stat, region);
				const f = fs[7];

				if(tmax < tMax) tmax = tMax;

				lines[stat] = { data, f };
			});
		} catch(e) {
			return this.setState({ error: true });
		}

		this.lines = lines;
		this.tMax = tmax;
		this.setState({ error: false }, () => {
			this.resize();
			this.draw();
		});
	}

	handleMouseMove(event) {
		if(mobile) return;

		this.handleToolTip(event);
	}

	handleToolTip(event) {
		const { clientX, clientY, target } = event;
		const rect = target.getBoundingClientRect();
		const offsetX = clientX - rect.left;
		const offsetY = clientY - rect.top;

		if(offsetX < 0 || offsetY < 0) return this.tooltip.hide();

		this.tooltip.setState({ day: x2t(offsetX), units: y2units(offsetY), x: clientX, y: clientY });
	}

	handleTouchEnd(event) {}

	handleTouchMove(event) {
		this.handleToolTip(event.touches[0], true);
	}

	handleTouchStart(event) {
		this.handleToolTip(event.touches[0], true);
	}

	render() {
		const { language, region } = this.props;

		reg = region;

		return (
			<div>
				{/*<p id="tip">{dict[mobile ? "mobile" : "desktop"][language]}</p>*/}
				<div align="center">
					{this.state.error ? (
						<div className="Error">{`${dict.error[language]} ${prociv[region].name}`}</div>
					) : (
						<canvas
							ref={ref => (this.canvas = ref)}
							onMouseMove={event => this.handleMouseMove(event)}
							onMouseOut={() => this.tooltip.hide()}
							onTouchEnd={event => this.handleTouchEnd(event)}
							onTouchMove={event => this.handleTouchMove(event)}
							onTouchStart={event => this.handleTouchStart(event)}
						/>
					)}
					<ToolTip language={language} ref={ref => (this.tooltip = ref)} />
				</div>
			</div>
		);
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

	setState(state) {
		super.setState(state, () => {
			this.tooltip.hide();
			this.resize();
		});
	}

	draw() {
		const canvas = this.canvas;
		const { canvasWidth, canvasHeight, lines, tMax } = this;

		if(! this.tMax) return;
		if(! this.canvas) return;

		canvas.width = canvasWidth * imgScale;
		canvas.height = canvasHeight * imgScale;

		const ctx = canvas.getContext("2d");

		ctx.scale(imgScale, imgScale);

		let yMax = 0;

		for(let t = 6; t <= tMax; ++t) {
			const yc = lines.c.f(t);
			const ys = lines.d.f(t) + lines.h.f(t) + lines.p.f(t);

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

			["d", "i", "s", "a", "c"].forEach(stat => {
				const f = this.lines[stat].f(t);
				const last = y2Img((stat === "c" ? 0 : sum) + f) * imgWidth * 4;
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

		ctx.lineWidth = "1";
		records.forEach(([color, adds]) => {
			const sum = day => adds.reduce((tot, stat) => tot + prociv[reg].data[day][stat], 0);

			ctx.strokeStyle = color;
			ctx.beginPath();
			ctx.moveTo(x2Canvas(6), y2Canvas(sum(6)));
			prociv[reg].data.forEach((e, i) => (i > 6 ? ctx.lineTo(x2Canvas(i), y2Canvas(sum(i))) : null));
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

export default Advanced;
