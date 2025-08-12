Design structure:
    change PostgreSQL to SQLite DB
    eliminat the option to save the files locally, always use Teacher's Google Drive
    design a better storage structure for the files based on (calendar's year, class, student id, file category)
Onboarding checklist for teachers
    Short guided steps after signup: add class → upload Excel → share parent link.
    Sample Excel to download and fill.
    Inline tips in Arabic for each step.
Parent access made clearer
    Explain “what you’ll need” before the form (civil ID, link from teacher).
    Show last-updated time and how many files exist per category.
    Optional: allow parents to request a reminder email/SMS when new files are added.
Client-side validation and guidance
    Validate civil ID length/format instantly.
    Friendly error messages in Arabic; show exactly what to fix.
Search and filtering shortcuts
    Quick filters (chips) for most-used subjects and current academic year.
    Save “recent searches” for teachers.
Smarter file organization
    Default categories with brief examples (e.g., “اختبارات: أوراق الاختبار النهائية”).
    Suggested file names (student + category + date) to keep things consistent.
Faster capture from class
    Camera capture with auto-crop/rotate for documents.
    One-tap “send to last student used” for batch scanning.
Notifications (optional)
    Teacher can toggle “notify parents when new file is added”.
    Digest option: daily/weekly summary instead of instant pings.
Insights for teachers
    A small dashboard: who has zero files, which categories are missing, top-viewed files.
    Export simple reports (PDF/CSV) for meetings.
Privacy and access controls
    Add an expiry option for parent links or a “pause access” toggle.
    Mask civil ID in the UI except on the input screen.
    Clear statement on data use and retention in Arabic.
Bulk actions and safety nets
    Undo after delete for a short time.
    Bulk upload with a progress indicator and per-file success/fail summary.
Multi-role and school view (future)
    School admin role to see multiple teachers’ stats.
    Class-level folders visible across teachers (with permissions).
Localization and accessibility
    Ensure consistent RTL in all pages.
    Larger touch targets and high-contrast mode for mobile use.
    Optional English labels below Arabic for bilingual schools.
Data lifecycle
    Archive previous academic years into a separate view to keep the main dashboard clean.
    Soft-delete with restore within 30 days.
Performance and reliability
    For large classes, show files in pages and load more on scroll.
    Clear “upload in progress” state; don’t let teachers navigate away mid-upload.
Security hygiene (important)
    Don’t expose Google Drive keys anywhere visible; store secrets safely.
    Prefer read-only parent links where possible; avoid “anyone can edit” sharing.

---

Central Index + Public View Links — Mechanism

• Overview
  - Teachers keep files in their own Google Drive.
  - The app saves an index entry for every upload (metadata + public view link) in a central database.
  - Parents and school users do not need direct access to teachers’ Drives; they use the index.

• Folder structure (on teacher’s Drive)
  - Year → Grade → Class → Student (civilId-name) → Category → Files
  - Example: 2025/الصف-السادس/الفصل-2/1234567890-أحمد-علي/اختبارات/
  - File name suggestion: yyyy-mm-dd_الفئة_وصف-اختياري.ext

• Teacher flow
  - Upload via the app; the app ensures the Drive path exists and uploads the file there.
  - The app sets sharing to Viewer with “Anyone with the link can view”.
  - The app records an index entry: driveFileId, webViewLink, category, subject, academicYear, grade, classNumber,
    studentCivilId, studentName, teacherId, createdAt, description (optional).
  - Teachers can copy/share the file/folder link from within the app if needed.

• Parent flow (Student Portfolio page)
  - Parent opens the student page and verifies using civil ID + teacher/school link code.
  - The app aggregates all index entries for that student across all teachers.
  - Files are shown by category and date, with counts and last-updated times.
  - Clicking opens the Google Drive view link directly (no login required under Public View).

• School/admin access
  - A School Dashboard reads the central index to show all files across teachers.
  - Filters: year, grade, class, subject, category, teacher.
  - Exports: CSV/PDF summaries for meetings or audits.
  - No direct Drive permission needed; the index provides links and metadata.

• Permissions & privacy
  - Default: Public View (Viewer role; “Anyone with the link can view”).
  - Optional future mode: Email-restricted (parent emails as viewers) while reusing the same index.
  - Teachers can revoke sharing on a file/folder; the index will show link status (OK/Broken) for quick fixes.

• Reliability & UX notes
  - Drive connection status visible on the teacher dashboard with Arabic tips if not connected.
  - On upload failure or quota errors, show clear Arabic messages and retry guidance.
  - Soft migration: existing files remain where they are; new uploads use the structured path.

• Acceptance criteria
  - Single student page aggregates files from all teachers and opens links without login.
  - Teacher uploads automatically create the proper Drive path and index the file with a public view link.
  - School dashboard can list/filter/export all indexed files without accessing personal Drives.
  - Security notices in the UI remind teachers to avoid uploading sensitive PII; civil IDs are masked in lists.