-- Remove duplicate lead_emails before adding unique constraint
DELETE FROM lead_emails a USING lead_emails b
WHERE a.id > b.id AND a.lead_id = b.lead_id AND LOWER(a.value) = LOWER(b.value);

-- Normalize existing emails to lowercase
UPDATE lead_emails SET value = LOWER(value);

-- Remove duplicate lead_phones before adding unique constraint
DELETE FROM lead_phones a USING lead_phones b
WHERE a.id > b.id AND a.lead_id = b.lead_id AND a.value = b.value;

-- CreateIndex
CREATE UNIQUE INDEX "lead_emails_lead_id_value_key" ON "lead_emails"("lead_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "lead_phones_lead_id_value_key" ON "lead_phones"("lead_id", "value");
