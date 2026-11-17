-- Idanu launch: execute once with a privileged PostgreSQL connection.
BEGIN;

-- Source: supabase/migrations/20261116_private_sightings.sql
-- Apply before releasing the new case experience against a live database.
-- Restrictive policies also constrain any existing permissive public-read policies.

ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sightings_private_read ON public.sightings;
CREATE POLICY sightings_private_read ON public.sightings AS RESTRICTIVE FOR SELECT
USING (auth.uid() = reporter_id OR EXISTS (
  SELECT 1 FROM public.reports r WHERE r.id = sightings.report_id AND r.reporter_id = auth.uid()
));
ALTER TABLE public.sighting_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sighting_photos_private_read ON public.sighting_photos;
CREATE POLICY sighting_photos_private_read ON public.sighting_photos AS RESTRICTIVE FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sightings s WHERE s.id = sighting_photos.sighting_id));


-- Source: supabase/migrations/20261117_idanu_launch.sql
-- Idanu launch foundation. Apply after the existing reports/sightings schema.

CREATE SCHEMA IF NOT EXISTS idanu_private;
REVOKE ALL ON SCHEMA idanu_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS idanu_private.admin_emails (email text PRIMARY KEY);
INSERT INTO idanu_private.admin_emails VALUES ('therealb205@gmail.com') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.app_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = 'admin')
);
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_self_read ON public.app_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.app_roles FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.idanu_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.idanu_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_is_admin() TO anon, authenticated;
CREATE OR REPLACE FUNCTION idanu_private.assign_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM idanu_private.admin_emails WHERE email = lower(NEW.email)
  ) THEN INSERT INTO public.app_roles VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER idanu_assign_admin AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION idanu_private.assign_admin();
INSERT INTO public.app_roles SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'therealb205@gmail.com' AND email_confirmed_at IS NOT NULL ON CONFLICT DO NOTHING;

CREATE TABLE public.case_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK (length(title) BETWEEN 3 AND 160),
  owner_id uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incidents_read ON public.case_incidents FOR SELECT USING (true);
CREATE POLICY incidents_create ON public.case_incidents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending','approved','hidden','rejected','duplicate'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS outcome_verification text NOT NULL DEFAULT 'unverified'
  CHECK (outcome_verification IN ('unverified','pending','verified','disputed'));
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.reports(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS incident_id uuid REFERENCES public.case_incidents(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS last_checked_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.reports ADD CONSTRAINT reports_no_self_duplicate CHECK (duplicate_of IS DISTINCT FROM id);
CREATE INDEX IF NOT EXISTS reports_moderation_idx ON public.reports(moderation_status, created_at);
CREATE INDEX IF NOT EXISTS reports_incident_idx ON public.reports(incident_id);

CREATE TABLE public.case_contacts (
  report_id uuid PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  contact_name text, contact_phone text, contact_email text, private_details jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.case_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_private ON public.case_contacts FOR SELECT TO authenticated USING (
  public.idanu_is_admin() OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid())
);
CREATE POLICY contacts_owner_write ON public.case_contacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid())
);
INSERT INTO public.case_contacts(report_id,contact_name,contact_phone,contact_email,private_details)
SELECT id,contact_name,contact_phone,contact_email,jsonb_strip_nulls(jsonb_build_object('relationship_to_reporter',person_details->'relationship_to_reporter','vin',item_details->'vin','serial_number',item_details->'serial_number')) FROM public.reports
WHERE contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_email IS NOT NULL OR person_details ? 'relationship_to_reporter' OR item_details ? 'vin' OR item_details ? 'serial_number' ON CONFLICT DO NOTHING;
UPDATE public.reports SET contact_name = NULL, contact_phone = NULL, contact_email = NULL,
  person_details = person_details - 'relationship_to_reporter', item_details = item_details - 'vin' - 'serial_number';

CREATE POLICY reports_visibility ON public.reports AS RESTRICTIVE FOR SELECT USING (
  moderation_status = 'approved' OR reporter_id = auth.uid() OR public.idanu_is_admin()
);
CREATE POLICY reports_admin_read ON public.reports FOR SELECT TO authenticated USING (public.idanu_is_admin());
CREATE POLICY reports_admin_update ON public.reports FOR UPDATE TO authenticated USING (public.idanu_is_admin()) WITH CHECK (public.idanu_is_admin());

CREATE TABLE public.case_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id), reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id,user_id)
);
ALTER TABLE public.case_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY flags_create ON public.case_flags FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY flags_read ON public.case_flags FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.idanu_is_admin());
CREATE POLICY flags_review ON public.case_flags FOR UPDATE TO authenticated USING (public.idanu_is_admin()) WITH CHECK (public.idanu_is_admin());

CREATE TABLE public.case_follows (
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(report_id,user_id)
);
ALTER TABLE public.case_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_self_read ON public.case_follows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY follows_self_create ON public.case_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.moderation_status = 'approved'));
CREATE POLICY follows_self_delete ON public.case_follows FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.case_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE, message text NOT NULL, kind text NOT NULL DEFAULT 'update',
  created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
  dedupe_key text UNIQUE
);
ALTER TABLE public.case_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_read ON public.case_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Mark-read uses an RPC; users cannot edit message contents or recipients.
REVOKE INSERT, UPDATE, DELETE ON public.case_notifications FROM anon, authenticated;

CREATE TABLE public.case_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id), action text NOT NULL, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_private ON public.case_audit FOR SELECT TO authenticated USING (public.idanu_is_admin() OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.case_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION idanu_private.guard_case() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.contact_phone IS NOT NULL OR NEW.contact_email IS NOT NULL OR NEW.contact_name IS NOT NULL THEN
    RAISE EXCEPTION 'Contact details must use the private contact record'; END IF;
  NEW.person_details := NEW.person_details - 'relationship_to_reporter';
  NEW.item_details := NEW.item_details - 'vin' - 'serial_number';
  IF NEW.last_seen_lat IS NOT NULL AND (NEW.last_seen_lat < -90 OR NEW.last_seen_lat > 90) THEN RAISE EXCEPTION 'Invalid latitude'; END IF;
  IF NEW.last_seen_lng IS NOT NULL AND (NEW.last_seen_lng < -180 OR NEW.last_seen_lng > 180) THEN RAISE EXCEPTION 'Invalid longitude'; END IF;
  IF (NEW.last_seen_lat IS NULL) <> (NEW.last_seen_lng IS NULL) THEN RAISE EXCEPTION 'Supply both coordinates'; END IF;
  NEW.last_seen_lat := round(NEW.last_seen_lat::numeric,2);
  NEW.last_seen_lng := round(NEW.last_seen_lng::numeric,2);
  IF NEW.incident_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.case_incidents i WHERE i.id = NEW.incident_id AND (i.owner_id = auth.uid() OR public.idanu_is_admin())) THEN RAISE EXCEPTION 'Incident does not belong to you'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'pending'; NEW.outcome_verification := 'unverified'; NEW.duplicate_of := NULL;
  ELSIF NOT public.idanu_is_admin() THEN
    IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR NEW.outcome_verification IS DISTINCT FROM OLD.outcome_verification OR NEW.duplicate_of IS DISTINCT FROM OLD.duplicate_of OR NEW.reporter_id IS DISTINCT FROM OLD.reporter_id THEN RAISE EXCEPTION 'Protected case fields'; END IF;
    IF NEW.subject IS DISTINCT FROM OLD.subject OR NEW.description IS DISTINCT FROM OLD.description OR NEW.report_type IS DISTINCT FROM OLD.report_type OR (NEW.person_details - 'outcome_location' - 'outcome_state' - 'outcome_confirmed_at') IS DISTINCT FROM (OLD.person_details - 'outcome_location' - 'outcome_state' - 'outcome_confirmed_at') OR (NEW.item_details - 'outcome_location' - 'outcome_state' - 'outcome_confirmed_at') IS DISTINCT FROM (OLD.item_details - 'outcome_location' - 'outcome_state' - 'outcome_confirmed_at') THEN NEW.moderation_status := 'pending'; END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.outcome_verification = 'verified' AND NEW.outcome_verification IS DISTINCT FROM OLD.outcome_verification AND NEW.reporter_id = auth.uid() THEN RAISE EXCEPTION 'A different reviewer must verify this outcome'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR (NEW.status = 'resolved' AND (NEW.person_details IS DISTINCT FROM OLD.person_details OR NEW.item_details IS DISTINCT FROM OLD.item_details))) THEN
    NEW.outcome_verification := CASE WHEN NEW.status = 'resolved' THEN 'pending' ELSE 'unverified' END;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER idanu_guard_case BEFORE INSERT OR UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION idanu_private.guard_case();

CREATE OR REPLACE FUNCTION idanu_private.case_updated() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR NEW.outcome_verification IS DISTINCT FROM OLD.outcome_verification THEN
    INSERT INTO public.case_audit(report_id,actor_id,action) VALUES (NEW.id,auth.uid(),'Status: '||NEW.status||'; publication: '||NEW.moderation_status||'; outcome: '||NEW.outcome_verification);
    INSERT INTO public.case_notifications(user_id,report_id,message)
    SELECT DISTINCT u, NEW.id, 'A case you follow has an update. Open it to check the current status.'
    FROM (SELECT user_id u FROM public.case_follows WHERE report_id = NEW.id UNION SELECT NEW.reporter_id) recipients;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER idanu_case_updated AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION idanu_private.case_updated();

CREATE OR REPLACE FUNCTION public.idanu_review_case(case_id uuid, decision text, note text, duplicate_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.idanu_is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF note IS NULL OR length(trim(note)) < 10 OR length(note) > 1000 THEN RAISE EXCEPTION 'Add a review note of 10 to 1000 characters'; END IF;
  PERFORM 1 FROM public.reports WHERE id = case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
  IF decision IN ('approved','hidden','rejected','duplicate') THEN
    IF decision = 'duplicate' AND (duplicate_id IS NULL OR duplicate_id = case_id OR NOT EXISTS (SELECT 1 FROM public.reports WHERE id = duplicate_id AND moderation_status = 'approved' AND duplicate_of IS NULL)) THEN RAISE EXCEPTION 'Choose a different approved original case'; END IF;
    UPDATE public.reports SET moderation_status = decision, duplicate_of = CASE WHEN decision = 'duplicate' THEN duplicate_id ELSE NULL END WHERE id = case_id;
  ELSIF decision IN ('verified','disputed') THEN
    IF decision = 'verified' AND EXISTS (SELECT 1 FROM public.reports WHERE id = case_id AND reporter_id = auth.uid()) THEN RAISE EXCEPTION 'A different reviewer must verify this outcome'; END IF;
    UPDATE public.reports SET outcome_verification = decision WHERE id = case_id AND status = 'resolved';
    IF NOT FOUND THEN RAISE EXCEPTION 'Only found/recovered cases can have an outcome review'; END IF;
  ELSE RAISE EXCEPTION 'Invalid decision'; END IF;
  INSERT INTO public.case_audit(report_id,actor_id,action,note) VALUES (case_id,auth.uid(),decision,trim(note));
  UPDATE public.case_flags SET status = 'reviewed' WHERE report_id = case_id;
END; $$;
REVOKE ALL ON FUNCTION public.idanu_review_case(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_review_case(uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.idanu_check_in(case_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.reports SET last_checked_at = now() WHERE id = case_id AND reporter_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active case owner required'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.idanu_refresh_reminders() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.case_notifications(user_id,report_id,message,kind,dedupe_key)
  SELECT reporter_id,id,'Please check in: is this case still open? Update the outcome if anything has changed.','reminder',id::text||':'||last_checked_at::date::text||':'||date_trunc('week',now())::date::text
  FROM public.reports WHERE reporter_id = auth.uid() AND status = 'active' AND last_checked_at < now() - interval '7 days'
  ON CONFLICT (dedupe_key) DO NOTHING;
END; $$;
CREATE OR REPLACE FUNCTION public.idanu_read_notification(notification_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.case_notifications SET read_at = now() WHERE id = notification_id AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.idanu_check_in(uuid), public.idanu_refresh_reminders(), public.idanu_read_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_check_in(uuid), public.idanu_refresh_reminders(), public.idanu_read_notification(uuid) TO authenticated;

-- Tip privacy must hold even when a previous permissive policy exists.
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sightings_private_read ON public.sightings;
CREATE POLICY sightings_private_read ON public.sightings AS RESTRICTIVE FOR SELECT USING (
  reporter_id = auth.uid() OR public.idanu_is_admin() OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid())
);
ALTER TABLE public.sighting_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sighting_photos_private_read ON public.sighting_photos;
CREATE POLICY sighting_photos_private_read ON public.sighting_photos AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM public.sightings s WHERE s.id = sighting_id));
CREATE POLICY profiles_private_read ON public.profiles AS RESTRICTIVE FOR SELECT USING (id = auth.uid() OR public.idanu_is_admin());
CREATE POLICY attachment_visibility ON public.report_attachments AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id));

-- Files are served through short-lived signed URLs. New paths begin with report UUID.
UPDATE storage.buckets SET public = false WHERE id IN ('report-images','sighting-photos');
CREATE POLICY idanu_report_files ON storage.objects FOR SELECT USING (
  bucket_id = 'report-images' AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[1])
);
CREATE POLICY idanu_report_files_guard ON storage.objects AS RESTRICTIVE FOR SELECT USING (
  bucket_id NOT IN ('report-images','sighting-photos') OR
  (bucket_id = 'report-images' AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[1])) OR
  (bucket_id = 'sighting-photos' AND EXISTS (SELECT 1 FROM public.sightings s WHERE s.id::text = (storage.foldername(name))[1]))
);
CREATE POLICY idanu_upload_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
  bucket_id NOT IN ('report-images','sighting-photos') OR
  (bucket_id = 'report-images' AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[1] AND r.reporter_id = auth.uid())) OR
  (bucket_id = 'sighting-photos' AND EXISTS (SELECT 1 FROM public.sightings s WHERE s.id::text = (storage.foldername(name))[1] AND s.reporter_id = auth.uid()))
);
NOTIFY pgrst, 'reload schema';


-- Source: supabase/migrations/20261117_locations.sql

CREATE TABLE idanu_private.geocoding_budget(id boolean PRIMARY KEY DEFAULT true CHECK(id), last_call timestamptz NOT NULL DEFAULT '-infinity');
INSERT INTO idanu_private.geocoding_budget(id) VALUES(true);
CREATE FUNCTION public.idanu_geocoding_lease() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE idanu_private.geocoding_budget SET last_call=clock_timestamp() WHERE id AND last_call < clock_timestamp()-interval '1100 milliseconds';
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.idanu_geocoding_lease() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_geocoding_lease() TO anon,authenticated;


-- Source: supabase/migrations/20261117_security_reminders.sql

CREATE POLICY sightings_active_insert ON public.sightings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 reporter_id=auth.uid() AND is_verified=false AND EXISTS(SELECT 1 FROM public.reports r WHERE r.id=report_id AND r.status='active')
);
CREATE FUNCTION idanu_private.guard_sighting_verification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT public.idanu_is_admin() THEN RAISE EXCEPTION 'Only reviewers may verify sightings'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER idanu_guard_sighting BEFORE UPDATE ON public.sightings FOR EACH ROW EXECUTE FUNCTION idanu_private.guard_sighting_verification();
CREATE FUNCTION idanu_private.new_tip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.case_notifications(user_id,report_id,message) SELECT reporter_id,id,'A private sighting was submitted for your case. Open the case inbox to review it.' FROM public.reports WHERE id=NEW.report_id;
 RETURN NEW;
END; $$;
CREATE TRIGGER idanu_new_tip AFTER INSERT ON public.sightings FOR EACH ROW EXECUTE FUNCTION idanu_private.new_tip();
CREATE POLICY idanu_storage_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (
 bucket_id NOT IN ('report-images','sighting-photos') OR
 (bucket_id='report-images' AND EXISTS(SELECT 1 FROM public.reports r WHERE r.id::text=(storage.foldername(name))[1] AND r.reporter_id=auth.uid())) OR
 (bucket_id='sighting-photos' AND EXISTS(SELECT 1 FROM public.sightings s WHERE s.id::text=(storage.foldername(name))[1] AND s.reporter_id=auth.uid()))
) WITH CHECK (
 bucket_id NOT IN ('report-images','sighting-photos') OR
 (bucket_id='report-images' AND EXISTS(SELECT 1 FROM public.reports r WHERE r.id::text=(storage.foldername(name))[1] AND r.reporter_id=auth.uid())) OR
 (bucket_id='sighting-photos' AND EXISTS(SELECT 1 FROM public.sightings s WHERE s.id::text=(storage.foldername(name))[1] AND s.reporter_id=auth.uid()))
);
CREATE POLICY idanu_storage_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (
 bucket_id NOT IN ('report-images','sighting-photos') OR
 (bucket_id='report-images' AND EXISTS(SELECT 1 FROM public.reports r WHERE r.id::text=(storage.foldername(name))[1] AND r.reporter_id=auth.uid())) OR
 (bucket_id='sighting-photos' AND EXISTS(SELECT 1 FROM public.sightings s WHERE s.id::text=(storage.foldername(name))[1] AND s.reporter_id=auth.uid()))
);
CREATE FUNCTION public.idanu_enqueue_reminders() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.case_notifications(user_id,report_id,message,kind,dedupe_key)
 SELECT reporter_id,id,'Please check in: is this case still open? Update the outcome if anything has changed.','reminder',id::text||':'||last_checked_at::date::text||':'||date_trunc('week',now())::date::text
 FROM public.reports WHERE status='active' AND last_checked_at<now()-interval '7 days' ON CONFLICT(dedupe_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.idanu_enqueue_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.idanu_enqueue_reminders() TO service_role;
-- Supabase projects with Cron enabled get a daily sweep. Inbox refresh is also a fallback.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.schedule('idanu-owner-check-ins','0 8 * * *','SELECT public.idanu_enqueue_reminders()');
 ELSE RAISE NOTICE 'Enable Supabase Cron, then schedule SELECT public.idanu_enqueue_reminders() daily. Inbox reminders still work.';
 END IF;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('report-images','report-images',false,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif']),
 ('sighting-photos','sighting-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY idanu_upload_owned ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 (bucket_id='report-images' AND EXISTS(SELECT 1 FROM public.reports r WHERE r.id::text=(storage.foldername(name))[1] AND r.reporter_id=auth.uid())) OR
 (bucket_id='sighting-photos' AND EXISTS(SELECT 1 FROM public.sightings s WHERE s.id::text=(storage.foldername(name))[1] AND s.reporter_id=auth.uid()))
);
CREATE POLICY idanu_attachment_owner_guard ON public.report_attachments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 EXISTS(SELECT 1 FROM public.reports r WHERE r.id=report_id AND r.reporter_id=auth.uid())
);
GRANT SELECT ON public.app_roles,public.case_contacts,public.case_flags,public.case_follows,public.case_notifications,public.case_audit TO authenticated;
GRANT SELECT ON public.case_incidents TO anon,authenticated;
GRANT INSERT ON public.case_incidents,public.case_contacts,public.case_flags,public.case_follows TO authenticated;
GRANT DELETE ON public.case_follows TO authenticated;
GRANT UPDATE ON public.case_flags TO authenticated;


-- Source: supabase/migrations/20261117_submission.sql

CREATE POLICY incidents_visibility ON public.case_incidents AS RESTRICTIVE FOR SELECT USING (
 owner_id=auth.uid() OR public.idanu_is_admin() OR EXISTS (SELECT 1 FROM public.reports r WHERE r.incident_id=case_incidents.id AND r.moderation_status='approved')
);
CREATE OR REPLACE FUNCTION public.idanu_submit_case(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE case_id uuid; group_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF length(trim(payload->>'subject')) < 3 OR length(payload->>'subject') > 200 THEN RAISE EXCEPTION 'Invalid title'; END IF;
 IF payload->>'report_type' NOT IN ('missing_child','missing_item') THEN RAISE EXCEPTION 'Invalid report category'; END IF;
 IF payload->>'incident_id' IS NOT NULL AND payload->>'incident_id' <> '' THEN group_id := (payload->>'incident_id')::uuid;
 ELSIF length(trim(payload->>'incident_title')) >= 3 THEN
  INSERT INTO public.case_incidents(title,owner_id) VALUES (trim(payload->>'incident_title'),auth.uid()) RETURNING id INTO group_id;
 END IF;
 IF group_id IS NOT NULL AND (payload->>'report_type' <> 'missing_child' OR payload->'person_details'->>'case_kind' IS DISTINCT FROM 'reported_kidnapping') THEN RAISE EXCEPTION 'Only reported kidnappings can be linked to an incident'; END IF;
 INSERT INTO public.reports(reporter_id,report_type,subject,description,person_details,item_details,last_seen_location,last_seen_lat,last_seen_lng,last_seen_at,incident_id)
 VALUES(auth.uid(),payload->>'report_type',trim(payload->>'subject'),payload->>'description',nullif(payload->'person_details','null'),nullif(payload->'item_details','null'),payload->>'last_seen_location',(payload->>'last_seen_lat')::double precision,(payload->>'last_seen_lng')::double precision,(payload->>'last_seen_at')::timestamptz,group_id) RETURNING id INTO case_id;
 INSERT INTO public.case_contacts(report_id,contact_name,contact_phone,contact_email,private_details) VALUES(case_id,left(payload->>'contact_name',120),left(payload->>'contact_phone',80),left(payload->>'contact_email',254),jsonb_strip_nulls(jsonb_build_object('relationship_to_reporter',payload->'person_details'->'relationship_to_reporter','vin',payload->'item_details'->'vin','serial_number',payload->'item_details'->'serial_number')));
 RETURN case_id;
END; $$;
REVOKE ALL ON FUNCTION public.idanu_submit_case(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_submit_case(jsonb) TO authenticated;


CREATE TABLE IF NOT EXISTS idanu_private.launch_versions(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO idanu_private.launch_versions(version) VALUES('20261117');
COMMIT;
