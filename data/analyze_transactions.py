import csv
from datetime import datetime
from collections import defaultdict
from decimal import Decimal
import sys

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

# Read CSV data
with open('D:/om/finance/data/transactions_raw.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    transactions = list(reader)

# Parse and prepare data
parsed_transactions = []
for txn in transactions:
    try:
        # Parse date - try both DD/MM/YYYY and MM/DD/YYYY formats
        try:
            value_date = datetime.strptime(txn['value_date'], '%d/%m/%Y')
        except ValueError:
            value_date = datetime.strptime(txn['value_date'], '%m/%d/%Y')

        # Parse amounts
        debit = Decimal(txn['debit']) if txn['debit'] else Decimal('0')
        credit = Decimal(txn['credit']) if txn['credit'] else Decimal('0')
        balance = Decimal(txn['balance'])

        parsed_transactions.append({
            'txn_id': txn['txn_id'],
            'date': value_date,
            'description': txn['description'],
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'txn_type': txn['txn_type'],
            'month': value_date.strftime('%Y-%m'),
            'day': value_date.day
        })
    except Exception as e:
        print(f"Error parsing transaction {txn.get('txn_id', 'unknown')}: {e}")

# Sort by date
parsed_transactions.sort(key=lambda x: x['date'])

print("=" * 80)
print("DEEP TRANSACTION DATA ANALYSIS REPORT")
print("=" * 80)
print()

# 1. BALANCE PROGRESSION ANALYSIS
print("1. BALANCE PROGRESSION ANALYSIS")
print("-" * 80)
first_txn = parsed_transactions[0]
last_txn = parsed_transactions[-1]

print(f"First Transaction:")
print(f"  Date: {first_txn['date'].strftime('%B %d, %Y')}")
print(f"  Balance: ₹{first_txn['balance']:,.2f}")
print()
print(f"Last Transaction:")
print(f"  Date: {last_txn['date'].strftime('%B %d, %Y')}")
print(f"  Balance: ₹{last_txn['balance']:,.2f}")
print()
print(f"Period: {first_txn['date'].strftime('%b %d')} to {last_txn['date'].strftime('%b %d, %Y')} ({len(parsed_transactions)} transactions)")
print()

# 2. MONTHLY BREAKDOWN
print("2. MONTHLY BREAKDOWN")
print("-" * 80)

monthly_data = defaultdict(lambda: {
    'transactions': [],
    'total_credits': Decimal('0'),
    'total_debits': Decimal('0'),
    'opening_balance': None,
    'closing_balance': None
})

for txn in parsed_transactions:
    month = txn['month']
    monthly_data[month]['transactions'].append(txn)
    monthly_data[month]['total_credits'] += txn['credit']
    monthly_data[month]['total_debits'] += txn['debit']

# Set opening and closing balances
for month in sorted(monthly_data.keys()):
    txns = sorted(monthly_data[month]['transactions'], key=lambda x: x['date'])
    # Opening balance = balance before first transaction
    first_txn = txns[0]
    monthly_data[month]['opening_balance'] = first_txn['balance'] + first_txn['debit'] - first_txn['credit']
    monthly_data[month]['closing_balance'] = txns[-1]['balance']

for month in sorted(monthly_data.keys()):
    data = monthly_data[month]
    opening = data['opening_balance']
    closing = data['closing_balance']
    net_change = closing - opening
    growth_rate = (net_change / opening * 100) if opening != 0 else 0

    print(f"\n{month} (January 2026):")
    print(f"  Opening Balance: ₹{opening:,.2f}")
    print(f"  Closing Balance: ₹{closing:,.2f}")
    print(f"  Total Credits (Income): ₹{data['total_credits']:,.2f}")
    print(f"  Total Debits (Expenses): ₹{data['total_debits']:,.2f}")
    print(f"  Net Change: ₹{net_change:,.2f}")
    print(f"  Growth Rate: {growth_rate:.2f}%")
    print(f"  Transaction Count: {len(data['transactions'])}")

# 3. INCOME ANALYSIS
print("\n\n3. INCOME ANALYSIS")
print("-" * 80)

income_sources = defaultdict(lambda: {'count': 0, 'total': Decimal('0'), 'transactions': []})
for txn in parsed_transactions:
    if txn['credit'] > 0:
        # Extract source from description
        desc = txn['description']
        if 'POONAM M' in desc:
            source = 'POONAM M (UPI)'
        elif 'JASVIN T' in desc:
            source = 'JASVIN T (UPI)'
        elif 'MOHIT S' in desc:
            source = 'MOHIT S (UPI)'
        elif 'AGI READ' in desc:
            source = 'AGI READ (UPI)'
        elif 'Amazon' in desc:
            source = 'Amazon (Refund)'
        elif 'GOOGLE' in desc:
            source = 'Google (Refund)'
        elif 'APPLE' in desc:
            source = 'Apple (Refund)'
        elif 'NEFT' in desc:
            source = 'NEFT Transfer'
        elif 'IMPS' in desc:
            source = 'IMPS Transfer'
        elif 'AARYAN' in desc:
            source = 'AARYAN (UPI)'
        elif 'CHHAVI' in desc:
            source = 'CHHAVI (UPI)'
        else:
            source = 'Other'

        income_sources[source]['count'] += 1
        income_sources[source]['total'] += txn['credit']
        income_sources[source]['transactions'].append(txn)

print("\nIncome Sources:")
for source in sorted(income_sources.keys(), key=lambda x: income_sources[x]['total'], reverse=True):
    data = income_sources[source]
    print(f"  {source}")
    print(f"    Total: ₹{data['total']:,.2f}")
    print(f"    Count: {data['count']} transactions")
    print(f"    Average: ₹{data['total']/data['count']:,.2f}")

# 4. LARGE EXPENSES ANALYSIS
print("\n\n4. LARGE EXPENSES ANALYSIS (₹5,000+)")
print("-" * 80)

large_expenses = [txn for txn in parsed_transactions if txn['debit'] >= 5000]
large_expenses.sort(key=lambda x: x['debit'], reverse=True)

for txn in large_expenses[:20]:  # Top 20
    print(f"  {txn['date'].strftime('%b %d')}: ₹{txn['debit']:,.2f} - {txn['description'][:70]}")

# 5. RECURRING TRANSACTIONS
print("\n\n5. RECURRING TRANSACTIONS")
print("-" * 80)

# Group by merchant/description pattern
merchant_patterns = defaultdict(lambda: {'count': 0, 'total_debit': Decimal('0'), 'transactions': []})
for txn in parsed_transactions:
    if txn['debit'] > 0:
        desc = txn['description']
        # Extract merchant name
        if 'ZEPTO' in desc.upper():
            merchant = 'Zepto (Grocery)'
        elif 'SWIGGY' in desc.upper():
            merchant = 'Swiggy (Food Delivery)'
        elif 'AMAZON' in desc.upper():
            merchant = 'Amazon'
        elif 'THAPAR' in desc.upper():
            merchant = 'Thapar Institute'
        elif 'GROWW' in desc.upper():
            merchant = 'Groww (Investment)'
        elif 'NETFLIX' in desc.upper():
            merchant = 'Netflix'
        elif 'DOMINOS' in desc.upper():
            merchant = 'Dominos'
        elif 'MCDONALD' in desc.upper():
            merchant = 'McDonalds'
        elif 'WRAP CHIP' in desc.upper():
            merchant = 'Wrap Chip (Restaurant)'
        elif 'HUNGERBOX' in desc.upper():
            merchant = 'HungerBox (Food)'
        elif 'APPLE' in desc.upper():
            merchant = 'Apple Services'
        elif 'AIRTEL' in desc.upper():
            merchant = 'Airtel (Telecom)'
        elif 'ZUDIO' in desc.upper():
            merchant = 'Zudio (Clothing)'
        elif 'GOIBIBO' in desc.upper():
            merchant = 'Goibibo (Travel)'
        elif 'BLINKIT' in desc.upper():
            merchant = 'Blinkit (Quick Commerce)'
        else:
            continue

        merchant_patterns[merchant]['count'] += 1
        merchant_patterns[merchant]['total_debit'] += txn['debit']
        merchant_patterns[merchant]['transactions'].append(txn)

print("\nRecurring Merchants (3+ transactions):")
for merchant in sorted(merchant_patterns.keys(), key=lambda x: merchant_patterns[x]['count'], reverse=True):
    data = merchant_patterns[merchant]
    if data['count'] >= 3:
        print(f"  {merchant}")
        print(f"    Total Spent: ₹{data['total_debit']:,.2f}")
        print(f"    Transactions: {data['count']}")
        print(f"    Average: ₹{data['total_debit']/data['count']:,.2f}")

# 6. DAILY SPENDING PATTERN
print("\n\n6. DAILY SPENDING PATTERN")
print("-" * 80)

day_ranges = {
    'Beginning (1-10)': (1, 10),
    'Mid-Month (11-20)': (11, 20),
    'End-Month (21-31)': (21, 31)
}

for range_name, (start, end) in day_ranges.items():
    range_debits = sum(txn['debit'] for txn in parsed_transactions if start <= txn['day'] <= end)
    range_count = sum(1 for txn in parsed_transactions if start <= txn['day'] <= end and txn['debit'] > 0)
    print(f"  {range_name}:")
    print(f"    Total Spent: ₹{range_debits:,.2f}")
    print(f"    Transactions: {range_count}")
    if range_count > 0:
        print(f"    Average: ₹{range_debits/range_count:,.2f}")

# 7. BALANCE ANOMALIES
print("\n\n7. BALANCE VERIFICATION")
print("-" * 80)

# Check if balance calculations are consistent
anomalies = []
for i in range(1, len(parsed_transactions)):
    prev_txn = parsed_transactions[i-1]
    curr_txn = parsed_transactions[i]

    expected_balance = prev_txn['balance'] - curr_txn['debit'] + curr_txn['credit']
    actual_balance = curr_txn['balance']

    # Allow for small rounding errors
    if abs(expected_balance - actual_balance) > Decimal('0.02'):
        anomalies.append({
            'date': curr_txn['date'],
            'expected': expected_balance,
            'actual': actual_balance,
            'diff': actual_balance - expected_balance
        })

if anomalies:
    print(f"Found {len(anomalies)} balance anomalies:")
    for anom in anomalies[:10]:
        print(f"  {anom['date'].strftime('%b %d')}: Expected ₹{anom['expected']:,.2f}, Actual ₹{anom['actual']:,.2f}, Diff: ₹{anom['diff']:,.2f}")
else:
    print("No balance anomalies detected. All balances are consistent.")

# 8. KEY INSIGHTS
print("\n\n8. KEY INSIGHTS")
print("-" * 80)

total_income = sum(txn['credit'] for txn in parsed_transactions)
total_expenses = sum(txn['debit'] for txn in parsed_transactions)
net_position = total_income - total_expenses

print(f"\nJanuary 2026 Summary (Jan 1-24):")
print(f"  Total Income: ₹{total_income:,.2f}")
print(f"  Total Expenses: ₹{total_expenses:,.2f}")
print(f"  Net Position: ₹{net_position:,.2f}")
print()
print(f"  Starting Balance (Before Jan 1): ₹{first_txn['balance'] + first_txn['debit'] - first_txn['credit']:,.2f}")
print(f"  Ending Balance (Jan 24): ₹{last_txn['balance']:,.2f}")
print(f"  Actual Change in Balance: ₹{last_txn['balance'] - (first_txn['balance'] + first_txn['debit'] - first_txn['credit']):,.2f}")

print("\n\n9. WHY THE MISMATCH?")
print("-" * 80)
print("""
The user reported:
  - Monthly spend: ₹3,39,000
  - Monthly income: ₹3,15,000
  - Total balance: ₹41,98,000

Our analysis shows:
  - Actual expenses (Jan 1-24): ₹{:,.2f}
  - Actual income (Jan 1-24): ₹{:,.2f}
  - Current balance (Jan 24): ₹{:,.2f}

EXPLANATION:
1. PARTIAL MONTH: This is only Jan 1-24, not a full month
2. BALANCE ≠ INCOME - EXPENSES: The total balance (₹41,98,000) is NOT calculated
   as income minus expenses. It's the RUNNING BALANCE in the account.
3. STARTING POSITION: The user started with ₹{:,.2f} before the first transaction
   on Jan 1. This is money from BEFORE this period.
4. CORRECT CALCULATION:
   - Starting Balance + Income - Expenses = Ending Balance
   - ₹{:,.2f} + ₹{:,.2f} - ₹{:,.2f} = ₹{:,.2f}

The reported numbers might be:
- User interface showing projected full month values
- Including pending transactions not yet imported
- Showing different date ranges
- Including multiple accounts combined
""".format(
    total_expenses,
    total_income,
    last_txn['balance'],
    first_txn['balance'] + first_txn['debit'] - first_txn['credit'],
    first_txn['balance'] + first_txn['debit'] - first_txn['credit'],
    total_income,
    total_expenses,
    last_txn['balance']
))

print("\n" + "=" * 80)
print("END OF ANALYSIS")
print("=" * 80)
