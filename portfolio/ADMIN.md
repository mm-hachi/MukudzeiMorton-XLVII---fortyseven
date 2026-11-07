# The Workshop — implementation status

The requested owner-only Workshop is **not implemented yet**. This portfolio has no hidden trigger, admin URL, passcode prompt, browser draft editor, or prepare-for-GitHub button. Its current data files are build inputs, not an admin editor. Do not mistake the static source for an owner interface.

## Planned access and persistence

The required implementation must register the footer four-click trigger only for `(pointer: fine) and (min-width: 961px)`, use an accessible dialog, derive a salted PBKDF2-SHA-256 hash with at least 250,000 iterations, keep unlock state in session storage, auto-lock after 30 minutes idle, and load admin code only after unlock. Uploaded files belong in IndexedDB; draft text belongs in local browser storage.

This is a convenience gate on a static client-side site, **not real security**. Anything delivered to a browser can be inspected. Real protection is that a browser edit does not publish the site; only owner-reviewed files that the owner commits and pushes become public. Never store tokens, passwords, private URLs or secrets in admin code or data. The old Dekara GitHub API publisher is not part of this portfolio.

## Prepare-for-GitHub requirements

The future workflow must show a per-file review/diff before writing, preserve the original project until confirmed, verify `package.json` and `data/`, detect stale data versions, separate local drafts under ignored `drafts/`, refuse to write drafts unless the folder is ignored, and provide either the File System Access API folder flow or a ZIP with exact repository paths and a `CHANGES.md` manifest. It must end with copyable git commands; it must never commit, push or call GitHub.

The production build currently ignores `drafts/`. The review UI, draft persistence, media library, schema-driven forms, undo/redo, responsive preview, leak checks against actual draft records and ZIP/folder prepare step remain unimplemented.

## Current maintenance workflow

Edit published JSON in `data/`, run `npm --prefix .\\portfolio run check`, inspect the generated HTML and files, then review and commit the changes from the owner's terminal. Keep hidden/private content out of tracked data and generated output.
