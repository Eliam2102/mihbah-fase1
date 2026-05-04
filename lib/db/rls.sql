-- Row Level Security — tenant isolation
-- Policy: tenant_id must match app.current_tenant_id session setting
-- Set context before queries: SET app.current_tenant_id = '<uuid>';
-- In transactions use SET LOCAL to scope to the transaction.

-- ─── empresas ────────────────────────────────────────────────────────────────

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON empresas;
CREATE POLICY tenant_isolation ON empresas
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── proyectos ───────────────────────────────────────────────────────────────

ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON proyectos;
CREATE POLICY tenant_isolation ON proyectos
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── movimientos ─────────────────────────────────────────────────────────────

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON movimientos;
CREATE POLICY tenant_isolation ON movimientos
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── cuentas_pendientes ──────────────────────────────────────────────────────

ALTER TABLE cuentas_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_pendientes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON cuentas_pendientes;
CREATE POLICY tenant_isolation ON cuentas_pendientes
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── ventas_bmcorp ───────────────────────────────────────────────────────────

ALTER TABLE ventas_bmcorp ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_bmcorp FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON ventas_bmcorp;
CREATE POLICY tenant_isolation ON ventas_bmcorp
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── excel_uploads ───────────────────────────────────────────────────────────

ALTER TABLE excel_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_uploads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON excel_uploads;
CREATE POLICY tenant_isolation ON excel_uploads
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── repartos_bmcorp ─────────────────────────────────────────────────────────

ALTER TABLE repartos_bmcorp ENABLE ROW LEVEL SECURITY;
ALTER TABLE repartos_bmcorp FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON repartos_bmcorp;
CREATE POLICY tenant_isolation ON repartos_bmcorp
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── Bypass for seeds/migrations ─────────────────────────────────────────────
-- Run as superuser if you need to grant BYPASSRLS to the app role:
--   ALTER ROLE mihbah BYPASSRLS;
-- Not needed if seed/migration scripts always SET app.current_tenant_id first.
