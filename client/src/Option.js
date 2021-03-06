import React from "react";
import { Link } from "react-router-dom";

export function Option(props) {
	return (
		<button className={props.enabled ? "EnabledOption" : "DisabledOption"} onClick={props.onClick} style={props.style}>
			{props.desc}
		</button>
	);
}

function toggleClass(event) {
	event.target.classList.toggle("NoDecoration");
}

export function OptionLink({ desc, disabled, onClick, to }) {
	return (
		<Link to={to} onClick={onClick ? onClick : () => {}} onMouseOut={toggleClass} onMouseOver={toggleClass} style={disabled ? { color: "gray" } : {}}>
			{desc}
		</Link>
	);
}
