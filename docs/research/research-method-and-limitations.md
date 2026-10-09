# Local research method and limitations

## Target build inventory

The two expected Windows Steam installation directories were present. Both `GameAssembly.dll` and `global-metadata.dat` were present for each game. Metadata header versions read locally: *Disco Elysium* v27 and *Zero Parades* v39. The user's prior inventory reports Unity 2020.3.12f1 and Unity 6000.3.15f1 respectively; those exact editor versions were not independently recovered in this pass.

The pre-existing C4 research directory and its `.venv`, extractor scripts, `c4_schema_summary.json`, `dialogue_data/index.json`, `skills.json`, and 321 JSON chunk files were present. The existing extraction inventory reports 81,894 cards, 321 chunks, 1,535 flow-to-chunk records, and zero failures. This study reused those JSONs and did not rerun extraction.

Python 3.14.2 was available through the existing research virtual environment. UnityPy was importable there. Unity Hub and Unity Editor 6000.2.13f1 were found. No matching Unity 2020 editor was found in the focused Unity installation directory check. No IL2CPP dumper executable or Cpp2IL/AssetRipper installation was found in the focused research, project, Unity and downloads roots. A public Il2CppDumper source checkout was examined; compilation could not proceed because no .NET SDK is installed. No SDK or large tool was installed.

The COSMOS remote's `main` HEAD matched the supplied commit `3ef2d391a04e740d6f863d046e498871b9010978`. A clean local clone was created and a research branch was started from that HEAD.

## Procedure

1. Confirmed expected file presence and metadata sizes without changing Steam files.
2. Read metadata magic/version headers and performed focused string-pool searches for movement, navigation, camera, interaction and dialogue names.
3. Reused the existing C4 summary, flow index and chunk records. Counted typed records and inspected representative link/condition/check structures while excluding dialogue text from outputs.
4. Read the current COSMOS exploration, narrative, save and UI source to compare existing behavior and data ownership.
5. Wrote implementation contracts and a standalone coding handoff using original/synthetic examples only.

No game process injection, DRM bypass, executable patching, Steam file changes, scene reconstruction, proprietary code publication, or bundle publication was performed. No full C4 bundle extraction was repeated. No assets or dialogue were added to the public repository.

## What this method establishes

- Metadata v27/v39 and presence of focused runtime/type/method name strings.
- Structural relations represented in already-extracted C4 JSON: record IDs, card IDs, flow IDs, output-pin records, nested condition records, property data types, and named card families.
- COSMOS implementation behavior visible in its TypeScript source, including local component state, save fields, graph model and check-attempt rules.

## What it does not establish

- Executable method logic or complete C# classes. Metadata names are not source code and do not prove runtime component attachment or call order.
- Serialized Unity scene hierarchies, actual camera values, NavMesh geometry, collision placement, asset relationships, or exact interaction distances.
- The full game runtime semantics of C4 cards/checks/hooks, including ordering, default values, attempt resets, thought timing, and critical outcomes.
- Exact Unity editor patch versions beyond the previously supplied inventory.
- The commercial game's behavior during live play; no controlled runtime observation was performed.

## Reproducibility and publication boundary

The public documents describe broad architecture and use synthetic identifiers and examples. Private machine paths, raw JSON records, dialogue text, metadata dumps, assets, bundles and binaries are intentionally excluded. Reproducing the local checks requires access to the user's own licensed installation and private prior research files. The public COSMOS implementation should be based only on these abstract findings and original project content.
