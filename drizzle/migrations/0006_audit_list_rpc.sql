CREATE OR REPLACE FUNCTION public.rg_audit_list(
  _org uuid, _search text, _action text, _from timestamptz, _to timestamptz, _limit int, _offset int)
RETURNS TABLE(id uuid, at timestamptz, actor_id uuid, actor_email text, organization_id uuid, org_name text,
  reseller_id uuid, action text, target_type text, target_id text, metadata jsonb, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH visible AS (
    SELECT e.* FROM public.audit_events e
    WHERE (public.has_platform_permission(auth.uid(), 'audit.read')
        OR (e.organization_id IS NOT NULL AND public.has_org_permission(auth.uid(), e.organization_id, 'audit.read')))
      AND (_org IS NULL OR e.organization_id = _org)
      AND (_action IS NULL OR e.action = _action)
      AND (_from IS NULL OR e.at >= _from)
      AND (_to IS NULL OR e.at < _to)
  ), joined AS (
    SELECT v.*, u.email::text AS actor_email, o.name AS org_name
    FROM visible v
    LEFT JOIN auth.users u ON u.id = v.actor_id
    LEFT JOIN public.organizations o ON o.id = v.organization_id
    WHERE _search IS NULL OR _search = '' OR
      (v.action || ' ' || coalesce(v.target_type,'') || ' ' || coalesce(v.target_id,'') || ' ' ||
       coalesce(u.email,'') || ' ' || coalesce(o.name,'') || ' ' || v.metadata::text) ILIKE '%' || _search || '%'
  )
  SELECT j.id, j.at, j.actor_id, j.actor_email, j.organization_id, j.org_name, j.reseller_id, j.action,
    j.target_type, j.target_id, j.metadata, count(*) OVER () AS total
  FROM joined j ORDER BY j.at DESC
  LIMIT least(greatest(coalesce(_limit, 25), 1), 100) OFFSET greatest(coalesce(_offset, 0), 0)
$$;
REVOKE ALL ON FUNCTION public.rg_audit_list(uuid, text, text, timestamptz, timestamptz, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rg_audit_list(uuid, text, text, timestamptz, timestamptz, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.rg_audit_actions()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT e.action FROM public.audit_events e
  WHERE public.has_platform_permission(auth.uid(), 'audit.read')
     OR (e.organization_id IS NOT NULL AND public.has_org_permission(auth.uid(), e.organization_id, 'audit.read'))
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.rg_audit_actions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rg_audit_actions() TO authenticated;