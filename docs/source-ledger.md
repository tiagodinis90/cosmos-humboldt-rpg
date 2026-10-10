# Historical source ledger

**Main source**: Andrea Wulf, *The Invention of Nature: Alexander von Humboldt's New World* (Alfred A. Knopf, 2015). The user's reference copy (PDF/EPUB) is not stored in Git and must never be committed; quote facts, not its prose.

Labels used here: **H** attested historical chronology or reported activity; **D** original dramatization; **S** speculative fiction. These labels classify scenes, not the truth of every line spoken by a historical person.

| Scene ID | Basis in Wulf | Established chronology | Adaptation boundary |
| --- | --- | --- | --- |
| `berlin.1796`, `berlin.decision` | Part I, ch. 3, *In Search of a Destination* | Mother died November 1796; Humboldt resigned from mine inspection within about a month, inheriting means for independent travel. | H: dates, work, inheritance. D: room, letter, exact conversation and alternatives about how to prepare. |
| `berlin.goethe` | Part I, ch. 2, *Imagination and Nature* | Humboldt and Goethe shared investigations and discussed art, plants, morphology and instruments at Jena/Weimar. | H: relationship and intellectual dispute. D: imagined recollection and personal field-note wording. |
| `preparation.1797` | Part I, ch. 3 | Preparations involved scientific contacts, instruments, the Alps, Freiberg, Dresden, Vienna and Salzburg. | H: places/activities. D: selecting one afternoon and choosing between projects. |
| `preparation.records` | No historical claim | None; branching diagram introduced for the game. | S: unattributed sketch. It has no attested connection to Humboldt's original notebooks. |
| `paris.1798`, `paris.specimen` | Part I, ch. 3 | Humboldt met Aimé Bonpland in the corridor of their Paris lodging in 1798; Bonpland had botanical and naval medical experience. | H: meeting, general capabilities. D: all conversation, specific plant and implied agreement on that afternoon. |
| `marseille.1798`, `marseille.waiting` | Part I, ch. 3 | The expected passage stalled amid wartime disruption; the vessel was damaged and no viable departure was found. | H: delayed passage. D: all speech and personal moments. S: branching drawing altered by water. |
| `madrid.1799` | Part I, ch. 3 | In May 1799, Carlos IV gave passage permissions for Spanish territories with a self-funding condition and promised specimens for the royal collections. | H: permission and conditions. D: player-authored collection policy, social choices. |
| `corunna.1799` | Part I, ch. 3 | Pizarro departed from La Coruña in early June 1799; Humboldt travelled with a large collection of 42 instruments amid British naval threats. | H: departure/instruments. D: scene with sailor and inventory choices. |
| `atlantic.1799` | Part I, ch. 3 | Observations of sea phosphorescence and ascent of Pico del Teide on Tenerife during the outward voyage. | H: phenomena and route. D: dialogue/options. S: the recurring pattern of the ship's wake. |
| `cumana.1799` | Part I, ch. 3–4 | 16 July 1799 arrival in Cumaná, New Andalusia, with white sand recorded at 37.7°C and surrounding vegetation. | H: place, date, instrument reading. D: choices and descriptions drawn from the setting. |
| `cumana.july`, `cumana.memory`, `cumana.sand`, `cumana.passport` | Part II, ch. 4, *South America* | Cumaná still carried damage from the 1797 earthquake; Humboldt recorded sand temperature and navigated Spanish colonial administrative restrictions. | H: background conditions and reading. D: all conversation and scenes involving Inés Ávila, a wholly fictional resident. Inés's testimony is fictional, not documentary evidence of a named witness. |
| `cumana.november`, `cumana.after` | Part II, ch. 4 | On 4 November 1799, Cumaná experienced an earthquake; Humboldt observed and attempted measurements as the buildings shook, while Bonpland was nearby. | H: earthquake and scientific interest. D: choices, dialogue, safely observing from a doorway, interaction with neighbours. S: branching marks in damaged paper. |
| `cumana.departure` | Part II, ch. 4 | Roughly two weeks after the November earthquake, Humboldt and Bonpland departed for Caracas by a small coastal vessel, accompanied by José de la Cruz. | H: general itinerary, timing and accompanying figure. D: speech, belongings, attribution choice. |


## Walkable Cumaná scene (`src/narrative/encounters.ts`, `src/exploration/cumana-scene.ts`)

Checked on 9 October 2026 against the user's EPUB of Wulf (2015): chapter 3 (end, *In Search of a Destination*) and chapter 4 (*South America*). Wulf's endnotes give the primary references listed below; those primary texts have **not** been read directly yet.

| Element | What Wulf states | Primary reference via Wulf's notes | Adaptation boundary |
| --- | --- | --- | --- |
| `inst.sun_result`, evidence `scene_sand_sun` | On landing, Humboldt put his thermometer into the white sand and wrote 37.7 °C. | *Personal Narrative* (1814–29), vol. 2, p. 184 (ch. 3 n. 57). | H: the reading. D: the table, the moment in the scene and the second thermometer. |
| `inst.shade_*`, `scene_shade_air` (~29 °C) | No shade reading is reported. | — | D: value is illustrative and labelled as such in the fieldbook. |
| Field case (velvet-lined boxes, thermometers, barometer, hygrometer) | 42 instruments packed in velvet-lined boxes (ch. 3); barometer, thermometer, sextant, cyanometer, humidity measurements on Chimborazo (prologue). | Diary/letters cited in ch. 3. | H: instruments existed and were used. D: which ones lie open in Cumaná. |
| Cyanometer reading (22nd–23rd blue) | Humboldt measured the blueness of the sky with a cyanometer (documented for Chimborazo). | Prologue. | D: use in Cumaná and the value are illustrative. |
| Bonpland at the plant press | They pressed so many plants they had to order more reams of paper; Bonpland said he would go mad if the wonders did not stop. | AH to WH, 16 July 1799; *Personal Narrative* vol. 3, p. 72 (ch. 4 nn. 3–6). | H: workload and enthusiasm. D: every line Bonpland says, the priorities argument and the red check. |
| `quake` aftermath, Bonpland's lines | 4 November 1799, about 4 p.m.: Bonpland was nearly knocked over while leaning over a table of plants; Humboldt timed the shocks. | *Personal Narrative* vol. 3, pp. 316–17; Diary, 4 Nov 1799 (ch. 4 n. 17). | H: event and roles. D: stained papers, dialogue. |
| Plaza remark (slave market) | The slave market was opposite their rented house in the main square; every morning young African men and women were oiled, paraded and had their mouths forced open by buyers. It made Humboldt a lifelong abolitionist. | *Personal Narrative* vol. 2, p. 246 (ch. 4 n. 16). | H: as stated. Written plainly, not gated behind a skill. The political voice adds interpretation only. |
| Inés's political voice (shop licence) | Only those born in Spain could own shops or mines in the colonies. | Arana 2013, p. 26ff. (ch. 3 n. 58). | H: the rule. D: Inés keeps the books for a shop she cannot own (she remains fictional). |
| `ines.groves_answer`, evidence `cumana_dry_groves` | Just outside Cumaná, locals told Humboldt that the land had grown drier as ancient groves were cleared. | *Personal Narrative* vol. 3, pp. 24–5 (ch. 4 n. 44). | H: that such testimony was reported. D: Inés as the speaker, her mother's memory. Kept as testimony with "no measurements" so the Lake Valencia chapter can test it. |
| Quay remark (November) | In mid-November they chartered a small open thirty-foot trading boat westwards with José de la Cruz, an Indian servant; the trunks held more than 4,000 plant specimens. | Diary, June–July 1801: José had been with them since August 1799 (ch. 4 n. 20). | H: boat, timing, José. D: José counting trunks and arguing about weight. |
| Damaged buildings, masons, repair order | Cumaná was almost destroyed by an earthquake in 1797. | ch. 3. | H: 1797 damage. D: cracks in this set, the masons, the governor's repair order and the church bell record. |
| Castle on the hill, layout of the lane, the pier | — | — | D: original set. The castle silhouette is a nod to Cumaná's fortifications, not a survey of them. |

Not yet verified and therefore kept out of the scene: Carlos del Pino or other named guides at Cumaná; specific church or cabildo buildings; exact location of the lodging relative to the harbour.

## Questions for source verification

- The relative timing of Goethe's first sustained work with Humboldt and later experiments must not be collapsed into one fictional day in 1796.
- Do not put the 1799 meeting with Bonpland in Berlin or have him participate in observations from 1796–1797.
- Cumaná is the first landing in this arc, not Caracas. The world map and location states must respect that chronology. The Cumaná fieldwork chapter closes with a **November 1799** departure before Caracas becomes accessible.
- The book's explanatory account of Lake Valencia and colonial environmental change requires direct supporting field notes or other primary texts before the game presents precise mechanisms as settled fact.
- Distinguish the Portuguese edition's page numbers, if used later, from the original 2015 English edition's pagination.

## Independent game writing

All spoken dialogue, imagined encounters, alternate player decisions, the mysterious drawing and the Correspondence are new fiction. The presence of a secondary historical source does not authorize copying its expressive paragraphs. No commercial-game content extracted from Unity bundles belongs here.
