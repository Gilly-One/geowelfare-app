# Architecture Notes

## Excel/VBA to Web Mapping

| Excel/VBA component | Web equivalent |
|---|---|
| Membership sheet | `members` Firestore/localStorage collection + Members page |
| Dues Input sheet | Payments page + `transactions` collection |
| Receipts sheet | Receipt viewer template rendered as HTML |
| Receipt Archive sheet | `receipts` collection |
| Report 2024/2025/2026 sheets | Dynamic Reports page filtered by year |
| Beneficiaries sheet | `beneficiaries` collection + Beneficiaries page |
| Coffers sheet | `coffers` collection + Coffers page |
| Dashboard sheet | Dashboard page with live aggregation |
| `EnterDues` VBA macro | `GWF.db.createPayment(input)` |
| `GenerateReceipt` VBA macro | `nextReceiptNo(year)` + receipt document creation |
| `RegenerateReceipt` VBA macro | Receipts page lookup/view |
| `RefreshDashboard` VBA macro | Dashboard JS aggregation on page load |
| `BackupSheets` VBA macro | JSON backup download in Settings |

## Core JavaScript modules

- `utils.js`: formatting, dates, money, receipt rendering, CSV download
- `data.js`: localStorage/Firebase data adapter and business logic
- `auth.js`: login/logout guard with Firebase or demo fallback
- `components.js`: layout/sidebar/modal helpers
- Page controllers: `dashboard.js`, `members.js`, `payments.js`, `receipts.js`, `reports.js`, `welfare.js`, `coffers.js`, `settings.js`

## Why static HTML/JS

The user selected simple HTML + JavaScript. This removes Node/build complexity and keeps maintenance simple for a non-specialist administrator. Netlify can host it for free as static files.

## Why Firebase

Firebase provides Authentication, Firestore, real-time capable document storage, and generous free-tier usage. It is straightforward for a small departmental welfare system and needs no private server.

## Security notes

This prototype includes client-side role checks for UX. For production, configure Firestore Security Rules so only admins can write to members, transactions, receipts, beneficiaries, and coffers. Members should only read their own records if member accounts are introduced.

Suggested starting rules are documented in `docs/FIRESTORE_RULES.txt`.
