> **DRAFT — NOT LEGAL ADVICE.** This is a starting template only. It must be reviewed and finalised by a qualified lawyer familiar with the India DPDP Act, 2023 (and any other jurisdiction you operate in) before you publish it. Fill every `[BRACKETED]` placeholder.

# Privacy Policy

**Effective date:** [DATE]
**Company:** [LEGAL ENTITY NAME] ("Astrex.ai", "we", "us")
**Contact:** [PRIVACY EMAIL] · [POSTAL ADDRESS]

## 1. Who we are and our role
Astrex.ai provides a multi-tenant, AI-powered customer-support platform. For data about **our own customers** (the businesses who sign up — "Clients"), we act as a **data controller**. For the **end-customer conversations** our Clients process through the platform, we act as a **data processor** on the Client's behalf (see our [Data Processing Agreement](./dpa.md)).

## 2. What we collect
- **Account data:** name, email, hashed password, role, company name.
- **Billing data:** plan, subscription status, and payment metadata. Card details are handled by our payment processor (Razorpay) and are **never stored on our servers**.
- **Usage data:** message counts, token usage, document/bot/seat counts, and timestamps, used for metering and billing.
- **Knowledge-base content:** documents a Client uploads to train their assistant.
- **Conversation data:** messages exchanged between a Client's end-customers and the assistant.
- **Technical data:** IP address, browser/device information, and logs, for security and rate limiting.

## 3. Why we process it (purposes & lawful basis)
Providing and securing the service; billing and fraud prevention; support; product improvement; and legal compliance. Lawful bases include performance of a contract, legitimate interests, consent (where required), and legal obligation.

## 4. Sub-processors
We use third parties to run the service, including: [MongoDB Atlas] (database), [Qdrant Cloud] (vector search), [Groq / OpenRouter] (AI inference), [Cohere] (embeddings), [Cloudflare R2 / AWS S3] (file storage), [Razorpay] (payments), and [SMTP provider] (email). A current list is available on request.

## 5. Retention & deletion
We retain account and billing data for the life of the account plus any legally required period. Conversation data is retained per the Client's configured retention window and is purged by an automated job once a record's `deletedAt` marker ages past that window. Clients (and, via their Client, end-customers) may request deletion at [PRIVACY EMAIL].

## 6. Security
Encryption in transit (TLS), tenant isolation (per-tenant vector collections and scoped queries), hashed credentials, JWT rotation with revocation, and least-privilege secrets management. No system is perfectly secure; we work to protect your data using industry-standard measures.

## 7. Your rights
Subject to applicable law, you may access, correct, delete, or export your personal data, and object to or restrict certain processing. Contact [PRIVACY EMAIL]. You may also complain to the relevant Data Protection Board / authority.

## 8. International transfers
Where data is processed outside your country, we rely on appropriate safeguards. [DESCRIBE HOSTING REGIONS.]

## 9. Changes
We may update this policy; material changes will be notified via the dashboard or email.

## 10. Contact
[PRIVACY EMAIL] · [POSTAL ADDRESS] · Grievance Officer: [NAME / EMAIL] (as required by the DPDP Act).
