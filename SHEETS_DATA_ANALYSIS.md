Sheets Data Analysis

Overview
- Source: Google Sheets (CSV export via gviz).
- Sheet name: Sheet1.
- Header row is present and skipped by the importer.

Column schema (as stored in the sheet)
1) txn_id
   - Unique transaction identifier.
2) value_date
   - Primary date for analytics. Format observed: DD/MM/YYYY.
3) post_date
   - Posting date. Same format as value_date.
4) description
   - Bank transaction description, often UPI/IMPS/NEFT strings with embedded merchant.
5) reference_no
   - Reference field (often empty in the current export).
6) debit
   - Debit amount (string with numeric value). Only one of debit/credit is typically populated.
7) credit
   - Credit amount (string with numeric value).
8) balance
   - Running account balance after the transaction.
9) txn_type
   - credit or debit (used to infer income vs expense).
10) account_source
    - Source account label (e.g., importer tag).
11) imported_at
    - ISO timestamp for when the row was imported into the sheet.
12) hash
    - Hash for deduplication / integrity.

Importer mapping (lib/sheets.ts)
- value_date -> Transaction.date (Date object).
- description -> Transaction.description.
- debit/credit -> Transaction.amount (credit preferred, else debit).
- txn_type -> Transaction.type (credit => income, otherwise expense).
- balance -> Transaction.balance (numeric).
- account_source -> Transaction.account.
- merchant extraction: if description contains "UPI/", the 4th segment (index 3) is used as merchant.
- category: derived by categorizeTransaction(merchant, description).
- paymentMethod: set to UPI if description contains "UPI", else OTHER.

Behavioral notes
- The balance column is the authoritative running balance. Monthly and weekly opening/closing balances should use it.
- Transactions include both income and expense with a consistent debit/credit pattern.
- Some rows show very small credits/debits (micro entries), which can affect daily aggregation.
- The importer treats value_date as the canonical date, so analytics are keyed to it.

Implications for dashboard calculations
- Monthly opening balance should be the balance at the end of the previous month.
- Weekly opening balance should be the balance from the day before the week start.
- Net change for a period should be closingBalance - openingBalance, not income - expenses.
- Savings rate remains income-based (totalIncome - totalExpenses) / totalIncome.

Data quality considerations
- description strings are long and inconsistent; category classification should rely on merchant extraction + fallback keyword matching.
- reference_no is often empty; avoid using it as a primary key.
- The sheet is append-only, so earliest balance may not represent a true account start; highlight partial-period data in UI.
