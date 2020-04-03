import React from "react";

function Option(props) {
	return (
		<button className={props.enabled ? "EnabledOption" : "DisabledOption"} onClick={props.onClick} style={props.style}>
			{props.desc}
		</button>
	);
}

export default Option;
