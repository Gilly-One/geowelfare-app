# Geology Department Welfare Web App

A modern static web application converted from the Excel/VBA welfare workbook concept.

## What is included

- Dashboard with KPIs, recent receipts, member lookup, and chart
- Members management with preserved member ID formats
- Dues payment entry with automatic receipt generation
- Receipt archive, print/PDF flow, and WhatsApp sharing
- Yearly member × month report grid with CSV export and print/PDF
- Beneficiary welfare payout records
- Coffer / ad-hoc inflow records
- Firebase Authentication + Firestore support
- localStorage demo mode when Firebase is not configured
- Excel workbook import tool using SheetJS
- Netlify-ready static hosting files

## Important business rules implemented

- Monthly dues default: `GHS 50`
- Member statuses: Active, Inactive, Suspended, Retired
- Only Active members can receive dues payments
- Payment modes: Cash, Momo, Bank Transfer, Cheque, Other
- Admin name is saved on every transaction
- Receipt IDs use `GWF-YYYY-NNN`
- Receipt sequence is global by highest numeric suffix and does **not** reset per year
- Existing member ID formats are preserved exactly as imported

## Project structure

```txt
geology-welfare-app/
  index.html                    # Login
  dashboard.html                # Dashboard
  members.html                  # Member list/edit
  payments.html                 # Dues input + receipt generation
  receipts.html                 # Receipt archive/regeneration
  reports.html                  # Annual reports
  welfare.html                  # Beneficiary payouts
  coffers.html                  # Other inflows
  settings.html                 # Settings, backup, import link
  migrate/import-excel.html     # Workbook migration tool
  assets/css/styles.css         # App styling
  assets/js/firebase-config.js  # Firebase + app constants
  assets/js/*.js                # Shared modules and page controllers
  netlify.toml / _redirects     # Netlify deployment config
```

## Run locally

Because this is plain HTML/CSS/JS, no build step is required.

Option 1: open `index.html` directly in a browser.

Option 2: run a local static server:

```bash
cd geology-welfare-app
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Firebase setup

1. Go to Firebase Console and create a project.
2. Add a Web App.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create a **Firestore Database**.
5. Copy the Firebase web config into:

```js
assets/js/firebase-config.js
```

6. Create users in Firebase Authentication.
7. Optional: add user role documents in Firestore collection `users`:

```json
{
  "id": "firebaseAuthUserUid",
  "displayName": "Treasurer",
  "role": "admin"
}
```

If no Firebase config is provided, the app runs in localStorage demo mode.

## Firestore collections

### members

```js
{
  id,
  memberId,       // preserved exactly as imported
  name,
  dateJoined,
  status,
  contact,
  email,
  notes
}
```

### transactions

```js
{
  id,
  memberDocId,
  memberId,
  memberName,
  date,
  month,
  year,
  amount,
  mode,
  adminName,
  notes,
  receiptNo
}
```

### receipts

```js
{
  id,
  receiptNo,
  transactionId,
  memberDocId,
  memberId,
  memberName,
  contact,
  date,
  month,
  year,
  amount,
  mode,
  adminName,
  notes
}
```

### beneficiaries

```js
{ id, date, type, name, amount, notes }
```

### coffers

```js
{ id, date, source, amount, mode, notes }
```

## Excel import

Open:

```txt
migrate/import-excel.html
```

Upload your `.xlsx` or `.xlsm` file and preview before import.

The importer looks for sheet names containing:

- `Membership`
- `Dues`
- `Archive`
- `Beneficiaries`
- `Coffers`

It uses flexible header matching, for example `Member ID`, `ID`, `MemberId`, `Member Name`, `Payment Date`, etc.

If your workbook headers are different, adjust the header aliases in `migrate/import-excel.html`.

## Netlify deployment

1. Upload the `geology-welfare-app` folder to GitHub or drag it into Netlify.
2. Netlify will publish the folder directly. No build command is needed.
3. Make sure `firebase-config.js` contains your Firebase settings before deployment.

## PDF and WhatsApp receipts

- Use **Print / Save PDF** on the receipt page. Modern browsers allow saving the receipt as PDF.
- WhatsApp sharing uses a `wa.me` link with pre-filled receipt text.

## What changed vs Excel/VBA

- VBA macros were converted into JavaScript functions.
- Excel sheets became Firestore collections.
- Receipt generation is now interactive and shareable.
- Yearly reports are generated live from transaction data instead of maintaining separate annual sheets.
- Dashboard updates from data rather than manual macro refresh.
- Backups are downloadable as JSON; reports export as CSV and can be printed to PDF.

## Update notes from second testing round

Implemented after demo testing:

- Yearly reports now show actual monthly amounts paid instead of checkmarks.
- CSV export filename now includes the export date, e.g. `annual-report-2026-2026-06-17.csv`.
- CSV month columns use uppercase abbreviations: `JAN`, `FEB`, `MAR`, etc.
- Yearly report PNG/JPEG/PDF export added. Wide reports are split into two month sections.
- Monthly totals footer is marked as non-export and is omitted from print/image/PDF exports.
- Dashboard now includes grand total / balance at hand: dues + coffers - payouts.
- Member effective status is auto-calculated from dues history:
  - Active: paid within the last 3 months
  - Inactive: no dues payment in more than 3 months
  - Suspended: no dues payment in more than 6 months
  - Retired: manual admin status and not auto-changed
- Retired members are hidden from annual reports in years where they made no payment.
- Receipt viewer print now prints only the receipt, not the full page.
- Receipt PNG/JPEG download added.
- Payment page generated receipt now supports PDF, PNG, JPEG, WhatsApp, email, and copy text.
- Receipt archive table has a top horizontal scrollbar.
- Member portal added at `member-portal.html`; member users see only their own profile, payments, and receipts.
- Excel importer now also attempts to parse `Report 2024`, `Report 2025`, `Report 2026`, etc. amount matrix sheets into transaction records.
- Beneficiary import supports type/category and beneficiary/name fields. Welfare types updated to include maternity/paternity, retirement, bereavement variants, marriage, and death of a member.
