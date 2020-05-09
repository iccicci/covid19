import React from "react";

export const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;

export class BaseToolTip extends React.Component {
	constructor(props) {
		super(props);

		this.min = 0;
		this.state = { day: 0, display: "none", left: "0px", top: "0px" };
	}

	hide() {
		this.setState({ day: -1 });
	}

	setState(state) {
		const { day, units } = state;

		if(day < 0 || units < this.min) return super.setState({ display: "none" });

		state.display = "table";

		this.subSetState(state);
		super.setState(state);
	}
}
