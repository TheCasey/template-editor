# Template Editor

A browser-based editor for reusable text templates. Build sections, insert configurable fields, fill a template, and copy the resulting text. Templates can be exported and imported as JSON.

**Status:** prototype. This project uses React, TypeScript, Tailwind CSS, and Create React App. Its existing test file is a starter test that expects a “learn react” link no longer present in the app; it does not establish coverage of the editor.

## Main workflows

- Start from the built-in walkthrough template.
- Create and edit template sections and field components.
- Fill fields through a separate form.
- Export a template to JSON and import it into a new session.
- Copy filled text to the clipboard.

## Run locally

```sh
npm ci
npm start
```

The standard `npm ci` installation currently fails with a peer-dependency conflict: the project uses React 19 while `react-beautiful-dnd@13.1.1` declares support through React 18. Resolve the dependency versions before treating the quick-start path as working. The development server, once installation is repaired, normally opens at `http://localhost:3000`.

```sh
npm run build
CI=true npm test -- --watchAll=false
```

The build output is `build/`. The test command runs the existing suite once; the starter assertion needs replacement before test results can serve as a useful editor regression check. Dependencies and React compatibility should be reviewed before treating this prototype as a maintained release.

## QA review

The most valuable manual checks are JSON export/import round trips, field validation, section editing, and clipboard output. See [the test plan](docs/qa-checklist.md). These cases are proposed checks, not recorded test passes.

## Repository map

- `src/components/TemplateEditor.tsx`: editor and JSON import/export.
- `src/components/ComponentModal.tsx`: field configuration.
- `src/components/FillTemplateModal.tsx`: filling fields and copying text.
- `src/utils/`: field metadata store and walkthrough template.

## Boundaries

There is no account or cloud-sync service in this project. Export a JSON copy to preserve a template across sessions. Clipboard behavior depends on browser permissions and context. A GitHub Pages deployment script is configured in `package.json`; this README does not claim a current live deployment.
