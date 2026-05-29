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

-- ─── Comisiones BM CORP (Épica 14) ───────────────────────────────────────────

-- lideres_alianza
ALTER TABLE lideres_alianza ENABLE ROW LEVEL SECURITY;
ALTER TABLE lideres_alianza FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON lideres_alianza;
CREATE POLICY tenant_isolation ON lideres_alianza
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- asesores
ALTER TABLE asesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE asesores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON asesores;
CREATE POLICY tenant_isolation ON asesores
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- esquemas_comision
ALTER TABLE esquemas_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE esquemas_comision FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON esquemas_comision;
CREATE POLICY tenant_isolation ON esquemas_comision
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- matriz_alianza_producto (reemplaza reglas_esquema)
ALTER TABLE matriz_alianza_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriz_alianza_producto FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON matriz_alianza_producto;
CREATE POLICY tenant_isolation ON matriz_alianza_producto
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- bonos_lider
ALTER TABLE bonos_lider ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonos_lider FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bonos_lider;
CREATE POLICY tenant_isolation ON bonos_lider
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- asesores_niveles
ALTER TABLE asesores_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asesores_niveles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON asesores_niveles;
CREATE POLICY tenant_isolation ON asesores_niveles
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- pautas_digitales
ALTER TABLE pautas_digitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pautas_digitales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pautas_digitales;
CREATE POLICY tenant_isolation ON pautas_digitales
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- comisiones_calculadas
ALTER TABLE comisiones_calculadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_calculadas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comisiones_calculadas;
CREATE POLICY tenant_isolation ON comisiones_calculadas
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- dispersiones
ALTER TABLE dispersiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispersiones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON dispersiones;
CREATE POLICY tenant_isolation ON dispersiones
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- comprobantes_pago
ALTER TABLE comprobantes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_pago FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comprobantes_pago;
CREATE POLICY tenant_isolation ON comprobantes_pago
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- usuarios_portal
ALTER TABLE usuarios_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_portal FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON usuarios_portal;
CREATE POLICY tenant_isolation ON usuarios_portal
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- nps_registros
ALTER TABLE nps_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_registros FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON nps_registros;
CREATE POLICY tenant_isolation ON nps_registros
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- niveles_membresia_config
ALTER TABLE niveles_membresia_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_membresia_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON niveles_membresia_config;
CREATE POLICY tenant_isolation ON niveles_membresia_config
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- matriz_nivel_override
ALTER TABLE matriz_nivel_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriz_nivel_override FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON matriz_nivel_override;
CREATE POLICY tenant_isolation ON matriz_nivel_override
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- bonos_umbral_config
ALTER TABLE bonos_umbral_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonos_umbral_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bonos_umbral_config;
CREATE POLICY tenant_isolation ON bonos_umbral_config
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- bonos_umbral_calculados
ALTER TABLE bonos_umbral_calculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonos_umbral_calculados FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bonos_umbral_calculados;
CREATE POLICY tenant_isolation ON bonos_umbral_calculados
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- incidencias
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON incidencias;
CREATE POLICY tenant_isolation ON incidencias
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ─── Bypass for seeds/migrations ─────────────────────────────────────────────
-- Run as superuser if you need to grant BYPASSRLS to the app role:
--   ALTER ROLE mihbah BYPASSRLS;
-- Not needed if seed/migration scripts always SET app.current_tenant_id first.
