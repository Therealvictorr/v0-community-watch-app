BEGIN;
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
COMMIT;