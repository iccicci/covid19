import React, { Component } from "react";
import Header from "./Header";
import Grafico from "./img/Grafico.jpg";
import Picco from "./img/Picco.jpg";
import Proiezioni from "./img/Proiezioni.jpg";

class Home extends Component {
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
					<p>Alla fine di febbraio ci siamo trovati tutti chiusi in casa in quarantena.</p>
					<p>
						I miei primi interrogativi erano: “come starà andando?” “quando finirà tutto questo?” e per cercare di trovare delle risposte mi guardavo con estrema attenzione entrambi i bollettini
						quotidiani divulgati a mezzo conferenza stampa della Protezione Civile (ricordate? Inizialmente erano due uno alle 12:00 ed uno alle 18:00), ma sentirmi “raccontare” i numeri non mi
						rendeva assolutamente chiara la situazione.
					</p>
					<p>
						Ho iniziato quindi una ricerca sfrenata su internet per trovare una visualizzazione grafica degli stessi dati… e ne ho trovate, anche di molto gradevoli dal punto di vista estetico, ma
						decisamente nessuno che mi soddisfacesse appieno da un punto di vista “statistico”.
					</p>
					<p>Ho pertanto deciso (alla stregua del Sig. Lamborghini quando si rese conto che non riusciva a trovare un’automobile che lo soddisfacesse) di farmene uno per conto mio.</p>
					<p>Poi... per conto mio… sicuramente, nel senso che avesse le caratteristiche che mi interessano, ma dato che c’ero perché non renderlo pubblico?</p>
					<p>
						<img src={Grafico} alt="Grafico" className="Fit" />
					</p>
					<h3>Le Proiezioni</h3>
					<p>
						Mentre portavo avanti il mio lavoro, continuavo a seguire il bollettino quotidiano della Protezione Civile (che fu ben presto ridotto ad uno solo al giorno) e molte altre trasmissioni di
						approfondimento, tanto solo di quello parlavano tutte.
					</p>
					<p>
						Le espressioni che mi tormentavano in quel periodo erano “andamento esponenziale”, “crescita esponenziale” e altre simili, come se fossimo tutti inevitabilmente destinati alla catastrofe
						(per chi non lo sa, l’andamento esponenziale che aumenta con una velocità che cresce anch’essa, e molto velocemente).
					</p>
					<p>
						In corso d’opera, ho quindi ritenuto interessante arricchire il mio grafico con delle proiezioni statistiche. Lo strumento fa cinque regressioni: lineare, di potenza, polinomiale di
						secondo e terzo grado e la fatidica regressione esponenziale; dopodiché le confronta e mostra solo le tre che meglio si adattano (che hanno il miglior fit) alla grandezza che stiamo
						osservando (totale casi, terapia intensiva, guariti, ecc.).
					</p>
					<p>
						Già questo è servito molto a tranquillizzarmi: era facile vedere che raramente l’andamento era esponenziale, molto spesso gli andamenti erano di terzo grado (ovvero{" "}
						<i>
							t<sup>3</sup>
						</i>{" "}
						piuttosto che{" "}
						<i>
							e<sup>t</sup>
						</i>
						).
					</p>
					<p>
						<img src={Proiezioni} alt="Proiezioni" className="Fit" />
					</p>
					<h3>Il picco</h3>
					<p>
						Indipendentemente da quanto ho potuto constatare dal mio grafico, ero comunque cosciente che nel lungo periodo (ma speriamo più breve possibile) l’andamento delle curve avrebbe dovuto
						assumere l’aspetto della campana di Gauss (e relativi integrali e derivate).
					</p>
					<p>Evidentemente non ero il solo ad avere questa consapevolezza: anche in televisione il tormentone “il picco” aveva spodestato l’ ”andamento esponenziale”.</p>
					<p>
						Chi ha adeguate conoscenze matematiche sa bene che non ha senso cercare di fare una proiezione di questo tipo all’inizio del fenomeno, ma in previsione che prima o poi il momento adatto
						sarebbe arrivato ho aggiunto anche questo tipo di regressione. Nello specifico ho utilizzato l’algoritmo di Gauss-Newton, ma credo che questo interessi pochissime persone.
					</p>
					<p>Considerazione matematiche a parte, piano piano i numeri hanno preso un andamento tale per cui anche queste proiezioni hanno un senso.</p>
					<p>
						<img src={Picco} alt="Picco" className="Fit" />
					</p>
					<h3>E non finisce qui!</h3>
					<p>
						In realtà l’andamento più plausibile è quello a “picco asimmetrico”, ma per ragioni simile a quelle citate poco fa ancora non ha ancora senso fare previsioni di questo tipo (ma le faremo,
						non temete), quindi per ora riempio il mio tempo lavorando ad una visualizzazione… diversa...
					</p>
				</div>
			</div>
		);
	}
}

export default Home;
