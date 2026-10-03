import catalogue from '../data/learning/catalogue.json';
import { Game, loadLearningData, regions, targetsFor, type Country, type GameConfig } from './game-model';
import { GameAudio } from './game-audio';
import type { createGameMap } from './game-map';
const countries = catalogue as Country[];
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) => root.querySelector<T>(selector)!;
const kindName = { countries: 'Länder', capitals: 'Hauptstädte' };
const modeName = { selection: 'Auswahl', elimination: 'Eliminierung' };
export function mountOverview(root: HTMLElement) {
  root.innerHTML = `<main class="learning-content"><h1>Lernen</h1>
  <p class="mode-explanation">Auswahl: jedes Ziel einmal. Eliminierung: lösen, bis die Karte leer ist.</p>
  <div class="region-grid">${regions.map(region => {
    const countryCount = targetsFor(countries, { kind: 'countries', mode: 'selection', region: region.id }).length;
    const capitalCount = targetsFor(countries, { kind: 'capitals', mode: 'selection', region: region.id }).length;
    return `<section class="region-card"><div class="region-name"><h2>${region.name}</h2><p>${countryCount} Länder · ${capitalCount} Hauptstädte</p></div><div class="game-links">${(['countries','capitals'] as const).map(kind => `<div><h3>${kindName[kind]}</h3>${(['selection','elimination'] as const).map(mode => `<a class="game-link" href="#/play/${kind}/${mode}/${region.id}" aria-label="${region.name}: ${kindName[kind]} – ${modeName[mode]}">${modeName[mode]}</a>`).join('')}</div>`).join('')}</div>${!countryCount ? '<p class="empty-note">Keine Staaten oder Hauptstädte.</p>' : ''}</section>`;
  }).join('')}</div><footer class="learning-footer"><a href="#/sources">Quellen & Regeln</a> · Stand 03.10.2026</footer></main>`;
  return () => {};
}
export function mountGame(root: HTMLElement, config: GameConfig) {
  const abort = new AbortController();
  let disposed = false;
  let ready = false;
  let map: ReturnType<typeof createGameMap> | undefined;
  let game: Game | undefined;
  const sound = new GameAudio();
  const region = regions.find(r => r.id === config.region)!;
  root.innerHTML = `<main class="game-page"><header class="game-heading"><a href="#/games" class="back-link">← Alle Spiele</a><button class="sound-button" aria-pressed="false"></button><p class="learning-eyebrow">${region.name} · ${kindName[config.kind]} · ${modeName[config.mode]}</p><h1 id="question" tabindex="-1">Karte wird geladen…</h1><p id="question-detail"></p><p id="question-note" class="question-note"></p><div class="progress-row"><span id="progress-text"></span><progress id="game-progress" max="1" value="0" aria-label="Fortschritt"></progress></div></header>
  <div class="game-map-wrap"><div id="game-map" aria-label="Lernkarte"></div><span class="map-crosshair" aria-hidden="true">+</span><button id="map-reset" disabled>Gesamtansicht</button><div id="game-loading" role="status">Lerndaten werden geladen…</div></div>
  <section class="game-answer" aria-label="Antwort"><div id="feedback" role="status" aria-live="polite" aria-atomic="true">Einmal markieren · erneut bestätigen</div><div class="answer-actions"><button id="show-answer" hidden>Richtiges Ziel zeigen</button><button id="next" hidden>Weiter →</button><button id="restart" hidden>Noch einmal</button></div></section>
  <footer class="game-footer"><details><summary>Bedienung</summary><p>Punkte machen auch kleine Ziele auswählbar. Bei nahen Orten heranzoomen. Tastatur: Karte fokussieren, Pfeiltasten verschieben, +/− zoomen, Enter wählt im Fadenkreuz.</p></details><p><a href="#/sources">Quellen & Regeln</a> · <a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.geonames.org/">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · <a href="https://maplibre.org/">MapLibre</a></p></footer></main>`;
  const feedback = $(root, '#feedback');
  const question = $(root, '#question');
  const next = $<HTMLButtonElement>(root, '#next');
  const restart = $(root, '#restart');
  const showAnswer = $(root, '#show-answer');
  const soundButton = $(root, '.sound-button');
  const updateSound = () => { soundButton.textContent = sound.muted ? 'Ton aus' : 'Ton an'; soundButton.setAttribute('aria-label', sound.muted ? 'Ton einschalten' : 'Ton stummschalten'); soundButton.setAttribute('aria-pressed', String(sound.muted)); };
  soundButton.onclick = () => { sound.toggle(); updateSound(); }; updateSound();
  const paint = () => {
    if (!game) return;
    map?.update(game);
    const total = game.targets.length;
    const answered = game.mode === 'selection' ? game.index + (game.feedback ? 1 : 0) : game.removed.size;
    $(root, '#progress-text').textContent = `${answered} / ${total} ${game.mode === 'elimination' ? 'entfernt' : 'beantwortet'}`;
    const progress = $<HTMLProgressElement>(root, '#game-progress'); progress.max = Math.max(1, total); progress.value = answered;
    question.textContent = game.complete ? 'Geschafft.' : `Wo liegt ${game.current!.name}?`;
    $(root, '#question-detail').textContent = game.complete ? `${game.correct} richtige Antworten bei ${game.attempts} Versuchen.` : game.current!.detail;
    $(root, '#question-note').textContent = game.complete ? '' : game.current!.note;
    next.hidden = !game.feedback || game.complete;
    restart.hidden = !game.complete;
    showAnswer.hidden = !(game.feedback && !game.feedback.correct && config.mode === 'selection');
    if (game.complete) {
      feedback.className = 'feedback-correct'; feedback.textContent = '✓ Alle Ziele bearbeitet.';
    } else if (game.feedback) {
      const result = game.feedback;
      feedback.className = result.correct ? 'feedback-correct' : 'feedback-wrong';
      feedback.textContent = result.correct ? `✓ Richtig: ${result.expected.name}.${config.mode === 'elimination' ? ' Das Ziel wurde entfernt.' : ''}`
        : `✕ Falsch: Du hast ${result.selected.name} ausgewählt.${config.mode === 'selection' ? ` Richtig ist ${result.expected.name} (grün markiert).` : ' Versuche dasselbe Ziel noch einmal; nichts wurde entfernt.'}`;
      next.textContent = config.mode === 'elimination' && !result.correct ? 'Erneut versuchen →' : game.index === total - 1 ? 'Ergebnis →' : 'Weiter →';
    } else {
      feedback.className = '';
      feedback.textContent = game.provisional ? 'Markiert. Erneut klicken zum Bestätigen.' : 'Einmal markieren · erneut bestätigen';
    }
  };
  next.onclick = () => { game?.next(); paint(); question.focus({ preventScroll: true }); };
  restart.onclick = () => { if (!game) return; game = new Game(game.targets, config.mode); paint(); map?.reset(); question.focus({ preventScroll: true }); };
  showAnswer.onclick = () => { if (game?.feedback) map?.focus(game.feedback.expected); };
  $(root, '#map-reset').onclick = () => map?.reset();
  const fail = () => {
    if (disposed) return;
    ready = false;
    const loading = $(root, '#game-loading'); loading.hidden = false; loading.setAttribute('role','alert');
    loading.replaceChildren(document.createTextNode('Die Karte konnte nicht geladen werden. Prüfe die Verbindung und WebGL2-Unterstützung. '));
    const retry = document.createElement('button'); retry.textContent = 'Erneut laden'; retry.onclick = () => location.reload(); loading.append(retry);
    $<HTMLButtonElement>(root, '#map-reset').disabled = true;
    question.textContent = 'Karte nicht verfügbar';
  };
  if (config.region === 'antarctica') {
    question.textContent = 'Hier gibt es keine Spielziele.';
    $(root, '#question-detail').textContent = 'Antarktika besitzt keine souveränen Staaten und keine Hauptstädte. Forschungsstationen sind keine Hauptstädte.';
    $(root, '.game-map-wrap').hidden = true; $(root, '.game-answer').hidden = true; $(root, '.progress-row').hidden = true;
  } else void Promise.all([loadLearningData(import.meta.env.BASE_URL, abort.signal), import('./game-map')]).then(([data, renderer]) => {
    if (disposed) return;
    const targets = targetsFor(data.countries, config);
    if (!targets.length) throw new Error('Keine Spielziele vorhanden.');
    game = new Game(targets, config.mode);
    map = renderer.createGameMap($(root, '#game-map'), data, targets, config, id => {
      if (!ready || !game) return;
      const result = game.choose(id);
      if (result === 'ignored') return;
      if (result === 'answered') void sound.play(game.feedback!.correct);
      paint();
    }, text => { if (!game?.feedback) feedback.textContent = text; }, () => {
      if (disposed) return;
      ready = true; $(root, '#game-loading').hidden = true; $<HTMLButtonElement>(root, '#map-reset').disabled = false; paint();
    }, fail);
  }).catch(() => { if (!abort.signal.aborted) fail(); });
  return () => { disposed = true; abort.abort(); map?.destroy(); sound.close(); };
}
export function mountSources(root: HTMLElement) {
  root.innerHTML = `<main class="learning-content source-content"><a href="#/games">← Alle Spiele</a><h1>Quellen & Spielregeln.</h1><p>Geprüfter Lernstand: <strong>03.10.2026</strong>. 196 Länderziele und 199 Hauptstadtziele. Die Karte ist eine generalisierte Lernkarte, keine amtliche Grenz- oder Vermessungskarte.</p>
  <h2>Welche Länder gehören dazu?</h2><p>193 UN-Mitgliedstaaten, Vatikanstadt (zum UN-Beobachter Heiliger Stuhl), Palästina* (UN-Beobachterstaat) und Kosovo*. Abhängige Gebiete, Taiwan, Westsahara und andere nicht aufgenommene Einheiten sind nur heller Kartenkontext. Ihre Darstellung trifft keine Anerkennungsaussage. Antarktika hat keine Spielziele.</p><p>* Die Anerkennung von Kosovo und Palästina ist unter EU-Mitgliedstaaten nicht einheitlich. Kosovo wird statusneutral gemäß der EU-Bezeichnung geführt: unbeschadet der Statuspositionen, im Einklang mit UNSCR 1244/1999 und dem IGH-Gutachten.</p>
  <h2>Kontinente & Hauptstädte</h2><p>Jedes Land gehört für das Spiel genau zu einem Gebiet: Russland und Zypern zu Europa; Türkei, Kasachstan, Armenien, Aserbaidschan und Georgien zu Asien; Ägypten zu Afrika. Mittelamerika und die Karibik gehören zu Nordamerika. Australien und die pazifischen Inselstaaten bilden Australien & Ozeanien. Überseegebiete erzeugen keine zusätzlichen Fragen.</p><p>Die Hauptstadtnamen folgen grundsätzlich dem EU-Anhang A5. Südafrikas drei und Eswatinis zwei Hauptstadtfunktionen werden einzeln abgefragt. Regierungssitze und beanspruchte Hauptstädte sind ausdrücklich gekennzeichnet. Der Name in der Frage bezeichnet stets den gesuchten Ort; zusätzliche Sitze wie Den Haag und La Paz sind in den Hinweisen erläutert.</p>
  <h2>Geodaten & Grenzen</h2><p>MapLibre GL JS stellt Natural-Earth-Polygone im Maßstab 1:10 Millionen dar (versionierte Deutschland-Variante, keine einheitliche EU-Anerkennungskarte). Stichproben prüfen Krim → Ukraine, Nordzypern → Zypern, Abchasien/Südossetien → Georgien und Somaliland → Somalia. Westsahara und Taiwan bleiben getrennte, nicht abgefragte Karteneinheiten. Grenz- und Statusfragen, unter anderem Jerusalem, Kaschmir, Golanhöhen und Sudan/Südsudan, werden durch diese historischen Geodaten nicht abschließend geklärt. Es werden keine aktuellen Frontlinien dargestellt. Eine flächenneutrale Topologiereparatur entfernt eine Selbstberührung im Ägypten-Umriss; alle anderen Polygone bleiben unverändert.</p><p>Hauptstadtkoordinaten stammen aus GeoNames (02.10.2026). An Küsten und bei Kleinstaaten können Punkte außerhalb der generalisierten Fläche liegen. Sie bleiben eigenständige auswählbare Ortsmarkierungen. Länder erhalten geprüfte Auswahlpunkte innerhalb ihrer Fläche. Bei überlappenden Punkten zoomt die Karte vor der Auswahl heran.</p>
  <ul class="source-links"><li><a href="https://style-guide.europa.eu/o/opportal-service/isg?resource=de/annex-a5-list-countries-territories-currencies.html">EU-Publikationsamt: Anhang A5 – Länder und Hauptstädte</a></li><li><a href="https://www.un.org/en/about-us/member-states">UN-Mitgliedstaaten</a> · <a href="https://www.un.org/en/about-us/non-member-states">UN-Beobachterstaaten</a></li><li><a href="https://www.eeas.europa.eu/kosovo/eu-and-kosovo_en">EEAS: Kosovo und Statusvorbehalt</a></li><li><a href="https://www.eeas.europa.eu/eeas/palestine-statement-high-representative-high-level-dialogue-between-european-union-and-palestinian_en">EEAS: Palästina und Jerusalem</a></li><li><a href="https://www.gov.za/about-sa/south-africa-glance-0">Südafrikanische Regierung: drei Hauptstädte</a> · <a href="https://au.int/en/cities/lobambaroyal-and-legislative-mbabane-administrative">Afrikanische Union: Eswatini</a></li><li><a href="https://www.palaugov.pw/executive-branch/ministries/hrctd/hr/ppscc/5107-2/">Regierung Palau: Ngerulmud, Melekeok</a></li><li><a href="https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19">Natural Earth: festgeschriebene Revision (Public Domain)</a></li><li><a href="https://www.geonames.org/">GeoNames</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></li><li><a href="https://github.com/petersenmalte/learn-the-world/blob/main/data/learning/README.md">Detaillierte Prüfung, Sonderfälle, Quelldateien und Prüfsummen</a></li></ul>
  <h2>Vollständiger Spielkatalog</h2><p>Jede Zeile hat eine eigene Länderfläche. Jeder hier aufgeführte Hauptstadtort besitzt eine eigene Markierung.</p><div class="catalogue-scroll"><table><thead><tr><th>Land</th><th>Gebiet</th><th>Hauptstadt / Funktion</th><th>Hinweis</th></tr></thead><tbody>${countries.map(c => `<tr><td>${escape(c.name)}</td><td>${regions.find(r => r.id === c.continent)!.name}</td><td>${c.capitals.map(cap => `${escape(cap.name)} <small>(${escape(cap.role)})</small>`).join('<br>')}</td><td>${escape(c.note)}</td></tr>`).join('')}</tbody></table></div></main>`;
  return () => {};
}
