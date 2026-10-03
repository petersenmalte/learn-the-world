import catalogue from '../data/learning/catalogue.json';
import { Game, loadLearningData, regions, targetsFor, type Country, type GameConfig } from './game-model';
import { GameAudio } from './game-audio';
import type { createGameMap } from './game-map';
const countries = catalogue as Country[];
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) => root.querySelector<T>(selector)!;
const kindName = { countries: 'Countries', capitals: 'Capitals' };
const modeName = { selection: 'Selection', elimination: 'Elimination' };
export function mountOverview(root: HTMLElement) {
  root.innerHTML = `<main class="learning-content"><p class="learning-eyebrow">Learn the World</p><h1>Get to know the world.</h1><p class="learning-intro">One place at a time. Choose a region and discover how much you know.</p>
  <div class="mode-explanation"><p><strong>Selection</strong><br>Each target once. After a mistake, you see the correct answer.</p><p><strong>Elimination</strong><br>Keep trying until the answer is correct. Each solved target disappears.</p></div>
  <div class="region-grid">${regions.map(region => {
    const countryCount = targetsFor(countries, { kind: 'countries', mode: 'selection', region: region.id }).length;
    const capitalCount = targetsFor(countries, { kind: 'capitals', mode: 'selection', region: region.id }).length;
    return `<section class="region-card"><h2>${region.name}</h2><p>${countryCount} countries · ${capitalCount} capital targets</p><div class="game-links">${(['countries','capitals'] as const).map(kind => `<div><h3>${kindName[kind]}</h3>${(['selection','elimination'] as const).map(mode => `<a class="game-link" href="#/play/${kind}/${mode}/${region.id}" aria-label="${region.name}: ${kindName[kind]} – ${modeName[mode]}">${modeName[mode]} <span aria-hidden="true">↗</span></a>`).join('')}</div>`).join('')}</div>${!countryCount ? '<p class="empty-note">No countries or capitals. These variants explain the empty scope.</p>' : ''}</section>`;
  }).join('')}</div><footer class="learning-footer">196 countries · 199 capital targets · As of 3 Oct 2026<br><a href="#/sources">Country scope, special cases & data sources</a></footer></main>`;
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
  root.innerHTML = `<main class="game-page"><header class="game-heading"><a href="#/games" class="back-link">← All games</a><button class="sound-button" aria-pressed="false"></button><p class="learning-eyebrow">${region.name} · ${kindName[config.kind]} · ${modeName[config.mode]}</p><h1 id="question" tabindex="-1">Loading map…</h1><p id="question-detail"></p><p id="question-note" class="question-note"></p><div class="progress-row"><span id="progress-text"></span><progress id="game-progress" max="1" value="0" aria-label="Progress"></progress></div></header>
  <div class="game-map-wrap"><div id="game-map" aria-label="Learning map"></div><span class="map-crosshair" aria-hidden="true">+</span><button id="map-reset" disabled>Reset view</button><div id="game-loading" role="status">Loading learning data…</div></div>
  <section class="game-answer" aria-label="Answer"><div id="feedback" role="status" aria-live="polite" aria-atomic="true">One click selects. A second click on the same target confirms.</div><div class="answer-actions"><button id="show-answer" hidden>Show correct target</button><button id="next" hidden>Continue →</button><button id="restart" hidden>Play again</button></div></section>
  <footer class="game-footer"><p>Markers make even small targets selectable. Zoom in for nearby places. Keyboard: focus the map, pan with arrow keys, zoom with +/−, and press Enter to select at the crosshair.</p><p><a href="#/sources">Sources & rules · As of 3 Oct 2026</a> · <a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.geonames.org/">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · <a href="https://maplibre.org/">MapLibre</a></p></footer></main>`;
  const feedback = $(root, '#feedback');
  const question = $(root, '#question');
  const next = $<HTMLButtonElement>(root, '#next');
  const restart = $(root, '#restart');
  const showAnswer = $(root, '#show-answer');
  const soundButton = $(root, '.sound-button');
  const updateSound = () => { soundButton.textContent = sound.muted ? 'Sound off' : 'Sound on'; soundButton.setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound'); soundButton.setAttribute('aria-pressed', String(sound.muted)); };
  soundButton.onclick = () => { sound.toggle(); updateSound(); }; updateSound();
  const paint = () => {
    if (!game) return;
    map?.update(game);
    const total = game.targets.length;
    const answered = game.mode === 'selection' ? game.index + (game.feedback ? 1 : 0) : game.removed.size;
    $(root, '#progress-text').textContent = `${answered} / ${total} ${game.mode === 'elimination' ? 'removed' : 'answered'}`;
    const progress = $<HTMLProgressElement>(root, '#game-progress'); progress.max = Math.max(1, total); progress.value = answered;
    question.textContent = game.complete ? 'Complete.' : `Where is ${game.current!.name}?`;
    $(root, '#question-detail').textContent = game.complete ? `${game.correct} correct answers in ${game.attempts} attempts.` : game.current!.detail;
    $(root, '#question-note').textContent = game.complete ? '' : game.current!.note;
    next.hidden = !game.feedback || game.complete;
    restart.hidden = !game.complete;
    showAnswer.hidden = !(game.feedback && !game.feedback.correct && config.mode === 'selection');
    if (game.complete) {
      feedback.className = 'feedback-correct'; feedback.textContent = '✓ All targets completed.';
    } else if (game.feedback) {
      const result = game.feedback;
      feedback.className = result.correct ? 'feedback-correct' : 'feedback-wrong';
      feedback.textContent = result.correct ? `✓ Correct: ${result.expected.name}.${config.mode === 'elimination' ? ' Target removed.' : ''}`
        : `✕ Incorrect: You selected ${result.selected.name}.${config.mode === 'selection' ? ` The correct answer is ${result.expected.name} (marked in green).` : ' Try the same target again; nothing was removed.'}`;
      next.textContent = config.mode === 'elimination' && !result.correct ? 'Try again →' : game.index === total - 1 ? 'Results →' : 'Continue →';
    } else {
      feedback.className = '';
      feedback.textContent = game.provisional ? 'Target selected. Click it again to confirm; clicking another target changes the selection.' : 'One click selects. A second click on the same target confirms.';
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
    loading.replaceChildren(document.createTextNode('Could not load the map. Check your connection and WebGL2 support. '));
    const retry = document.createElement('button'); retry.textContent = 'Reload'; retry.onclick = () => location.reload(); loading.append(retry);
    $<HTMLButtonElement>(root, '#map-reset').disabled = true;
    question.textContent = 'Map unavailable';
  };
  if (config.region === 'antarctica') {
    question.textContent = 'There are no game targets here.';
    $(root, '#question-detail').textContent = 'Antarctica has no sovereign states or capitals. Research stations are not capitals.';
    $(root, '.game-map-wrap').hidden = true; $(root, '.game-answer').hidden = true; $(root, '.progress-row').hidden = true;
  } else void Promise.all([loadLearningData(import.meta.env.BASE_URL, abort.signal), import('./game-map')]).then(([data, renderer]) => {
    if (disposed) return;
    const targets = targetsFor(data.countries, config);
    if (!targets.length) throw new Error('No game targets available.');
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
  root.innerHTML = `<main class="learning-content source-content"><a href="#/games">← All games</a><h1>Sources & game rules.</h1><p>Learning reference checked: <strong>3 October 2026</strong>. 196 country targets and 199 capital targets. This is a generalised learning map, not an official boundary or survey map.</p>
  <h2>Which countries are included?</h2><p>193 UN Member States, Vatican City (corresponding to the UN observer Holy See), Palestine* (UN observer State) and Kosovo*. Dependencies, Taiwan, Western Sahara and other excluded units appear only as lighter map context. Their display does not imply recognition. Antarctica has no game targets.</p><p>* Recognition of Kosovo and Palestine varies among EU Member States. Kosovo follows the EU’s status-neutral designation: without prejudice to positions on status, in line with UNSCR 1244/1999 and the ICJ opinion.</p>
  <h2>Continents & capitals</h2><p>Each country belongs to exactly one game region: Russia and Cyprus to Europe; Türkiye, Kazakhstan, Armenia, Azerbaijan and Georgia to Asia; Egypt to Africa. Central America and the Caribbean belong to North America. Australia and the Pacific island states form Australia & Oceania. Overseas territories do not create additional questions.</p><p>Capital names generally follow EU Annex A5. South Africa’s three and Eswatini’s two capital functions are asked separately. Seats of government and claimed capitals are explicitly labelled. The name in the question always identifies the place to find; additional seats such as The Hague and La Paz are explained in the notes.</p>
  <h2>Geodata & boundaries</h2><p>MapLibre GL JS displays Natural Earth polygons at 1:10 million scale (a pinned Germany worldview, not a map of uniform EU recognition). Spot checks cover Crimea → Ukraine, Northern Cyprus → Cyprus, Abkhazia/South Ossetia → Georgia and Somaliland → Somalia. Western Sahara and Taiwan remain separate map units outside the question pool. These historical geodata do not settle boundary and status issues, including Jerusalem, Kashmir, the Golan Heights and Sudan/South Sudan. Current front lines are not shown. An area-preserving topology repair removes a self-touch in Egypt’s outline; all other polygons are unchanged.</p><p>Capital coordinates come from GeoNames (2 October 2026). Along coasts and in microstates, points may lie outside the generalised polygon. They remain separate, selectable place markers. Countries have verified selection points inside their polygons. When markers overlap, the map zooms in before selection.</p>
  <ul class="source-links"><li><a href="https://style-guide.europa.eu/o/opportal-service/isg?resource=en/annex-a5-list-countries-territories-currencies.html">EU Publications Office: Annex A5 – countries and capitals</a></li><li><a href="https://www.un.org/en/about-us/member-states">UN Member States</a> · <a href="https://www.un.org/en/about-us/non-member-states">UN observer States</a></li><li><a href="https://www.eeas.europa.eu/kosovo/eu-and-kosovo_en">EEAS: Kosovo and status disclaimer</a></li><li><a href="https://www.eeas.europa.eu/eeas/palestine-statement-high-representative-high-level-dialogue-between-european-union-and-palestinian_en">EEAS: Palestine and Jerusalem</a></li><li><a href="https://www.gov.za/about-sa/south-africa-glance-0">South African Government: three capitals</a> · <a href="https://au.int/en/cities/lobambaroyal-and-legislative-mbabane-administrative">African Union: Eswatini</a></li><li><a href="https://www.palaugov.pw/executive-branch/ministries/hrctd/hr/ppscc/5107-2/">Government of Palau: Ngerulmud, Melekeok</a></li><li><a href="https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19">Natural Earth: pinned revision (public domain)</a></li><li><a href="https://www.geonames.org/">GeoNames</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></li><li><a href="https://github.com/petersenmalte/learn-the-world/blob/main/data/learning/README.md">Detailed audit, special cases, source files and checksums</a></li></ul>
  <h2>Complete game catalogue</h2><p>Each row has its own country polygon. Every capital listed here has its own marker.</p><div class="catalogue-scroll"><table><thead><tr><th>Country</th><th>Region</th><th>Capital / function</th><th>Note</th></tr></thead><tbody>${countries.map(c => `<tr><td>${escape(c.name)}</td><td>${regions.find(r => r.id === c.continent)!.name}</td><td>${c.capitals.map(cap => `${escape(cap.name)} <small>(${escape(cap.role)})</small>`).join('<br>')}</td><td>${escape(c.note)}</td></tr>`).join('')}</tbody></table></div></main>`;
  return () => {};
}
