#!/usr/bin/env python3
"""
Extract Wells Fargo business-checking PDF statements -> a signed activity CSV in
the SAME shape as WF's "Download Account Activity" export
(DATE,DESCRIPTION,AMOUNT,CHECK #,STATUS), which scripts/finance/import-wf-statements.ts
then imports.

Why this exists: Plaid's history ceiling is 730 days, so the bank-truth P&L can
only reach ~mid-2024 from the live Plaid item. Everything earlier must come from
statements WF releases as PDFs (2023 turned out to be unreachable; Jan 2024 is
the floor). This is the "table extraction" half of that task; the TS importer is
the DB half.

How it reads the table: WF's "Transaction history" has right-aligned
Deposits/Credits and Withdrawals/Debits columns plus an Ending-daily-balance
column. extract_text() flattens them, so we instead bucket each money token by
its right-edge x-coordinate (the columns are well separated: deposits ~x1=434,
withdrawals ~502, balance ~566). A deposit is emitted POSITIVE, a withdrawal
NEGATIVE — matching WF's own CSV convention (the importer flips both to Plaid's).

Verification (the whole point): every statement prints Total Deposits, Total
Withdrawals, and a Beginning->Ending balance. A statement only PASSES if the
summed deposits and withdrawals reconcile to the printed totals to the penny AND
begin + deposits - withdrawals == ending. A single-cent mismatch fails the run
and nothing is written — so a silent column/sign error can't reach the importer.

Usage:
  python3 scripts/finance/extract-wf-pdf.py STATEMENT.pdf [MORE.pdf ...] \
      [--write OUT.csv]

  # e.g. all of Jan-Jun 2024 into one combined CSV:
  python3 scripts/finance/extract-wf-pdf.py ~/Downloads/_0*.pdf --write ~/Downloads/wf-pdf-2024h1.csv
"""
import csv
import re
import sys
import pdfplumber

MONTHS = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
}
DATE_TOK = re.compile(r'^\d{1,2}/\d{1,2}$')          # transaction post date "1/2"
MONEY_TOK = re.compile(r'^\$?-?[\d,]+\.\d{2}$')      # "3,750.00", "-887.62", "$3,750.00"
CHECK_TOK = re.compile(r'^\d{3,6}$')                 # check number "100022"

# Column right-edge (x1) centers, overridden per page from the header words.
DEF = {'dep': 434.0, 'wd': 502.5, 'bal': 566.0}
TOL = 12.0
# End-of-transaction-history markers.
STOP = re.compile(r'^(Totals|Ending balance on|Summary of checks|Overdraft and returned|'
                  r'Monthly service fee|Account transaction fees)', re.I)


def money(tok):
    return float(tok.replace('$', '').replace(',', ''))


def col_of(x1, cols):
    if abs(x1 - cols['dep']) <= TOL:
        return 'dep'
    if abs(x1 - cols['wd']) <= TOL:
        return 'wd'
    # Anything right of the withdrawal column is the Ending-daily-balance column
    # (right-aligned ~566); treat it all as balance so a wider balance number
    # that lands a few points off can't leak into the description.
    if x1 > cols['wd'] + TOL:
        return 'bal'
    return None  # embedded in the description (e.g. "$3,750.00" mid-text) -> ignore


def parse_summary(pages_text):
    """Pull printed totals + balances + statement period from page 1."""
    t = pages_text[0]

    def grab(pat):
        m = re.search(pat, t)
        return money(m.group(1)) if m else None

    ym = re.search(r'(' + '|'.join(MONTHS) + r')\s+\d{1,2},\s+(\d{4})', t, re.I)
    return dict(
        begin=grab(r'Beginning balance on \S+\s+\$?([\d,]+\.\d{2})'),
        dep=grab(r'Deposits/Credits\s+\$?([\d,]+\.\d{2})'),
        wd=grab(r'Withdrawals/Debits\s+-?\s*\$?([\d,]+\.\d{2})'),
        end=grab(r'Ending balance on \S+\s+\$?([\d,]+\.\d{2})'),
        month=MONTHS[ym.group(1).lower()] if ym else None,
        year=int(ym.group(2)) if ym else None,
    )


def extract(path):
    rows = []
    with pdfplumber.open(path) as pdf:
        pages_text = [(p.extract_text() or '') for p in pdf.pages]
        summ = parse_summary(pages_text)
        if not (summ['year'] and summ['month']):
            raise ValueError(f'could not read statement period from {path}')
        for page in pdf.pages:
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
            if not words:
                continue
            byrow = {}
            for w in words:
                byrow.setdefault(round(w['top']), []).append(w)
            cols = dict(DEF)
            for line in byrow.values():
                for w in line:
                    if w['text'] == 'Credits':
                        cols['dep'] = w['x1']
                    elif w['text'] == 'Debits':
                        cols['wd'] = w['x1']
                    elif w['text'] == 'balance':
                        cols['bal'] = w['x1']
            in_history = False
            cur = None
            for top in sorted(byrow):
                line = sorted(byrow[top], key=lambda w: w['x0'])
                text = ' '.join(w['text'] for w in line)
                if not in_history:
                    if 'Ending daily' in text or ('Deposits/' in text and 'Withdrawals/' in text):
                        in_history = True
                    continue
                if STOP.match(text.strip()):
                    if cur:
                        rows.append(cur)
                        cur = None
                    in_history = False
                    continue
                first = line[0]
                is_new = DATE_TOK.match(first['text']) and first['x0'] < 90
                if is_new:
                    if cur:
                        rows.append(cur)
                    mm, dd = first['text'].split('/')
                    cur = dict(date=f'{int(mm):02d}/{int(dd):02d}/{summ["year"]}',
                               desc=[], amount=None, check='')
                    body = line[1:]
                elif cur is not None:
                    body = line
                else:
                    continue
                for w in body:
                    tok = w['text']
                    if MONEY_TOK.match(tok):
                        c = col_of(w['x1'], cols)
                        if c in ('dep', 'wd'):
                            if cur['amount'] is None:  # first column amount wins
                                cur['amount'] = money(tok) if c == 'dep' else -money(tok)
                            continue
                        if c == 'bal':
                            continue
                    if CHECK_TOK.match(tok) and 110 < w['x0'] < 148 and not cur['check']:
                        cur['check'] = tok
                        continue
                    cur['desc'].append(tok)
            if cur:
                rows.append(cur)
    return summ, [r for r in rows if r['amount'] is not None]


def main():
    files = [a for a in sys.argv[1:] if a.lower().endswith('.pdf')]
    if not files:
        print('usage: extract-wf-pdf.py STATEMENT.pdf [...] [--write OUT.csv]', file=sys.stderr)
        sys.exit(2)
    grand = []
    allpass = True
    for f in files:
        summ, rows = extract(f)
        dep = round(sum(r['amount'] for r in rows if r['amount'] > 0), 2)
        wd = round(-sum(r['amount'] for r in rows if r['amount'] < 0), 2)
        chain = round((summ['begin'] or 0) + dep - wd, 2)
        ok_dep = summ['dep'] is not None and abs(dep - summ['dep']) < 0.005
        ok_wd = summ['wd'] is not None and abs(wd - summ['wd']) < 0.005
        ok_chain = summ['end'] is not None and abs(chain - summ['end']) < 0.005
        ok = ok_dep and ok_wd and ok_chain
        allpass = allpass and ok
        print(f'{f.split("/")[-1]}: {summ["year"]}-{summ["month"]:02d} rows={len(rows)} '
              f'dep={dep:,.2f}/{summ["dep"]:,.2f} {"OK" if ok_dep else "XX"}  '
              f'wd={wd:,.2f}/{summ["wd"]:,.2f} {"OK" if ok_wd else "XX"}  '
              f'end={chain:,.2f}/{summ["end"]:,.2f} {"OK" if ok_chain else "XX"}  '
              f'=> {"PASS" if ok else "FAIL"}')
        grand.extend(rows)
    print(f'\nTOTAL rows: {len(grand)}   {"ALL PASS" if allpass else "SOME FAIL — nothing written"}')

    if '--write' in sys.argv:
        if not allpass:
            print('Refusing to write: a statement failed reconciliation.', file=sys.stderr)
            sys.exit(1)
        out = sys.argv[sys.argv.index('--write') + 1]
        with open(out, 'w', newline='') as fh:
            w = csv.writer(fh, quoting=csv.QUOTE_ALL)
            w.writerow(['DATE', 'DESCRIPTION', 'AMOUNT', 'CHECK #', 'STATUS'])
            for r in grand:
                w.writerow([r['date'], ' '.join(r['desc']), f'{r["amount"]:.2f}', r['check'], 'Posted'])
        print(f'wrote {len(grand)} rows -> {out}')


if __name__ == '__main__':
    main()
