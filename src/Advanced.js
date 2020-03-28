import React, { Component } from "react";
import { prociv, getData, stats } from "./definitions";
import { gauss } from "./gauss";

const dict = {
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
	error:  { e: "Not enough data to produce a valid forecast for", i: "Non ci sono ancora abbastanza dati per fare una proiezione affidabile in" },
	mobile: { e: "horizontal zoom - vertical zoom", i: "zoom orizzontale - zoom verticale" }
};

const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;

let shift;

document.addEventListener("keydown", event => (event.keyCode === 16 ? (shift = true) : null));
document.addEventListener("keyup", event => (event.keyCode === 16 ? (shift = false) : null));

class Advanced extends Component {
	constructor() {
		super();
		this.disappeared = false;
		this.state = {};
		this.viewportHeight = window.innerHeight;
		this.viewportWidth = window.innerWidth;
		this.isPortrait = this.viewportHeight > this.viewportWidth;
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

	draw() {
		const canvas = this.refs.canvas;

		if(! this.tMax) return;
		if(! this.refs.canvas) return;

		const scale = window.devicePixelRatio;

		canvas.width = this.canvasWidth * scale;
		canvas.height = this.canvasHeight * scale;

		const ctx = canvas.getContext("2d");

		ctx.scale(scale, scale);

		var imgData = ctx.createImageData(this.canvasWidth * scale, this.canvasHeight * scale);
		var w = imgData.width;
		var h = imgData.height;
		console.log(imgData);
		/*
		for(let i = 0; i < 5000; ++i) {
			let o = w * 4 * i + i * 4;
			imgData.data[o + 0] = 0;
			imgData.data[o + 1] = 0;
			imgData.data[o + 2] = 0;
			imgData.data[o + 3] = 255;
        }
        */
		for(let i = 0; i < w; ++i) {
			let o = 4 * i;
			imgData.data[o + 0] = 0;
			imgData.data[o + 1] = 0;
			imgData.data[o + 2] = 0;
			imgData.data[o + 3] = 255;
		}
		for(let i = 0; i < h; ++i) {
			let o = w * i * 4;
			imgData.data[o + 0] = 0;
			imgData.data[o + 1] = 0;
			imgData.data[o + 2] = 0;
			imgData.data[o + 3] = 255;
		}
		imgData.data[3] = imgData.data[w * h * 4 - 1] = imgData.data[(w - 1) * (h - 1) * 4 - 5] = imgData.data[w * h * 4 - 9] = 255;
		imgData.data[3] = imgData.data[w * h * 4 - 1] = imgData.data[(w - 1) * (h - 1) * 4 - 5] = imgData.data[w * h * 4 - 9] = 255;
		ctx.putImageData(imgData, 0, 0);

		ctx.fillStyle = "#bada55";
		ctx.fillRect(10, 10, 300, 300);
		ctx.fillStyle = "#ffffff";
		ctx.font = "12px Helvetica";
		/*
		ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        */

		var textString = "this.canvasWidth";
		ctx.fillText(this.canvasWidth, 200, 20);
		ctx.fillText(this.canvasHeight, 200, 40);
		ctx.fillText(scale, 200, 60);
		ctx.fillText(w, 200, 80);
		ctx.fillText(h, 200, 100);
		ctx.fillText(imgData.width, 200, 120);
		ctx.fillText(imgData.height, 200, 140);
		ctx.fillText(ctx.measureText("1.000.000").width, 200, 160);
		ctx.fillStyle = "#000000";
		ctx.fillText("1.000.000", 55 - ctx.measureText("1.000.000").width, 20);
		ctx.fillText("800.000", 55 - ctx.measureText("800.000").width, 40);
		ctx.fillText("70.000", 55 - ctx.measureText("70.000").width, 60);
		ctx.fillText("1.000", 55 - ctx.measureText("1.000").width, 80);
		ctx.fillText("500", 55 - ctx.measureText("500").width, 100);
	}

	forecast(region) {
		const last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);
		const lines = {};

		let tmax = 0;

		if(last === this.last && region === this.region) return;

		this.error = false;
		this.last = last;
		this.region = region;

		try {
			["a", "b", "c", "d", "h", "i", "p", "s"].forEach(stat => {
				const data = getData(stat, region);
				const { fs, tMax } = gauss(data, stat, region);
				const f = fs[7];
				console.log(fs, tMax);

				if(tmax < tMax) tmax = tMax;

				lines[stat] = { data, f };
			});
		} catch(e) {
			return this.setState({ error: true });
		}

		console.log(tmax, lines);
		this.lines = lines;
		this.tMax = tmax;
		this.setState({ error: false }, () => {
			this.resize();
			this.draw();
		});
	}

	render() {
		const { language, region } = this.props;

		return (
			<div>
				<p id="tip">{dict[mobile ? "mobile" : "desktop"][language]}</p>
				<div align="center">{this.state.error ? <div className="Error">{`${dict.error[language]} ${prociv[region].name}`}</div> : <canvas id="canv" ref="canvas" />}</div>
			</div>
		);
	}

	resize() {
		const newViewportHeight = window.innerHeight;
		const newViewportWidth = window.innerWidth;
		const isPortrait = newViewportHeight > newViewportWidth;
		const rest = document.getElementById("head").clientHeight + document.getElementById("foot").clientHeight + document.getElementById("tip").clientHeight;
		const hasOrientationChanged = isPortrait !== this.isPortrait;
		let doIt;

		if(hasOrientationChanged) window.location.reload();
		if(newViewportHeight !== this.viewportHeight && newViewportHeight >= this.viewportHeight) {
			this.disappeared = true;
			doIt = true;
		}

		if(doIt || ! mobile) {
			this.viewportHeight = newViewportHeight;
			this.viewportWidth = newViewportWidth;
			this.isPortrait = this.viewportHeight > this.viewportWidth;
		}

		if(this.state.error) return;

		this.refs.canvas.style.width = (this.canvasWidth = this.viewportWidth - 20) + "px";
		this.refs.canvas.style.height = (this.canvasHeight = this.viewportHeight - 30 - rest + (this.disappeared || ! mobile ? 0 : 200)) + "px";

		this.draw();
	}
}

export default Advanced;
