-- The audit log is append-only and must keep references to deleted organizations/resellers,
-- so it cannot carry ON DELETE foreign keys (they would try to rewrite audit rows).
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_organization_id_fkey;
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_reseller_id_fkey;