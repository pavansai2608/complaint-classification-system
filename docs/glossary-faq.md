# Glossary and FAQ

Plain explanations of the words used in the Complaint Resolution System, and answers to common questions. For step-by-step instructions, see the [user guide](user-guide.md).

## Glossary

| Term | Meaning |
|---|---|
| **Complaint** | A problem a customer reports. It has a title, a description and, optionally, an order reference. |
| **Order reference** | An order number the customer can add so the agent can find the order. Optional. |
| **Customer** | A person who raises complaints and follows their progress. Anyone can sign up as a customer. |
| **Agent** | A support person who works through complaints and sends replies. Agent accounts are not created on the sign-up page. |
| **Role** | What an account is allowed to do. There are two roles: customer and agent. |
| **Status** | Where a complaint stands: **Open** (received), **In Progress** (an agent is working on it) or **Resolved** (finished). |
| **Category** | The kind of problem. The system picks one of three: **billing** (payments, charges, refunds), **delivery** (late, lost or wrong deliveries) or **product** (faulty or damaged items). |
| **Confidence** | How sure the system is about the category, from 0 to 1. Below 0.6 the complaint is marked **needs review** so an agent checks it. |
| **Sentiment (emotion)** | The feeling in the text: **negative**, **neutral** or **positive**, with a score from 0 to 1 that shows how strong it is. |
| **Priority** | How quickly a complaint needs attention: **Low**, **Medium**, **High** or **Urgent**. See "How is priority decided?" below. |
| **Priority queue** | The agent's list of open complaints, with the highest priority first and older complaints before newer ones of the same priority. |
| **Suggested reply** | A draft answer written by the system for the agent to read and change. It is never sent to a customer without the agent. |
| **Needs review** | A flag set when the system is not sure about the category. An agent should check it. |
| **AI analysis** | The automatic step that gives a new complaint its category, sentiment, priority and suggested reply. |
| **Analysis pending** | The analysis could not run when the complaint was sent, for example because the service was down. The complaint is still saved with a default priority of Medium. |
| **Correction** | When an agent changes the category or priority that the system chose. The original values are kept. |

## FAQ

### For customers

**How do I track my complaint?**
Log in and select **View my complaints**. Each complaint shows its status. Select one to see the details and any reply from support.

**How do I know when an agent replied?**
The reply appears on the complaint's page under "Reply from support", and the status changes to Resolved. The app does not send emails yet, so check the page.

**Can I change or delete a complaint after sending it?**
Not yet. If you made a mistake, submit a new complaint and mention the earlier one.

**Why can I not see the category or priority of my complaint?**
They are used by the support team to sort the queue. Customers see the title, description, status and the reply.

**I forgot my password. What now?**
There is no password reset yet. Please ask the project team for help.

**My account is locked. Why?**
After 5 wrong passwords in a row the account is locked for 15 minutes. Wait, then try again.

### How the system works

**How is priority decided?**
The system checks these rules in order and uses the first one that matches:

1. **Urgent:** the text contains a serious phrase such as fraud, scam, unauthorized charge, chargeback, refund not received, legal action, lawsuit, consumer court, police complaint, data breach or identity theft.
2. **High:** the customer sounds clearly and strongly upset (negative sentiment with a score of 0.75 or more).
3. **Medium:** the customer sounds negative at any strength, or the complaint is about billing.
4. **Low:** everything else.

An agent can change the priority before replying.

**How is the category chosen?**
A small model trained on example complaints reads the description and picks billing, delivery or product. If it is less than 60% sure, the complaint is marked "needs review".

**Who writes the suggested reply?**
A language model (Google Gemini) writes a short, polite draft. The agent reads it, edits it if needed, and sends it. If the model is unavailable, a fixed template is used instead.

**What if the automatic analysis is wrong?**
An agent can correct the category and priority. The complaint is marked as corrected, and the original values are kept.

**What if the analysis service is down when I submit?**
Your complaint is still saved. It gets the default priority Medium and is marked "analysis pending".

### Your data

**Who can see my complaints?**
- **You**, and only you among customers. Other customers cannot open your complaints.
- **Agents**, who can see every complaint in the queue so they can help.

**What is stored about me?**
Your name, your email, your complaints, and the results of the analysis. Your password is never stored as text. It is stored as a one-way scrambled value that cannot be turned back into your password.

**What leaves the system?**
- The **description** of your complaint (not your name or email) is sent to our own analysis service.
- To write the suggested reply, the description is also sent to Google's Gemini service, together with the category, the priority and up to three short past complaint descriptions used as background.
- The category and sentiment models run inside our analysis service. The complaint text is not sent to anyone else for them.

**Should I put personal details in a complaint?**
No. Do not write passwords, card numbers or other private details in a complaint. Use the order reference to identify your order.

**How long is my session?**
You stay logged in for up to 7 days on the same browser. Select **Log out** on a shared computer.

**Who do I ask if I have another question?**
Contact the project team. See [CONTRIBUTING.md](../CONTRIBUTING.md) for how problems are reported.
