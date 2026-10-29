# Dorm operations: workflows and dashboard extension contract

Updated: 2026-10-29 by AI (Codex). Product direction from Naoki; workflow details below are proposals for stakeholder review, not a completed rollout.

## Outcome

Reduce time spent on reporting, checking, approvals, looking up contacts and chasing outstanding actions. Accumulate records through normal work, then use recurring issues and delays to improve dorm operations and handovers. Naoki's 2026-10-30 discussion with the management company is exploratory; a later detailed workflow meeting is the intended next step.

## Current implementation in this branch

`?view=management` opens the operations dashboard. The existing monthly-document reader remains available at `?view=management&section=monthly`. Existing manager authentication and server-side allowlist checks remain. The overview reads only the existing monthly-report RPC; it does not infer missing reporters without a target roster.

`src/management/operations.ts` is the central module catalog. Available monthly documents and planned modules use the same navigation and responsive shell. Planned modules show their workflow, candidate data and unresolved operational questions. They do not write records, scan QR codes, approve requests or send notifications. They display no fictional operational metrics. Demo monthly data remains confined to `demo=1`.

Add a module by defining its stable ID and catalog entry, then a dedicated view and a data adapter. `available` is a display flag, not authorization. Each implemented module must have server-side role and dorm checks before becoming available; do not expose a new module merely because the monthly reader is allowed. Keep module storage/API definitions outside the navigation component. Do not turn the monthly-report document reader into a generic editable task table.

## Candidate workflows

### Repairs and damage

Resident records photo, place and description; designated reviewer checks, returns for clarification or approves; approved report reaches the management company's agreed queue; assignee tracks progress and completion. Define whether company acknowledgement and resolution confirmation are separate events.

Proposed states: draft, submitted, needs-information, approved, acknowledged, in-progress, resolved, closed (reopen with reason if needed). Server determines actor, authority and timestamp. Prevent self-approval where reviewer separation is required. A stale/repeated approval must not send a second report. Keep the existing emergency contact route.

### Bedding exchange

Create a cycle, eligible roster and deadline. Record used-bedding return and replacement collection separately. Confirm what each QR represents and who scans it; the scan alone is not proof of identity or completion. Validate the resident, dorm, cycle and action server-side. An idempotent repeated scan must not duplicate completion. Correct mistakes through a reasoned reversal rather than deleting the history. Separate outstanding, completed, exempt and withdrawn residents. Reminders target only eligible outstanding residents at execution time.

### Officer training and briefings

Select eligible officers; announce event; collect availability if choosing a date, then RSVPs for the confirmed session. Keep RSVP, attendance, cancellation and any proxy participation distinct. Remind only current nonresponders; a missing response is not an absence. Define who can record attendance and corrections.

### Officer reports

Reuse monthly submission snapshots and the current reader. Proposed additions (not implemented): scoped questions, clarification replies and confirmation status. Preserve the existing daily-log boundary. Current same-month resubmission updates one document; do not claim complete revision history until explicitly added.

## Shared data contract proposal

Per record: stable record ID, dorm ID, module ID, relevant cycle/event/period, owner/target, status, assigned actor, due date, timestamps, version and relevant evidence references. Maintain a separate append-only event history of actor, action, time and reason when operational workflows are implemented. Do not silently convert unsubmitted private daily notes into management records.

Photo files need private storage with authorized reads and a defined retention policy; URLs must not imply public sharing. QR content should carry an opaque reference with server validation, not personal data or administrative privilege. Notification requests need an idempotency key, current eligibility recheck, explicit delivery state and retry handling. In-app inbox and device push delivery are separate capabilities; neither currently exists for these operations.

## Acceptance conditions for the next implementation slice

- Cross-dorm reads/writes and unauthorized approvals are rejected server-side.
- Actor identity and timestamps come from the trusted service, not editable profile fields.
- Failure, unknown status and empty results stay distinguishable; network failure does not become zero outstanding actions.
- Repeated submit/scan/remind does not duplicate records or external messages.
- Eligibility and permissions are rechecked when executing a reminder or transition.
- Corrections retain their reason and original event; concurrent updates do not overwrite silently.
- Pending private reports remain outside the management company's approved queue.
- Tests cover return and collection separately, RSVPs separately from attendance, and exemptions separately from outstanding work.
- UI shows saving/error/retry; a failed remote save is not presented as saved locally to the shared service.
- Measure actual handling time separately from calendar elapsed time. Track additional clarification and missed actions alongside time saved.

## Coordination

Naoki's side has prepared the workflow catalog, Web dashboard shell and browser regression tests. Please review API boundaries and propose the smallest end-to-end slice before we split Web/Flutter/backend implementation. Backend workflows, migrations, reminder delivery and native screens remain to implement. The branch does not change production DB, auth settings, Web hosting or TestFlight version numbers.
