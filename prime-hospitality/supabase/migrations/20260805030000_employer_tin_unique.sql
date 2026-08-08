-- One TIN, one employer account.
--
-- Partial rather than a plain UNIQUE constraint: employers onboarded before
-- the TIN was required still hold NULL until they pass the dashboard gate, and
-- a UNIQUE index treats every NULL as distinct anyway -- spelling out the
-- WHERE keeps that intent visible and keeps the index off the rows that don't
-- have a number yet.
--
-- Ethiopian branches of one business legitimately share the parent company's
-- TIN, so this will refuse a second account for a chain that wants one per
-- branch. That is the deliberate trade: a duplicate is far more likely to be
-- someone reusing a number they found than a chain splitting its branches, and
-- an admin can still resolve the real case by hand.

CREATE UNIQUE INDEX IF NOT EXISTS employers_tin_number_unique
  ON public.employers (tin_number)
  WHERE tin_number IS NOT NULL;
