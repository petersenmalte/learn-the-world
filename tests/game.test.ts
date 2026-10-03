import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Game, shuffle, regions, targetsFor, parseGameRoute, validateLearningData, pointInGeometry, loadLearningData, type Country, type LearningData } from '../src/game-model';
import { GameAudio, tones } from '../src/game-audio';
const countries: Country[] = JSON.parse(readFileSync(new URL('../data/learning/catalogue.json', import.meta.url),'utf8'));
const data: LearningData = { countries, geometry: JSON.parse(gunzipSync(readFileSync(new URL('../public/data/learning/countries.geojson.gz',import.meta.url))).toString()) };
const targets = targetsFor(countries, { kind: 'countries', mode: 'selection', region: 'south-america' });

test('two clicks on the same target confirm; changing target only changes the provisional selection', () => {
  const game = new Game(targets, 'selection', () => .5);
  const correct = game.current!, wrong = targets.find(t => t.id !== correct.id)!;
  assert.equal(game.choose(wrong.id),'selected'); assert.equal(game.attempts,0);
  assert.equal(game.choose(correct.id),'selected'); assert.equal(game.attempts,0);
  assert.equal(game.choose(correct.id),'answered'); assert.equal(game.attempts,1);
  assert.equal(game.feedback?.correct,true); assert.equal(game.choose(wrong.id),'ignored');
  game.next(); assert.equal(game.provisional,undefined); assert.equal(game.feedback,undefined);
});
test('selection visits every target exactly once, keeps all shapes, and exposes both wrong and correct identities', () => {
  const game = new Game(targets, 'selection'); const visited = [];
  while (!game.complete) {
    const expected = game.current!; visited.push(expected.id);
    const wrong = targets.find(t => t.id !== expected.id)!;
    game.choose(wrong.id); game.choose(wrong.id);
    assert.equal(game.feedback!.expected.name,expected.name); assert.equal(game.feedback!.selected.name,wrong.name);
    assert.equal(game.removed.size,0); game.next();
  }
  assert.equal(new Set(visited).size,targets.length); assert.equal(game.completed,targets.length);
  assert.equal(game.choose(targets[0].id),'ignored'); game.next(); assert.equal(game.completed,targets.length);
});
test('elimination retries the same question after mistakes and removes only correctly confirmed targets', () => {
  const game = new Game(targets, 'elimination'); const first = game.current!;
  const wrong = targets.find(t => t.id !== first.id)!;
  game.choose(wrong.id); game.choose(wrong.id); assert.equal(game.removed.size,0);
  game.next(); assert.equal(game.current!.id,first.id);
  while (!game.complete) {
    const id = game.current!.id; game.choose(id); game.choose(id);
    assert.ok(game.removed.has(id)); game.next(); assert.equal(game.choose(id),'ignored');
  }
  assert.equal(game.removed.size,targets.length); assert.equal(game.attempts,targets.length+1);
});
test('shuffle is a permutation, copies its input, and supports distinct reproducible orderings', () => {
  const input = [0,1,2,3,4,5]; assert.notDeepEqual(shuffle(input,()=>0),shuffle(input,()=>.999));
  assert.deepEqual(input,[0,1,2,3,4,5]); assert.deepEqual(shuffle(input).sort(),input);
  assert.deepEqual(shuffle([]),[]); assert.deepEqual(shuffle([1]),[1]);
});
test('all 32 routes exist; six populated continents partition the world without missing or duplicate targets', () => {
  for (const kind of ['countries','capitals'] as const) for (const mode of ['selection','elimination'] as const) {
    const all = targetsFor(countries, { kind, mode, region: 'world' });
    const regional = [];
    for (const region of regions) {
      assert.deepEqual(parseGameRoute(`#/play/${kind}/${mode}/${region.id}`),{kind,mode,region:region.id});
      const local = targetsFor(countries,{kind,mode,region:region.id});
      assert.equal(local.length === 0,region.id === 'antarctica');
      if (region.id !== 'world') regional.push(...local);
      const game = new Game(local,mode); let count=0;
      while (!game.complete) { const id=game.current!.id;game.choose(id);game.choose(id);game.next();count++; }
      assert.equal(count,local.length);
    }
    assert.equal(regional.length,all.length); assert.deepEqual(regional.map(t=>t.id).sort(),all.map(t=>t.id).sort());
  }
  for (const bad of ['#/play/nope/selection/world','#/play/capitals/no/world','#/play/countries/selection/moon','#/play/countries/selection/world/extra']) assert.equal(parseGameRoute(bad),undefined);
});
test('all 196 countries and 199 capital targets have unique IDs, geometry and reachable coordinate anchors', () => {
  validateLearningData(data); assert.equal(countries.length,196); assert.equal(countries.flatMap(c=>c.capitals).length,199);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/data/learning/catalogue.json',import.meta.url),'utf8')),countries);
  for (const c of countries) {
    const shape=data.geometry.features.find(f=>f.properties!.id===c.id)!;
    const owners=data.geometry.features.filter(f=>pointInGeometry(c.anchor,f.geometry));
    assert.equal(owners.length,1,`${c.id} anchor overlaps a second unit`);
    assert.equal(owners[0].properties!.id,c.id); assert.ok(shape.properties!.playable);
  }
});
test('every source geometry is polygonal with finite in-range coordinates and closed nonempty rings', () => {
  const ids=new Set();
  for (const f of data.geometry.features) {
    assert.ok(!ids.has(f.properties!.id));ids.add(f.properties!.id);
    assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));
    for (const polygon of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates) for (const ring of polygon) {
      assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));
      for (const p of ring) {assert.equal(p.length,2);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[0])<=180.001 && Math.abs(p[1])<=90);}
    }
  }
});
test('country scope is explicit and all EU-reference capital matches or deviations are accounted for', () => {
  const reference=JSON.parse(readFileSync(new URL('../data/learning/eu-reference.json',import.meta.url),'utf8')).rows as {id:string;capital:string}[];
  for (const c of countries) {
    if (['PS','XK','IL'].includes(c.id)) { assert.ok(c.note); continue; }
    const row=reference.find(r=>r.id===({GR:'EL',GB:'UK'}[c.id]??c.id));assert.ok(row,`${c.id} missing EU reference`);
    if (['PW','VA'].includes(c.id)) assert.ok(c.note);
    else assert.equal(c.capitals[0].name,row.capital,`${c.id} unaccounted difference`);
  }
  for(const id of ['TW','EH','GL','PR','HK','MO','AQ','CK','NU']) assert.ok(!countries.some(c=>c.id===id));
  for(const id of ['PS','XK','VA']) assert.ok(countries.some(c=>c.id===id));
  assert.equal(countries.filter(c=>!['PS','XK','VA'].includes(c.id)).length,193);
});
test('known capital changes, multiple capitals and continent exceptions are explicit', () => {
  const c=(id:string)=>countries.find(c=>c.id===id)!;
  assert.equal(c('GQ').capitals[0].name,'Ciudad de la Paz');assert.equal(c('ID').capitals[0].name,'Jakarta');
  assert.equal(c('PW').capitals[0].name,'Ngerulmud');assert.equal(c('BI').capitals[0].name,'Gitega');
  assert.equal(c('KZ').capitals[0].name,'Astana');assert.equal(c('ZA').capitals.length,3);assert.equal(c('SZ').capitals.length,2);
  assert.equal(c('CY').continent,'europe');assert.equal(c('RU').continent,'europe');
  for(const id of ['TR','KZ','GE','AM','AZ','MV'])assert.equal(c(id).continent,'asia');
  for(const id of ['MU','SC','EG'])assert.equal(c(id).continent,'africa');
});
test('political boundary regression samples preserve the documented worldview and neutral context', () => {
  const cases:[string,number,number][]=[['UA',34.1,44.95],['CY',33.3,35.25],['GE',41.02,43],['GE',43.96,42.23],['SO',44.06,9.56],['context-SAH',-13.2,27.15],['context-TWN',121.56,25.03],['PS',35.2,31.9]];
  for(const [id,x,y] of cases) assert.deepEqual(data.geometry.features.filter(f=>pointInGeometry([x,y],f.geometry)).map(f=>f.properties!.id),[id]);
});
test('data loader uses the deployment base and fails safely for HTTP or corrupt data', async () => {
  const requests:string[]=[];
  const fetcher=(async (url:RequestInfo|URL)=>{requests.push(String(url));return String(url).endsWith('catalogue.json')?new Response(JSON.stringify(countries)):new Response(JSON.stringify(data.geometry));}) as typeof fetch;
  const loaded=await loadLearningData('/learn-the-world/',undefined,fetcher);assert.equal(loaded.countries.length,196);
  assert.deepEqual(requests,['/learn-the-world/data/learning/catalogue.json','/learn-the-world/data/learning/countries.geojson.gz']);
  await assert.rejects(loadLearningData('/',undefined,(async()=>new Response('',{status:503})) as typeof fetch),/503/);
  await assert.rejects(loadLearningData('/',undefined,(async()=>new Response('{}')) as typeof fetch));
});
test('muted audio creates no audio context and correct/wrong cues use different short frequencies', async () => {
  const sound=new GameAudio();sound.muted=true;await sound.play(true);await sound.play(false);sound.close();
  assert.notDeepEqual(tones.correct,tones.wrong);assert.equal(sound.toggle(),false);assert.equal(sound.toggle(),true);
});

test('all capital coordinates and country associations exactly match the frozen GeoNames evidence', () => {
  const rows=JSON.parse(readFileSync(new URL('../data/learning/geonames-reference.json',import.meta.url),'utf8')).rows as {id:string;countryCode:string;coordinates:number[]}[];
  assert.equal(rows.length,199);
  for (const c of countries) for (const capital of c.capitals) {
    const source=rows.find(r=>r.id===capital.geonamesId);assert.ok(source,capital.name);
    assert.equal(source.countryCode,c.id);assert.deepEqual(source.coordinates,capital.coordinates);
  }
});
test('every marker can be separated from its neighbours within the allowed zoom range', () => {
  const project=([lng,lat]:number[])=>[(lng+180)/360,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2];
  for (const kind of ['countries','capitals'] as const) {
    const points=targetsFor(countries,{kind,mode:'selection',region:'world'}).map(t=>({id:t.id,p:project(t.coordinates)}));
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const a=points[i],b=points[j],dx=Math.min(Math.abs(a.p[0]-b.p[0]),1-Math.abs(a.p[0]-b.p[0]));
      assert.ok(Math.hypot(dx,a.p[1]-b.p[1])*512*2**15>44,`${a.id} and ${b.id} cannot be separated`);
    }
  }
});
test('elimination completes as soon as the last target is removed', () => {
  const game=new Game(targets.slice(0,1),'elimination');const id=game.current!.id;
  game.choose(id);game.choose(id);assert.equal(game.complete,true);assert.equal(game.feedback?.correct,true);
});
