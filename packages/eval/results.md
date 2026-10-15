# Extraction eval

31 synthetic documents (PDFs, scans, phone photos; 7 vendors, 7 currencies, 6 languages), run 2026-10-15.

| Metric                                 | haiku   | sonnet  | cascade |
| -------------------------------------- | ------- | ------- | ------- |
| Documents with every field right       | 31/31   | 31/31   | 31/31   |
| Correct route (auto-approve vs review) | 31/31   | 31/31   | 31/31   |
| **Wrongly auto-approved**              | **0**   | **0**   | **0**   |
| Sent to review unnecessarily           | 0       | 0       | 0       |
| Ambiguous values flagged               | 5/5     | 5/5     | 5/5     |
| Re-read by the stronger model          | 0       | 0       | 7       |
| Cost per document                      | $0.0010 | $0.0167 | $0.0050 |
| Median time per document               | 4.2 s   | 3.6 s   | 4.1 s   |
| Errors                                 | 0       | 0       | 0       |

| Field accuracy         | haiku        | sonnet       | cascade      |
| ---------------------- | ------------ | ------------ | ------------ |
| isInvoice              | 100% (31/31) | 100% (31/31) | 100% (31/31) |
| vendorName             | 100% (31/31) | 100% (31/31) | 100% (31/31) |
| vendorCountry          | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| vendorTaxId            | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| invoiceNumber          | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| issueDate              | 100% (28/28) | 100% (28/28) | 100% (28/28) |
| dueDate                | 100% (28/28) | 100% (28/28) | 100% (28/28) |
| currency               | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| lineItems              | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| subtotal               | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| discount               | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| taxRate                | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| taxAmount              | 100% (29/29) | 100% (29/29) | 100% (29/29) |
| total                  | 100% (31/31) | 100% (31/31) | 100% (31/31) |
| suspiciousInstructions | 100% (29/29) | 100% (29/29) | 100% (29/29) |

## Mistakes

### haiku

None.

### sonnet

None.

### cascade

None.
