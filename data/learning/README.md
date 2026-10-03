# Learning area: data, rules and verification

**Geographical reference date: 3 October 2026; final technical checks: 4 October 2026.**

The learning area uses **196 country targets and 199 capital targets**. It has a separate catalogue; the original atlas’s 242 map units and 241 PPLC records are not equivalent to this list of states. All interface text, names and explanatory notes are in English. Names follow the English EU reference, including its spelling and diacritics.

## Inclusion rule

193 [UN Member States](https://www.un.org/about-us/member-states), the geographical state of Vatican City corresponding to the UN observer Holy See, the UN observer State of Palestine, and Kosovo. [UN observer States](https://www.un.org/en/about-us/non-member-states).

This is a disclosed **learning convention**, not a list of “states recognised by the EU”. Recognition belongs to individual Member States and is not uniform, particularly for Kosovo and Palestine. The EU Publications Office’s country and capital reference itself states that it does not express an official position on the legal status of the listed entities.

- **Kosovo***: a separate target with Pristina, following the status-neutral [EU designation](https://www.eeas.europa.eu/kosovo/eu-and-kosovo_en): without prejudice to positions on status, in line with UNSCR 1244/1999 and the ICJ opinion. No claim of uniform recognition. See also the [European Parliament resolution of 7 May 2025](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A52025IP0094).
- **Palestine***: included as a UN observer State; this does not assume uniform recognition among EU Member States. East Jerusalem is explicitly labelled the **claimed capital**, with Ramallah identified as the administrative seat in the note. [EEAS, EU–Palestine dialogue 2025](https://www.eeas.europa.eu/eeas/palestine-statement-high-representative-high-level-dialogue-between-european-union-and-palestinian_en), [EEAS: East/West Jerusalem](https://www.eeas.europa.eu/node/37336_en).
- **Israel / Jerusalem**: instead of an unqualified capital designation, the EU table provides a footnote on the location of the government, Knesset and Supreme Court. The question therefore labels **Jerusalem – seat of government, disputed status**. The GeoNames Jerusalem point to the west and the separate East Jerusalem point are independently selectable. These points do not define municipal or state boundaries. Tel Aviv is not substituted as a supposedly undisputed capital.
- **Taiwan**: separate, lighter map context, not a country target under the inclusion rule. This implies neither Chinese control nor recognition as a state. [EEAS: EU and Taiwan / One China policy](https://www.eeas.europa.eu/delegations/taiwan/european-union-and-taiwan_en?s=242).
- **Western Sahara**: separate, lighter map context, not assigned to Morocco as a country question. Its status remains unresolved. [EU Annual Report on Human Rights 2024, country reports](https://www.eeas.europa.eu/sites/default/files/documents/2025/2024%20Human%20Rights%20and%20Democracy%20in%20the%20World%20%28country%20reports%29v1b.pdf).
- Dependencies, including Greenland, Puerto Rico, Hong Kong and Macao, as well as the Cook Islands and Niue, are not additional targets. Exclusion is a scope rule, not a final assessment of legal status. Some integrated overseas territories remain part of their Natural Earth country polygon; they do not create separate questions.
- **Antarctica**: no sovereign state and no capital. All four variants are reachable but show an explained empty state rather than invented questions.

## Sources, files and reproducibility

| Source | Purpose | Date / licence |
| --- | --- | --- |
| [EU Publications Office, Annex A5 (English)](https://style-guide.europa.eu/o/opportal-service/isg?resource=en/annex-a5-list-countries-territories-currencies.html) | Full comparison of country/capital names in the learning catalogue; exceptions below | Retrieved 3 October 2026; English revision note for Equatorial Guinea dated 11 March 2026 |
| [Natural Earth, `ne_10m_admin_0_countries_deu.geojson`](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_0_countries_deu.geojson) | 250 country/context geometries, including 196 targets | Revision `ca96624a56bd078437bca8184e78163e5039ad19`; 1:10 million; public domain |
| [GeoNames `cities500.zip`](https://download.geonames.org/export/dump/cities500.zip) | Coordinates, source IDs and country assignment for all 199 capital targets | Existing download from 2 October 2026; CC BY 4.0, © GeoNames contributors |
| [South African Government](https://www.gov.za/about-sa/south-africa-glance-0), [African Union: Eswatini](https://au.int/en/cities/lobambaroyal-and-legislative-mbabane-administrative) | Additional capital functions | Checked 3 October 2026 |
| [Government of Palau: capitol at Ngerulmud, Melekeok](https://www.palaugov.pw/executive-branch/ministries/hrctd/hr/ppscc/5107-2/) | Clarification of the shortened EU designation “Melekeok” | Checked 3 October 2026 |
| [Swiss FDFA](https://www.aboutswitzerland.eda.admin.ch/en/political-system), [Australian DFAT on Nauru/Naoero](https://www.dfat.gov.au/geo/heads-of-government/naoero) | Federal city of Bern; Nauru’s lack of a formal capital | Checked 3–4 October 2026 |

- [catalogue.json](catalogue.json): complete editorial catalogue with continents, country selection points, capital functions, GeoNames IDs and notes.
- [eu-reference.json](eu-reference.json): factual extract from the English EU table for name comparisons, not a recognition list. Footnote text is supplemented by the original sources above and editorial notes.
- [geonames-reference.json](geonames-reference.json): frozen evidence for 199 coordinates, with country codes, original source names, feature codes and modification dates.
- [manifest.json](manifest.json): original URLs, revision and SHA-256 checksums of downloaded sources. A retrieval date is not a factual update date. The EU checksum refers to the English snapshot used for the displayed names.
- [geometry-audit.json](geometry-audit.json): full technical geometry audit and offsets of place points from generalised polygons.
- [geometry-repairs.json](geometry-repairs.json): frozen result of the Egypt repair described below.

`pnpm data:learning` regenerates public learning data from the reviewed catalogue and the Natural Earth source protected by its SHA-256 checksum. Only a missing source file is downloaded. Normal builds are offline with respect to geodata. Changed political facts require a new editorial review; regeneration alone does not update them. Map feature names use Natural Earth’s English field; the Germany worldview controls geometry, not the interface language.

## Capitals: reviewed special cases

| Case | Question / treatment |
| --- | --- |
| Equatorial Guinea | **Ciudad de la Paz**; replaces Malabo in the EU reference since 11 March 2026. GeoNames ID `12226438`. |
| Indonesia | **Jakarta**, following the retrieved EU reference; the planned relocation to Nusantara is not treated as complete. |
| Palau | **Ngerulmud**, the seat of government in Melekeok State. The EU designation “Melekeok” is clarified rather than applied to the wrong place point. |
| South Africa | Pretoria (administrative), Cape Town (parliamentary), Bloemfontein (judicial / Supreme Court of Appeal): three separate questions. Bloemfontein is not described as the seat of every highest court. |
| Eswatini | Mbabane (administrative), Lobamba (royal and parliamentary): two questions. |
| Bolivia | Sucre; note explains the seat of government in La Paz. |
| Netherlands / Malaysia | Amsterdam / Kuala Lumpur; notes explain The Hague / Putrajaya. |
| Benin / Côte d’Ivoire | Porto Novo / Yamoussoukro; notes explain Cotonou / Abidjan. |
| Sri Lanka | Sri Jayawardenapura Kotte (official capital / seat of parliament); the note distinguishes Colombo. |
| Switzerland / Nauru | Bern as federal city; Yaren as seat of government, not a formal capital. |
| Vatican | Geographical state and capital location of Vatican City; distinction from the Holy See explained. |
| Burundi / Kazakhstan / Myanmar/Burma | Gitega / Astana / Naypyidaw; no outdated capital or place names carried over from the original atlas. |
| Yemen / Sudan | Sana’a / Khartoum, following the EU reference; actual alternative seats during conflict are not confused with capital status. |
| Israel / Palestine / Kosovo | Explicit status and function rules above. |

The question always asks “Where is [place]?”. Its function is shown alongside it, so Pretoria and Cape Town, for example, are not competing answers to the same imprecise question. An ordinary seat of government does not automatically become an additional capital target. The scope does not claim to list every government and parliamentary seat worldwide.

## Continents

The six populated regions partition the world catalogue without duplicates. The assignment is an explicit learning convention for transcontinental states.

| Region | Countries | Capital targets |
| --- | ---: | ---: |
| Europe | 46 | 46 |
| Africa | 54 | 57 |
| Asia | 47 | 47 |
| North America, including Central America/Caribbean | 23 | 23 |
| South America | 12 | 12 |
| Australia & Oceania | 14 | 14 |
| Antarctica | 0 | 0 |
| Worldwide | 196 | 199 |

Russia and Cyprus → Europe; Türkiye, Kazakhstan, Armenia, Azerbaijan, Georgia and Maldives → Asia; Egypt, Mauritius and Seychelles → Africa. Natural Earth places some of these island states under “Seven seas”; that category is deliberately replaced for the game. Overseas portions do not change the state’s continent assignment.

## Boundaries: what is and is not verified

The original atlas’s default worldview was insufficient for the game rules. The learning area uses Natural Earth’s **Germany worldview**, which already contains the checked assignments Crimea → Ukraine, Northern Cyprus → Republic of Cyprus, Abkhazia/South Ossetia → Georgia and Somaliland → Somalia. This is **not an official EU boundary map** or a claim of a shared recognition policy. The source remains a historical, generalised dataset.

The [Council of the EU statement of 15 June 2026](https://www.consilium.europa.eu/en/press/press-releases/2026/06/15/russia-s-war-of-aggression-against-ukraine-new-eu-sanctions-target-energy-revenues-the-military-industrial-complex-propaganda-and-human-rights-violations/) affirms non-recognition of the annexation of Crimea and Ukraine’s territorial integrity. The [EU report on Türkiye/Cyprus](https://data.consilium.europa.eu/doc/document/ST-15127-2024-INIT/en/pdf) affirms recognition only of the Republic of Cyprus. British sovereign base areas on Cyprus remain context. Boundaries during war are not treated as current front lines.

All 250 geometries were checked for type, closed rings, finite coordinates and valid ranges. **Shapely 2.1.2 / GEOS also checked every geometry for validity and all spatially neighbouring polygon pairs for overlapping interiors**. This found a self-touch in the source polygon for Egypt at `[35.621087, 23.139293]`. `make_valid` repairs the topology; polygon area remains equal within numerical rounding (90.7301888148491 → 90.73018881484892 square degrees). No boundary was drawn freehand. The repair result is versioned and applied by the generator. Afterwards: **0 invalid geometries, 0 overlapping interiors** (threshold `1e-10` square degrees).

The political regression tests are explicitly **spot checks**, not an independent verification of every boundary segment. Kashmir, the Golan Heights, Jerusalem, boundary gaps/indeterminacy and Sudan/South Sudan remain limitations of the source map; for example, the tested point `[35.75, 33.0]` in the Golan Heights has no country polygon in this variant. Small territorial disputes and current administrative changes are not conclusively resolved. This learning map is unsuitable for surveying, legal claims or local navigation.

13 capital points lie outside their generalised country polygon: Suva, St George’s, Banjul, Tarawa, Monrovia, Majuro, Yaren, East Jerusalem, Honiara, Nuku’alofa, Funafuti, Vatican City and Kingstown. The audit lists each offset (approximately 0.01–4 km; a simplified angular-distance estimate, not a survey). East Jerusalem is a **political assignment discrepancy**; not every case is coastal rounding. Coordinates are not moved onto an incorrect land polygon. Place markers remain selectable independently of polygon assignment.

## Unambiguous selection and rendering

- Each verified country point lies inside exactly one country polygon; all 196 points were tested against **all** source polygons. This keeps microstates and islands reachable.
- Capitals have unique IDs and GeoNames points; no point is hidden because a label is missing.
- Overlapping hits produce **no answer**. The map zooms in. A test verifies that every point pair has separate hit areas by the permitted maximum zoom of 15. Rome/Vatican City was also checked in the mobile browser.
- The Pacific view uses world wrapping and a viewport across the date line. No hand-drawn country outlines or satellite tiles; white background.
- Elimination filters solved polygons and their points. A white mask from the same source geometry also erases boundary lines shared with neighbouring polygons. For capitals, only the solved place marker disappears.

The independent spatial audit can be repeated with `python3 scripts/audit-learning.py` in a Python environment with `shapely==2.1.2`. Shapely is not a web application dependency.

See [TESTING.md](../../TESTING.md) for the final technical and browser checks.
