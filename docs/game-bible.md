# COSMOS: Humboldt — working game bible

Status: playable opening (1796–1799), Cumaná historical episode, original point-and-click walking map and narrative graph engine on the feature branch. This is a working production specification, not a completed game.

## Premise

Alexander von Humboldt gives up a secure job and spends an inherited fortune trying to understand a world that cannot be divided neatly into botany, geology, climate, politics and the human body. European wars delay his departure. When he finally reaches the Americas, measuring an unfamiliar environment also means confronting the institutions, labour and knowledge that make his journey possible.

The player is Humboldt. Dates and well-attested historical encounters remain fixed. Choices alter his evidence, relationships, methods, ethical commitments and interpretation of what he experiences.

A recurring pattern — branches, veins, river deltas, discharges in water — sometimes appears where it should not. No narrator certifies that the pattern is supernatural. The player can follow the observation, dismiss it, or try to repeat it. Explanations must remain plausible for as long as the available evidence permits.

## Tone

The world should feel materially real: cold anatomy theatres, failed sea passages, unreliable thermometers, sweat, damp paper, botanical cases, money and naval blockades. Its strangeness lives in the margins of research notes and in stories people cannot quite corroborate. The quiet scholarly menace of Jonathan Strange & Mr Norrell is an influence, with no borrowing of its mythology.

Characters have conflicting motives. Bonpland is a competent botanist and traveller with interests of his own, not an assistant who merely agrees with the player. Goethe challenges the division between measured fact and artistic perception. Local people in South America have expertise, property, conflict and political agency; they are not magical tour guides for a European protagonist.

The writing is restrained. Keep incidental speech natural. Do not make every action a declaration about the cosmos.

## Play loop

1. Listen, walk, examine objects and speak to people in scenes.
2. Choose a way of investigating: measure, compare, ask, sketch, or hold a question open.
3. Commit scarce time, instrument condition, money, supplies or social trust.
4. Receive an observation and record how it was obtained.
5. Compare new evidence with old material in the fieldbook.
6. Make an interpretation. Some conclusions are provisional and can be revised.

The current game already has a dice-cycle layer (inspired by Citizen Sleeper). We retain that prototype while testing a richer dialogue/fieldwork layer. We should not grow the number of systems before a compact scene proves that they work together.

## Faculties and intrusive thoughts

The existing four skills are `logic`, `empathy`, `aesthetics` and `political`. They provide optional observations in the opening. Later they should behave like competing interpretive faculties:

- **Logic** notices experimental design and confounding variables; can mistake tidy models for reality.
- **Empathy** reads hesitation and obligation; may project sympathy where it is unwelcome.
- **Aesthetics** detects form, analogy and sensation; can elevate coincidence into pattern.
- **Political** sees authority, ownership and coercion; can assume a social motive before asking a person.

High skill should unlock information or a method, not make a faculty infallible. Every strong inference needs either supporting evidence or a clearly marked uncertainty.

## The Correspondence (working supernatural rule)

The Correspondence is a name used only in design notes for a possible relation among observed natural structures. The first instance is an unattributed branching sketch; later, damaged wet paper and a phosphorescent wake resemble it. These scenes are entirely fictional.

Constraints:

- No combat spells, incantations or fantasy species in the opening.
- No supernatural event may be required for an ordinary route through the historical story.
- The game must never present speculation as experimentally demonstrated science.
- A supernatural implication must alter a decision or an interpretation; a decorative mystery is insufficient.
- The uncanny appears alongside credible physical explanations. Those explanations receive fair attention.
- Future chapters may strengthen or falsify earlier interpretations. Avoid a predetermined reveal that invalidates all earlier rational play.

## Narrative spine

### Act I — Departure: 1794–1799
Core source: Andrea Wulf, *The Invention of Nature*, Part I, especially chapters 2–3.
Playable opening: December 1796, scientific preparations during 1797, Bonpland in Paris in 1798, failed passage in Marseille, Spanish permission in May 1799, sailing from La Coruña, Tenerife, Cumaná on 16 July 1799.

The player establishes a fieldwork method and one or more relationships to uncertainty. The first scene is already implemented; the continuation to Cumaná is on the same feature branch.

### Act II — A web that can be damaged: 1799–1801
Cumaná, tropical fieldwork, Venezuelan plains, river travel and Lake Valencia. The central mystery is human-made environmental change, not a magical curse. Local testimony and evidence of plantation economies are essential. A serious account of slavery and colonial power cannot be reduced to generic morality points.

### Act III — Altitude: 1801–1802
Andean ecosystems and the attempt on Chimborazo. The Naturgemälde becomes a tool: arranging altitude, temperature, geological layers and plant ranges exposes connections that scattered specimens hide. The unusual pattern may recur, but the diagram must work as scientific reasoning regardless.

### Act IV — Publishing and power: 1804 onward
Returning to Europe is an intellectual and financial problem. Humboldt must choose what to publish, who receives credit and how raw observations become an argument. Historic meetings with Jefferson, Bolívar, Darwin's later response, and the writing of *Cosmos* belong to the longer narrative, with their dates checked against source chronology. This act is **not implemented**.

## Historical and intellectual guardrails

- Primary chronology: Andrea Wulf, *The Invention of Nature* (Knopf, 2015), with chapter-based provenance recorded in `docs/source-ledger.md`.
- Wulf's prose is reference material. Do not copy it into dialogues or public project files. All player-facing prose must be original.
- Humboldt's historical interests in measurement and interconnectedness are real. The game's literal supernatural Correspondence is fiction.
- Public-domain Humboldt letters, field notebooks and works can supplement the secondary biography later. Their attribution, translation and editions need recording.
- Neither the *Zero Parades* C4 extraction nor *Disco Elysium* assets, dialogue or scripts may be committed to this repo. Only original implementations of general RPG mechanics belong here.

## Production principles

Keep the React/TypeScript/Vite implementation as a behavioral reference while exploring a future original Unity 2.5D production port. Do not migrate blindly or copy commercial game assets. The independent map/pathfinding and dialogue contracts must pass deterministic tests before porting to C#. Keep historical content separate from game rules. Each new chapter requires: a one-page scene outline, a source ledger, at least one meaningful delayed consequence, a route that does not require the supernatural choice, and tests for branching/state persistence.

The game is playable in English for now. Portuguese localization can follow once the narrative format stabilizes. Source citations are for production and research; they should not overwhelm the player's interface.

## Definition of done for the first vertical slice

Character creation → original 1796–1799 narrative → arrival in Cumaná → walk around the original town scene → talk to a person who can disagree → maintain separate measurements, testimony and hypotheses → investigate an earthquake-damaged wall through a red/white-check dialogue → fieldbook update → travel to a second location. Build and type checks pass. Test paths cover high/low skills, the presence/absence of the Correspondence choice, and state carry-over. Human review checks tone, character agency and scientific claims.
