-- ===== Catalog: roles & permissions (configurable, data-driven) =====
CREATE TABLE public.role_definitions (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z_]{1,48}$'),
  scope text NOT NULL CHECK (scope IN ('platform','reseller','organization','team')),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  key text PRIMARY KEY CHECK (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text NOT NULL
);
CREATE TABLE public.role_permissions (
  role_key text NOT NULL REFERENCES public.role_definitions(key) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_key, permission_key)
);
CREATE INDEX role_permissions_perm_idx ON public.role_permissions(permission_key);

-- Platform-level roles (super_admin, global_manager, auditor) — separate table, never on profiles.
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_key text NOT NULL REFERENCES public.role_definitions(key),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_key)
);

-- ===== Tenancy =====
CREATE TABLE public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reseller_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_key text NOT NULL REFERENCES public.role_definitions(key),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reseller_id, user_id)
);
CREATE INDEX reseller_memberships_user_idx ON public.reseller_memberships(user_id);

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  geo_hierarchy_enabled boolean NOT NULL DEFAULT false,
  teams_enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organizations_reseller_idx ON public.organizations(reseller_id);

-- Reseller staff see only explicitly assigned client organizations.
CREATE TABLE public.reseller_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX rca_user_idx ON public.reseller_client_assignments(user_id);

CREATE TABLE public.geographic_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.geographic_scopes(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('country','state','division','district')),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, parent_id, level, name)
);
CREATE INDEX geo_org_idx ON public.geographic_scopes(organization_id);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_key text NOT NULL REFERENCES public.role_definitions(key),
  geographic_scope_id uuid REFERENCES public.geographic_scopes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, role_key)
);
CREATE INDEX org_memberships_user_idx ON public.organization_memberships(user_id);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  geographic_scope_id uuid REFERENCES public.geographic_scopes(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE TABLE public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_key text NOT NULL REFERENCES public.role_definitions(key),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX team_memberships_user_idx ON public.team_memberships(user_id);

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  role_key text NOT NULL REFERENCES public.role_definitions(key),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  rejected_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (organization_id IS NOT NULL OR reseller_id IS NOT NULL)
);
CREATE INDEX invitations_org_idx ON public.invitations(organization_id);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_org_at_idx ON public.audit_events(organization_id, at DESC);

-- ===== Integrity: a role may only be used at its own scope =====
CREATE OR REPLACE FUNCTION public.enforce_role_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE expected text := TG_ARGV[0]; actual text;
BEGIN
  SELECT scope INTO actual FROM public.role_definitions WHERE key = NEW.role_key;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'Role % has scope %, expected %', NEW.role_key, actual, expected;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_roles_scope BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enforce_role_scope('platform');
CREATE TRIGGER reseller_memberships_scope BEFORE INSERT OR UPDATE ON public.reseller_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_role_scope('reseller');
CREATE TRIGGER org_memberships_scope BEFORE INSERT OR UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_role_scope('organization');
CREATE TRIGGER team_memberships_scope BEFORE INSERT OR UPDATE ON public.team_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_role_scope('team');

CREATE OR REPLACE FUNCTION public.enforce_team_org()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = NEW.team_id AND organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'Team does not belong to organization';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER team_memberships_org BEFORE INSERT OR UPDATE ON public.team_memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_team_org();

CREATE OR REPLACE FUNCTION public.enforce_assignment_reseller()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = NEW.organization_id AND reseller_id = NEW.reseller_id) THEN
    RAISE EXCEPTION 'Organization is not a client of this reseller';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rca_reseller BEFORE INSERT OR UPDATE ON public.reseller_client_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_reseller();

-- Audit log is append-only.
CREATE OR REPLACE FUNCTION public.audit_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.audit_immutable();

-- ===== Authorization helpers (SECURITY DEFINER avoids RLS recursion) =====
CREATE OR REPLACE FUNCTION public.has_platform_role(_uid uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role_key = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_platform_permission(_uid uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_platform_role(_uid, 'super_admin') OR EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role_key = ur.role_key
    WHERE ur.user_id = _uid AND rp.permission_key = _perm)
$$;

CREATE OR REPLACE FUNCTION public.can_access_reseller(_uid uuid, _reseller uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_platform_permission(_uid, 'platform.view_all')
    OR EXISTS (SELECT 1 FROM public.reseller_memberships WHERE user_id = _uid AND reseller_id = _reseller)
$$;

-- Effective permission inside one organization, across every path that grants it.
CREATE OR REPLACE FUNCTION public.has_org_permission(_uid uuid, _org uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.has_platform_permission(_uid, _perm)
    OR EXISTS (SELECT 1 FROM public.organization_memberships m JOIN public.role_permissions rp ON rp.role_key = m.role_key
               WHERE m.user_id = _uid AND m.organization_id = _org AND rp.permission_key = _perm)
    OR EXISTS (SELECT 1 FROM public.team_memberships t JOIN public.role_permissions rp ON rp.role_key = t.role_key
               WHERE t.user_id = _uid AND t.organization_id = _org AND rp.permission_key = _perm)
    OR EXISTS (SELECT 1 FROM public.organizations o
               JOIN public.reseller_memberships rm ON rm.reseller_id = o.reseller_id AND rm.user_id = _uid
               JOIN public.role_permissions rp ON rp.role_key = rm.role_key AND rp.permission_key = _perm
               WHERE o.id = _org AND (rm.role_key = 'reseller_admin' OR EXISTS (
                 SELECT 1 FROM public.reseller_client_assignments a WHERE a.organization_id = _org AND a.user_id = _uid)))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_org(_uid uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_org_permission(_uid, _org, 'org.view')
$$;

REVOKE EXECUTE ON FUNCTION public.has_platform_role(uuid, text), public.has_platform_permission(uuid, text),
  public.can_access_reseller(uuid, uuid), public.has_org_permission(uuid, uuid, text), public.can_access_org(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_platform_role(uuid, text), public.has_platform_permission(uuid, text),
  public.can_access_reseller(uuid, uuid), public.has_org_permission(uuid, uuid, text), public.can_access_org(uuid, uuid) TO authenticated, service_role;

-- ===== Grants (read-only to signed-in users; all writes go through verified server code) =====
GRANT SELECT ON public.role_definitions, public.permissions, public.role_permissions, public.user_roles,
  public.resellers, public.reseller_memberships, public.organizations, public.reseller_client_assignments,
  public.geographic_scopes, public.organization_memberships, public.teams, public.team_memberships,
  public.audit_events TO authenticated;
GRANT SELECT (id, organization_id, reseller_id, team_id, email, role_key, expires_at, accepted_at, rejected_at, revoked_at, invited_by, created_at)
  ON public.invitations TO authenticated;
GRANT ALL ON public.role_definitions, public.permissions, public.role_permissions, public.user_roles,
  public.resellers, public.reseller_memberships, public.organizations, public.reseller_client_assignments,
  public.geographic_scopes, public.organization_memberships, public.teams, public.team_memberships,
  public.invitations, public.audit_events TO service_role;

-- ===== RLS: deny by default, read only what your scope allows =====
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geographic_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog readable" ON public.role_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalog readable" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalog readable" ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Own or platform admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_platform_permission(auth.uid(), 'platform.view_all'));

CREATE POLICY "Reseller scope" ON public.resellers FOR SELECT TO authenticated USING (public.can_access_reseller(auth.uid(), id));
CREATE POLICY "Reseller scope" ON public.reseller_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_reseller(auth.uid(), reseller_id));
CREATE POLICY "Reseller scope" ON public.reseller_client_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_reseller(auth.uid(), reseller_id));

CREATE POLICY "Org scope" ON public.organizations FOR SELECT TO authenticated USING (public.can_access_org(auth.uid(), id));
CREATE POLICY "Org scope" ON public.geographic_scopes FOR SELECT TO authenticated USING (public.can_access_org(auth.uid(), organization_id));
CREATE POLICY "Org scope" ON public.teams FOR SELECT TO authenticated USING (public.can_access_org(auth.uid(), organization_id));
CREATE POLICY "Own or org members.view" ON public.organization_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_permission(auth.uid(), organization_id, 'members.view'));
CREATE POLICY "Own or org members.view" ON public.team_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_permission(auth.uid(), organization_id, 'members.view'));
CREATE POLICY "Invite managers" ON public.invitations FOR SELECT TO authenticated
  USING ((organization_id IS NOT NULL AND public.has_org_permission(auth.uid(), organization_id, 'members.invite'))
      OR (reseller_id IS NOT NULL AND organization_id IS NULL AND public.has_platform_permission(auth.uid(), 'resellers.manage')));
CREATE POLICY "Audit readers" ON public.audit_events FOR SELECT TO authenticated
  USING ((organization_id IS NOT NULL AND public.has_org_permission(auth.uid(), organization_id, 'audit.read'))
      OR public.has_platform_permission(auth.uid(), 'audit.read'));