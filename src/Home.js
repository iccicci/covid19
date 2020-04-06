import React, { Component, useState } from "react";
import { Header } from "./Header";
import Andamento from "./img/Coronavirus-Grafico-Proiezioni-Picco-Andamento.jpg";
import Grafico from "./img/Coronavirus-Grafico.jpg";
import Picco from "./img/Coronavirus-Grafico-Proiezioni-Picco.jpg";
import Proiezioni from "./img/Coronavirus-Grafico-Proiezioni.jpg";

import Jumbotron from "react-bootstrap/Jumbotron";
import Toast from "react-bootstrap/Toast";
import Container from "react-bootstrap/Container";

export class Home extends Component {
	render() {
		return (
			<div>
				<Header />
				<div className="Content" id="Content">
					<p>
						a cura di:{" "}
						<a href="https://www.trinityteam.it/DanieleRicci" target="_blank" rel="noopener noreferrer">
							Daniele Ricci
						</a>
					</p>
					<p>
						per suggerimenti, richieste e segnalazioni:{" "}
						<a href="https://github.com/iccicci/covid19/issues" target="_blank" rel="noopener noreferrer">
							GitHub
						</a>
					</p>
					<h3>Il Grafico</h3>
					<p>Alla fine di febbraio ci siamo trovati tutti chiusi in casa in quarantena per colpa del coronavirus.</p>
					<p>
						I miei primi interrogativi erano: “come starà andando?” “quando finirà tutto questo?” e per cercare di trovare delle risposte seguivo con estrema attenzione entrambi i bollettini
						quotidiani divulgati a mezzo conferenza stampa della Protezione Civile (ricordate? Inizialmente erano due uno alle 12:00 ed uno alle 18:00). Sentirmi “raccontare” i numeri, però, non mi
						rendeva assolutamente chiara la situazione.
					</p>
					<p>
						Ho iniziato quindi una ricerca accurata su internet per trovare una visualizzazione grafica degli stessi dati… e ne ho trovate molte, anche assai gradevoli dal punto di vista estetico, ma
						decisamente nessuna di esse mi soddisfaceva da un punto di vista “statistico”.
					</p>
					<p>Ho pertanto deciso (alla stregua del Sig. Lamborghini quando si rese conto che non riusciva a trovare un’automobile che lo soddisfacesse) di fare un grafico per conto mio.</p>
					<p>Poi... per conto mio… sicuramente, nel senso che avesse le caratteristiche che mi interessano, ma dato che c’ero perché non renderlo pubblico?</p>
					<p style={{ paddingTop: "10px" }}>
						<img src={Grafico} alt="Grafico" className="Fit" />
					</p>
					<h3>Le Proiezioni</h3>
					<p>
						Mentre portavo avanti il mio lavoro, continuavo a seguire il bollettino quotidiano della Protezione Civile (che fu ben presto ridotto ad uno solo al giorno) e molte altre trasmissioni di
						approfondimento (tanto parlavano tutte solo del coronavirus).
					</p>
					<p>
						Le espressioni che mi tormentavano in quel periodo erano “andamento esponenziale”, “crescita esponenziale” e altre simili, come se fossimo tutti inevitabilmente destinati alla catastrofe
						(per chi non lo sa, l’andamento esponenziale aumenta con una velocità che cresce anch’essa, e molto velocemente).
					</p>
					<p>In corso d’opera, ho quindi ritenuto interessante arricchire il mio grafico con delle proiezioni statistiche. </p>
					<p>
						Lo strumento fa cinque regressioni: lineare, di potenza, polinomiale di secondo e terzo grado e la fatidica regressione esponenziale; dopodiché le confronta e mostra solo le tre che meglio
						si adattano (che hanno il miglior fit) alla grandezza che stiamo osservando (totale casi, terapia intensiva, guariti, ecc.).
					</p>
					<p>
						Già questo è servito molto a tranquillizzarmi: era facile vedere che raramente l’andamento era esponenziale, molto spesso gli andamenti erano di terzo grado o, più genericamente,
						geometrici (ovvero{" "}
						<i>
							at<sup>b</sup>
						</i>{" "}
						con <i>b≅3</i>, piuttosto che{" "}
						<i>
							ae<sup>bt</sup>
						</i>
						).
					</p>{" "}
					<p style={{ paddingTop: "10px" }}>
						<img src={Proiezioni} alt="Proiezioni" className="Fit" />
					</p>
					<h3>Il picco</h3>
					<p>
						Indipendentemente da quanto ho potuto constatare dal mio grafico, ero comunque cosciente che nel lungo periodo (ma speriamo più breve possibile) l’andamento delle curve avrebbe dovuto
						assumere l’aspetto della campana di Gauss (e relativi integrali e derivate): l’andamento che rivela quando sarà il picco del contagio.
					</p>
					<p>Evidentemente non ero il solo ad avere questa consapevolezza: anche in televisione il tormentone “il picco” aveva spodestato l’ ”andamento esponenziale”.</p>
					<p>
						Chi ha adeguate conoscenze matematiche sa bene che non ha senso cercare di fare una proiezione di questo tipo all’inizio del fenomeno, ma in previsione che prima o poi il momento adatto
						sarebbe arrivato ho aggiunto anche questo tipo di regressione. Nello specifico ho utilizzato l’algoritmo di Gauss-Newton, ma credo che questo interessi pochissime persone.
					</p>
					<p>
						Considerazione matematiche a parte, piano piano i numeri hanno preso un andamento tale per cui anche queste proiezioni hanno iniziato ad avere un senso e finalmente ho potuto vedere
						(secondo il mio modesto modello) che il picco del contagio sarà tra il 3 ed il 5 aprile.
					</p>
					<p style={{ paddingTop: "10px" }}>
						<img src={Picco} alt="Picco" className="Fit" />
					</p>
					<h3>La proiezione di andamento</h3>
					<p>
						Raggiunto questo obiettivo è stato semplice realizzare un grafico per una proiezione complessiva dello sviluppo del contagio da coronavirus: si trattava solo di aggregare i dati ottenuti
						dai calcoli precedenti.
					</p>
					<p style={{ paddingTop: "10px" }}>
						<img src={Andamento} alt="Andamento" className="Fit" />
					</p>
					<h3>E non finisce qui!</h3>
					<p>
						In realtà l’andamento più plausibile è quello a “picco asimmetrico”, ma per ragioni simili a quelle citate poco fa, ancora non ha senso fare previsioni di questo tipo (ma le faremo, non
						temete), quindi per ora, impiego il mio tempo continuando a lavorare per migliorare il grafico aggregato.
					</p>
				</div>
				<Container className="p-3">
					<Jumbotron>
						<h1 className="header">Welcome To React-Bootstrap</h1>
						<ExampleToast>
							We now have Toasts
							<span role="img" aria-label="tada">
								🎉
							</span>
						</ExampleToast>
					</Jumbotron>
				</Container>
			</div>
		);
	}
}

const ExampleToast = ({ children }) => {
	const [show, toggleShow] = useState(true);

	return (
		<Toast show={show} onClose={() => toggleShow(! show)}>
			<Toast.Header>
				<strong className="mr-auto">React-Bootstrap</strong>
			</Toast.Header>
			<Toast.Body>{children}</Toast.Body>
		</Toast>
	);
};
