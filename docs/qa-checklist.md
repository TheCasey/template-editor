# Editor QA plan

Record commit, browser, date, expected/actual results, and evidence. These are unexecuted manual cases.

| Case | Steps | Expected result |
| --- | --- | --- |
| Walkthrough | Open a fresh session | Walkthrough sections and fields appear |
| Section editing | Add, rename, edit, and disable a section | Editor and filled output respect section state |
| Field editing | Insert each available field type; update its settings | Configuration and fill form agree |
| Round trip | Export JSON, reload, import the same file | Sections and component identities are restored |
| Invalid import | Import malformed JSON and a file with missing fields | Error feedback appears without corrupting usable content |
| Clipboard | Fill sample fields and copy | Plain text contains selected values and readable spacing |
| Keyboard | Navigate editor controls and dialogs | Controls are reachable and dialog focus is usable |

The existing `src/App.test.tsx` is leftover starter coverage. Replace it with tests of actual editor behavior in a separate implementation change; do not report that starter test as proof of these workflows.
