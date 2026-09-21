# Sample complaints

`sample_complaints.csv` is a small set of **made-up** customer complaints with the answers we expect. Use it to try out and test the analysis service. It contains no real customer data.

It is separate from the training files (`customer_complaints_*.csv`), and no sample text is used in them.

## Columns

| Column | Meaning | Values |
|---|---|---|
| `text` | The complaint as a customer would write it | free text |
| `expected_category` | The category the model should predict | `billing`, `delivery`, `product` |
| `expected_sentiment` | The customer's feeling | `negative`, `neutral`, `positive` |
| `expected_priority` | The priority the rules should give | `Low`, `Medium`, `High`, `Urgent` |

## What is in it

66 rows: 22 for each category. Each category has a mix of:

- **Angry or upset** complaints (`negative`), including strong wording such as capital letters and exclamation marks
- **Calm** questions and requests (`neutral`)
- **Happy** messages (`positive`)

## How the expected priority was chosen

The priority rules are still being built, so these values follow the planned rules. Change them if the final rules differ.

| Priority | Used for |
|---|---|
| `Urgent` | Fraud, legal threats, refunds not received after a long wait, or safety danger |
| `High` | Angry or upset customers who lost money, lost an order, or got a broken item |
| `Medium` | A real problem that needs action, but is small or calm |
| `Low` | Questions and happy messages |

## Adding rows

Keep every text invented. Never paste a real complaint, name, email address, phone number or order number. Check the file with:

```bash
cd ai-service/src/unittest/python
python -m unittest sample_complaints_tests -v
```
