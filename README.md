# SatQuery AI Frontend v25

This is the continuation of the existing SatQuery AI landing-page/login work. The landing page and visual identity are preserved; the post-login application uses React + Vite.

## Important v25 navigation fix

The repeated blank/recovery-page issue came from relying on hash navigation and rendering route-dependent views from that hash. v25 uses a single React application state as the source of truth for navigation. `history.pushState` is used only to keep browser history, and `popstate` restores the React view. Clicking a navigation item or an Analyze example therefore does not require a browser refresh.

The app no longer contains an application-level “reopen/refresh this view” recovery screen. A normal click should update the current React view immediately.

## Analyze interaction

- Example cards insert the example imagery and question directly into the chat.
- Typed questions can be sent with the arrow or Enter.
- Uploaded images are shown in the pending area and then in the user message.
- Assistant responses are generated synchronously for the demo, so there is no delayed state transition that can leave the conversation in an intermediate view.

## Workspaces

- Search, create, edit, open and delete workspaces work in the same application.
- A workspace has its own analyses and conversations.
- New analysis opens a conversation inside the selected workspace.
- Follow-up questions stay inside the same analysis conversation.
- Cover-image upload shows the selected image immediately in the create form and carries it into the created workspace.

## Run

```cmd
npm install
npm run dev
```

Then open the URL printed by Vite, normally `http://127.0.0.1:5173/`. Start at the landing page.

Do not mix files from v17-v24 into this folder.


## v28 History & Reports

History and Reports now follow the supplied reference layouts. Reports use source-backed NASA Earth Observatory imagery/data where available and label prototype interpretation separately from source context. PDF export uses the browser print dialog so the user can choose Save as PDF.

Reference sources: NASA Earth Observatory Heavy Rain in Assam (2010), Record Crops in India (2008), Urban Growth of New Delhi (1989/2018), NASA Returns to the Beach: Wide Wildwood Beaches (1986/2019), and Mapping Forest Loss with Landsat (2000–2013).


## v30 page structure
This continuation keeps the existing landing/login experience and gives the app real separate document pages. The main application pages are `analyze.html`, `workspaces.html`, `new-workspace.html`, `workspace.html?id=...`, `new-analysis.html?workspace=...`, `analysis.html?workspace=...&analysis=...`, `history.html`, `reports.html`, `report.html?id=...`, `settings.html`, and `help.html`. Sidebar navigation uses normal document navigation so each page mounts React fresh instead of sharing one hash-routed `app.html` view. Conversation/workspace/report state stays in localStorage so returning to a page preserves the demo data.

Run with:
```bash
npm install
npm run dev
```
Start at `http://127.0.0.1:5173/` and use the landing page login flow.

Navigation is document-based in v30: each major view has its own HTML document and React mounts inside that page. Mutations that immediately navigate (workspace creation/report generation/deletion) persist to localStorage before leaving the page.


### v33 patch
This build preserves v32 and restores the shared chat/workspace components that were missing from v32, fixes the Analyze composer layout, and keeps the current Analyze report print flow scoped to Analyze.
