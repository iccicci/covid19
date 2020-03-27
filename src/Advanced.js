import React, { Component } from "react";

const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;
const dict = { desktop: { e: "Advanced view is available only on desktop!", i: "La visualizzazione avanzata è disponibile solo su desktop" } };
let shift;

document.addEventListener("keydown", event => event.keyCode === 16 ? (shift = true) : null);
document.addEventListener("keyup", event => event.keyCode === 16 ? (shift = false) : null);

class Advanced extends Component {
	render() {
		const { language, region } = this.props;

		return <div>{mobile ? dict.desktop[language] : this.props.region}</div>;
	}
}

export default Advanced;
