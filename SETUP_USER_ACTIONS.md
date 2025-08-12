# Setup actions required from you (Google & env)

This checklist collects all actions you need to take before/while we implement the enhancements (Central Index + Public View Links, Drive-only uploads, SQLite switch).

## 1) Google Cloud Console (one-time)
- [ ] Create or choose a Google Cloud project for the app.
- [ ] Enable APIs: Google Drive API.
- [ ] Configure OAuth consent screen:
  - User type: External (unless your school uses Workspace and wants Internal).
  - App name, support email, developer contact email.
  - Scopes (minimum to start):
    - https://www.googleapis.com/auth/drive.file (recommended default)
    - Optional broader scope if you need to manage pre-existing files or sharing broadly: https://www.googleapis.com/auth/drive
  - Publish the app (or keep in Testing and add testers for development).
- [ ] Create OAuth 2.0 Client ID (type: Web application):
  - Authorized redirect URIs (add both dev and prod):
    - http://localhost:5000/api/auth/google/callback
    - https://YOUR_DOMAIN/api/auth/google/callback
  - Save the Client ID and Client Secret.

## 2) Environment variables (.env)
Create/Update your `.env` file in the project root with the following keys:
- [ ] GOOGLE_CLIENT_ID=your_web_client_id
- [ ] GOOGLE_CLIENT_SECRET=your_web_client_secret
- [ ] SESSION_SECRET=a-long-random-string
- [ ] APP_BASE_URL=http://localhost:5000 (change to your production URL in prod)
- [ ] NODE_ENV=development (or production)
- [ ] DATABASE_URL=sqlite://./data/app.db (this will be used when we switch to SQLite)

Notes:
- We will remove the use of any hardcoded Google Service Account. If a service account key exists in your Cloud project, consider rotating or deleting it.
- If you previously committed any key by mistake, rotate it and scrub history if needed.

## 3) Teacher account actions (after deploy)
- [ ] Each teacher signs in and clicks “Connect Google Drive” inside the app to grant access.
- [ ] Confirm uploads succeed and links open with “Anyone with the link can view”.
- [ ] If your Workspace domain restricts public link sharing, decide whether to:
  - [ ] Ask the admin to allow link sharing externally for teacher accounts, or
  - [ ] Use the “email-restricted” mode (parents must sign in with their email to view files). We can enable this later.

## 4) School admin decisions
- [ ] Decide the primary academic year label to use (e.g., 2025) so new folders are consistent.
- [ ] Decide whether public view links are acceptable for your school’s privacy policy.
- [ ] If not, provide a list of allowed parent domains/emails for restricted sharing.

## 5) Database & backup (SQLite phase)
- [ ] Confirm where the SQLite file should live (default: `data/app.db`).
- [ ] Confirm backup location and frequency (default: copy to `Logs/backups/` per deploy with timestamp).
- [ ] Provide disk space expectations/limits if hosting on shared servers.

## 6) Production domain and CORS
- [ ] Pick the production domain (e.g., files.school.edu) and set DNS.
- [ ] Confirm HTTPS is available (certs via your host).
- [ ] Share the final domain so we can add it to OAuth redirect URIs and CORS allowlist.

## 7) Optional notifications (future)
If you want email/SMS notifications to parents when new files are added:
- [ ] Choose a provider (Email: SendGrid/Mailgun; SMS: Twilio/etc.).
- [ ] Provide API keys and sender identity (domain verification may be needed).

---

## Quick verification before go-live
- [ ] A teacher can connect Google Drive successfully.
- [ ] Uploading a file creates the right path: Year → Grade → Class → Student → Category.
- [ ] Parent can open the student page and access files across multiple teachers via public view links.
- [ ] School dashboard (once implemented) can list/filter/export without Drive access.

If anything above is unclear, annotate this file and I’ll refine it. We will proceed with implementation in phases once you confirm the items you can complete now.
