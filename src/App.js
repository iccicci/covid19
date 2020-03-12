import React, { Component } from "react";
import { compressToBase64, decompressFromBase64 } from "./lz-string";
import { day2date, groups, prociv, refresh, stats } from "./definitions";
import "./App.css";

import CanvasJSReact from "./canvasjs.react";

function Option(props) {
	return (
		<button className={props.enabled ? "EnabledOption" : "DisabledOption"} onClick={props.onClick}>
			{props.short}
		</button>
	);
}

class App extends Component {
	constructor() {
		super();
		this.state = { ...groups.all.state, l: "i", r: 0 };
	}

	componentDidMount() {
		const { hash, origin } = window.location;

		this.origin = origin + "/#";

		if(hash) {
			try {
				this.setState(JSON.parse(decompressFromBase64(hash.substr(1))));
			} catch(e) {}
		}

		refresh(() => this.setState({}));
	}

	render() {
		console.log("render", new Date().toISOString());
		if(! prociv[0]) return <div className="App" />;

		const { l, r } = this.state;

		const optionItems = [...prociv]
			.sort((a, b) => (a.code === 0 ? -1 : b.code === 0 ? 1 : a.name < b.name ? -1 : 1))
			.map(region => (
				<option key={region.code} value={region.code}>
					{region.name}
				</option>
			));

		const options = {
			axisX: { valueFormatString: "DD-MMM", labelAngle: -50 },
			title: { fontSize: 20, text: prociv[r].name },
			data:  Object.entries(stats)
				.filter(([stat, value]) => this.state[stat])
				.map(([stat, value]) => ({
					color:        value.color,
					dataPoints:   prociv[r].data.map((e, i) => ({ x: day2date[i], y: e[stat] })).filter((e, i) => i > 5),
					legendText:   value.legend[l],
					markerType:   "circle",
					showInLegend: true,
					type:         "line"
				}))
		};

		window.history.pushState({}, null, this.origin + compressToBase64(JSON.stringify(this.state)));

		return (
			<div className="App">
				<header>
					<p>
						{l === "i" ? "lingua" : "language"}:
						<Option enabled={l === "e"} short="english" onClick={() => this.setState({ l: "e" })} />
						<Option enabled={l === "i"} short="italiano" onClick={() => this.setState({ l: "i" })} />
					</p>
					<p>
						trends:
						{Object.entries(stats).map(([stat, value]) => (
							<Option enabled={this.state[stat]} key={stat} short={value.desc[l]} onClick={() => this.setState({ [stat]: this.state[stat] ? 0 : 1 })} />
						))}
					</p>
					<p>
						{l === "i" ? "gruppi" : "groups"}:
						{Object.entries(groups).map(([group, value]) => (
							<Option enabled={true} key={group} short={value.desc[l]} onClick={() => this.setState(value.state)} />
						))}
					</p>
					<p>
						{l === "i" ? "regione: " : "region: "}
						<select value={r} onChange={event => this.setState({ r: event.target.value })}>
							{optionItems}
						</select>
					</p>
					<div>
						<CanvasJSReact.CanvasJSChart options={options} />
					</div>
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
