#!/usr/bin/env python3
"""
Comprehensive Financial Audit Analyzer
Performs transaction-by-transaction analysis of bank statement data
"""

import csv
import json
from datetime import datetime
from collections import defaultdict
from decimal import Decimal

class FinancialAuditor:
    def __init__(self, csv_file):
        self.csv_file = csv_file
        self.transactions = []
        self.credits = []
        self.debits = []
        self.daily_flow = defaultdict(list)
        self.verification_issues = []

    def load_data(self):
        """Load and parse CSV data"""
        with open(self.csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Parse amounts
                debit = Decimal(row['debit']) if row['debit'] else Decimal('0')
                credit = Decimal(row['credit']) if row['credit'] else Decimal('0')
                balance = Decimal(row['balance']) if row['balance'] else Decimal('0')

                txn = {
                    'txn_id': row['txn_id'],
                    'value_date': row['value_date'],
                    'post_date': row['post_date'],
                    'description': row['description'],
                    'reference_no': row['reference_no'],
                    'debit': debit,
                    'credit': credit,
                    'balance': balance,
                    'txn_type': row['txn_type'],
                    'account_source': row['account_source'],
                    'imported_at': row['imported_at'],
                    'hash': row['hash']
                }

                self.transactions.append(txn)

                # Categorize by type
                if txn['txn_type'] == 'credit':
                    self.credits.append(txn)
                else:
                    self.debits.append(txn)

                # Group by date
                self.daily_flow[txn['value_date']].append(txn)

    def extract_merchant(self, description):
        """Extract merchant/source from transaction description"""
        desc = description.upper()

        # Common patterns
        if 'POONAM M' in desc:
            return 'POONAM M'
        elif 'AGI READ' in desc:
            return 'AGI READ'
        elif 'MOHIT S' in desc:
            return 'MOHIT S'
        elif 'JASVIN T' in desc:
            return 'JASVIN T'
        elif 'CHHAVI' in desc:
            return 'CHHAVI'
        elif 'GOOGLE' in desc:
            return 'GOOGLE'
        elif 'AARYAN' in desc:
            return 'AARYAN'
        elif 'ZEPTO' in desc:
            return 'ZEPTO'
        elif 'SWIGGY' in desc:
            return 'SWIGGY'
        elif 'AMAZON' in desc:
            return 'AMAZON'
        elif 'DOMINO' in desc:
            return 'DOMINOS'
        elif 'THAPAR' in desc:
            return 'THAPAR INSTITUTE'
        elif 'GROWW' in desc or 'MUTUAL F' in desc:
            return 'GROWW/INVESTMENTS'
        elif 'AIRTEL' in desc:
            return 'AIRTEL'
        elif 'APPLE' in desc:
            return 'APPLE'
        elif 'NETFLIX' in desc:
            return 'NETFLIX'
        elif 'WRAP CHIP' in desc:
            return 'WRAP CHIP'
        elif 'HUNGERBOX' in desc or 'HUNGER BO X' in desc:
            return 'HUNGERBOX'
        elif 'BLINKIT' in desc:
            return 'BLINKIT'
        elif 'ZUDIO' in desc:
            return 'ZUDIO'
        elif 'MCDONALDS' in desc or 'MCDONALD' in desc:
            return 'MCDONALDS'
        elif 'GOIBIBO' in desc:
            return 'GOIBIBO'
        elif 'REBEL' in desc:
            return 'REBEL MARKET'
        elif 'MONU' in desc:
            return 'MONU'
        elif 'RAMESH' in desc:
            return 'RAMESH K'
        elif 'BINDER' in desc:
            return 'BINDER'
        elif 'ISHAN' in desc:
            return 'ISHAN VOHRA'
        elif 'AMIT' in desc:
            return 'AMIT KU'
        elif 'SHASHWAT' in desc:
            return 'SHASHWAT'
        elif 'JATINDER' in desc:
            return 'JATINDER'
        elif 'PUNIT' in desc:
            return 'PUNIT PA'
        elif 'UNIQUE' in desc:
            return 'UNIQUE S'
        elif 'GROWSY' in desc:
            return 'GROWSY'
        elif 'BESTIN' in desc:
            return 'BESTIN'
        elif 'SKY' in desc:
            return 'M/S.SKY'
        else:
            return 'OTHER'

    def categorize_transaction(self, txn):
        """Categorize transaction by type"""
        desc = txn['description'].upper()

        if txn['txn_type'] == 'credit':
            # Income categorization
            merchant = self.extract_merchant(desc)
            if merchant in ['POONAM M', 'MOHIT S', 'AGI READ']:
                return 'Income - Family'
            elif merchant in ['JASVIN T', 'AARYAN', 'CHHAVI']:
                return 'Income - Friends/Peer Transfer'
            elif merchant == 'GOOGLE':
                return 'Income - Rewards'
            elif 'AMAZON' in desc:
                return 'Income - Refund'
            else:
                return 'Income - Other'
        else:
            # Expense categorization
            if 'THAPAR' in desc:
                return 'Education'
            elif any(x in desc for x in ['ZEPTO', 'BLINKIT']):
                return 'Groceries'
            elif any(x in desc for x in ['SWIGGY', 'DOMINO', 'MCDONALDS', 'HUNGERBOX', 'WRAP CHIP']):
                return 'Food & Dining'
            elif any(x in desc for x in ['GROWW', 'MUTUAL F']):
                return 'Investments'
            elif any(x in desc for x in ['AMAZON', 'ZUDIO']):
                return 'Shopping'
            elif any(x in desc for x in ['AIRTEL', 'NETFLIX', 'APPLE']):
                return 'Subscriptions & Utilities'
            elif 'GOIBIBO' in desc:
                return 'Travel'
            elif any(x in desc for x in ['MONU', 'RAMESH', 'BINDER', 'ISHAN', 'AMIT', 'SHASHWAT', 'JATINDER', 'PUNIT']):
                return 'Peer Transfers'
            elif any(x in desc for x in ['REBEL', 'UNIQUE', 'GROWSY', 'BESTIN', 'SKY']):
                return 'Shopping - Local'
            else:
                return 'Other'

    def verify_balances(self):
        """Verify mathematical correctness of all balances"""
        print("Verifying transaction balances...")

        issues = []

        for i in range(len(self.transactions)):
            txn = self.transactions[i]

            if i == 0:
                # First transaction - calculate opening balance
                opening = txn['balance'] - txn['credit'] + txn['debit']
                print(f"Opening Balance (calculated): Rs.{opening:,.2f}")
                continue

            prev_txn = self.transactions[i-1]
            expected_balance = prev_txn['balance'] + txn['credit'] - txn['debit']
            actual_balance = txn['balance']

            if abs(expected_balance - actual_balance) > Decimal('0.01'):
                issue = {
                    'txn_id': txn['txn_id'],
                    'date': txn['value_date'],
                    'expected': expected_balance,
                    'actual': actual_balance,
                    'difference': actual_balance - expected_balance
                }
                issues.append(issue)

        return issues

    def analyze_patterns(self):
        """Analyze transaction patterns"""
        # Day of month analysis
        day_of_month = defaultdict(int)
        # Category analysis
        category_totals = defaultdict(Decimal)
        category_counts = defaultdict(int)
        # Merchant analysis
        merchant_totals = defaultdict(Decimal)
        merchant_counts = defaultdict(int)
        # Size analysis
        size_categories = {'small': 0, 'medium': 0, 'large': 0, 'very_large': 0}

        for txn in self.transactions:
            date_parts = txn['value_date'].split('/')
            day = int(date_parts[1])
            day_of_month[day] += 1

            category = self.categorize_transaction(txn)
            merchant = self.extract_merchant(txn['description'])

            if txn['txn_type'] == 'debit':
                category_totals[category] += txn['debit']
                category_counts[category] += 1

                merchant_totals[merchant] += txn['debit']
                merchant_counts[merchant] += 1

                # Size categorization
                amount = float(txn['debit'])
                if amount < 500:
                    size_categories['small'] += 1
                elif amount < 5000:
                    size_categories['medium'] += 1
                elif amount < 50000:
                    size_categories['large'] += 1
                else:
                    size_categories['very_large'] += 1

        return {
            'day_of_month': dict(day_of_month),
            'category_totals': {k: float(v) for k, v in category_totals.items()},
            'category_counts': dict(category_counts),
            'merchant_totals': {k: float(v) for k, v in merchant_totals.items()},
            'merchant_counts': dict(merchant_counts),
            'size_categories': size_categories
        }

    def generate_summary_statistics(self):
        """Generate comprehensive summary statistics"""
        total_credits = sum(t['credit'] for t in self.credits)
        total_debits = sum(t['debit'] for t in self.debits)

        opening_balance = self.transactions[0]['balance'] - self.transactions[0]['credit'] + self.transactions[0]['debit']
        closing_balance = self.transactions[-1]['balance']

        # Date range
        dates = [datetime.strptime(t['value_date'], '%d/%m/%Y') for t in self.transactions]
        min_date = min(dates)
        max_date = max(dates)
        days = (max_date - min_date).days + 1

        return {
            'period': f"{min_date.strftime('%b %d, %Y')} - {max_date.strftime('%b %d, %Y')}",
            'total_days': days,
            'opening_balance': float(opening_balance),
            'closing_balance': float(closing_balance),
            'total_credits': float(total_credits),
            'total_debits': float(total_debits),
            'net_change': float(closing_balance - opening_balance),
            'total_transactions': len(self.transactions),
            'total_credit_txns': len(self.credits),
            'total_debit_txns': len(self.debits),
            'avg_daily_credit': float(total_credits / days),
            'avg_daily_debit': float(total_debits / days),
            'avg_credit_amount': float(total_credits / len(self.credits)) if self.credits else 0,
            'avg_debit_amount': float(total_debits / len(self.debits)) if self.debits else 0
        }

    def detect_anomalies(self):
        """Detect unusual patterns and anomalies"""
        anomalies = []

        # Calculate average debit
        avg_debit = sum(t['debit'] for t in self.debits) / len(self.debits) if self.debits else 0

        # Find unusually large transactions (>3x average)
        for txn in self.debits:
            if txn['debit'] > avg_debit * 3:
                anomalies.append({
                    'type': 'Large Transaction',
                    'date': txn['value_date'],
                    'amount': float(txn['debit']),
                    'merchant': self.extract_merchant(txn['description']),
                    'description': txn['description'][:100]
                })

        # Find duplicate amounts on same day
        date_amounts = defaultdict(list)
        for txn in self.transactions:
            key = txn['value_date']
            amount = txn['debit'] if txn['txn_type'] == 'debit' else txn['credit']
            if amount > 0:
                date_amounts[key].append((amount, txn['description'][:50]))

        for date, amounts in date_amounts.items():
            amount_counts = defaultdict(list)
            for amt, desc in amounts:
                amount_counts[amt].append(desc)

            for amt, descs in amount_counts.items():
                if len(descs) > 1:
                    anomalies.append({
                        'type': 'Duplicate Amount',
                        'date': date,
                        'amount': float(amt),
                        'count': len(descs),
                        'transactions': descs
                    })

        return anomalies

    def run_full_audit(self):
        """Execute complete audit process"""
        print("=" * 80)
        print("COMPREHENSIVE FINANCIAL AUDIT")
        print("=" * 80)

        self.load_data()

        print(f"\nLoaded {len(self.transactions)} transactions")
        print(f"Credits: {len(self.credits)}, Debits: {len(self.debits)}")

        # Generate all analyses
        summary = self.generate_summary_statistics()
        verification_issues = self.verify_balances()
        patterns = self.analyze_patterns()
        anomalies = self.detect_anomalies()

        # Save results
        results = {
            'summary': summary,
            'verification_issues': verification_issues,
            'patterns': patterns,
            'anomalies': anomalies,
            'all_transactions': []
        }

        # Add detailed transaction data
        for txn in self.transactions:
            results['all_transactions'].append({
                'txn_id': txn['txn_id'],
                'date': txn['value_date'],
                'description': txn['description'],
                'debit': float(txn['debit']),
                'credit': float(txn['credit']),
                'balance': float(txn['balance']),
                'type': txn['txn_type'],
                'category': self.categorize_transaction(txn),
                'merchant': self.extract_merchant(txn['description'])
            })

        # Save to JSON
        with open('D:/om/finance/data/audit_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n[OK] Verification Issues Found: {len(verification_issues)}")
        print(f"[OK] Anomalies Detected: {len(anomalies)}")
        print(f"[OK] Unique Days with Transactions: {len(self.daily_flow)}")

        return results

if __name__ == '__main__':
    auditor = FinancialAuditor('D:/om/finance/data/complete_audit_export.csv')
    results = auditor.run_full_audit()
    print("\n[OK] Audit complete! Results saved to audit_results.json")
