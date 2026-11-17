-- Rollback-only authorization checks for a staging Supabase database.
-- Apply the launch bundle first. Run as postgres with ON_ERROR_STOP=1.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('f0000000-0000-4000-8000-000000000001','idanu-owner@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000002','idanu-other@example.invalid',now()),
 ('f0000000-0000-4000-8000-000000000003','idanu-reviewer@example.invalid',now());
INSERT INTO public.app_roles VALUES('f0000000-0000-4000-8000-000000000003','admin');
INSERT INTO public.reports(id,report_type,subject,reporter_id) VALUES
 ('f0000000-0000-4000-8000-000000000011','missing_child','Private draft test','f0000000-0000-4000-8000-000000000001'),
 ('f0000000-0000-4000-8000-000000000012','missing_item','Published report test','f0000000-0000-4000-8000-000000000001');
INSERT INTO public.case_contacts(report_id,contact_name,contact_phone,contact_email) VALUES('f0000000-0000-4000-8000-000000000012','Private name','Private phone','private@example.invalid');
SELECT set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000003',true);
UPDATE public.reports SET moderation_status='approved' WHERE id='f0000000-0000-4000-8000-000000000012';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.idanu_is_admin() THEN RAISE EXCEPTION 'Non-admin was promoted'; END IF;
 IF (SELECT count(*) FROM public.reports WHERE id IN ('f0000000-0000-4000-8000-000000000011','f0000000-0000-4000-8000-000000000012')) <> 1 THEN RAISE EXCEPTION 'Draft visibility leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.case_contacts WHERE report_id='f0000000-0000-4000-8000-000000000012') THEN RAISE EXCEPTION 'Private contact leaked'; END IF;
 UPDATE public.reports SET status='resolved' WHERE id='f0000000-0000-4000-8000-000000000012';
 IF FOUND THEN RAISE EXCEPTION 'Non-owner updated case'; END IF;
 BEGIN
  INSERT INTO public.app_roles VALUES(auth.uid(),'admin');
  RAISE EXCEPTION 'Role self-promotion succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.idanu_review_case('f0000000-0000-4000-8000-000000000012','verified','This action must not be allowed',NULL);
  RAISE EXCEPTION 'Non-admin reviewed case';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Administrator access required' THEN RAISE; END IF; END;
END $$;
INSERT INTO public.sightings(report_id,reporter_id,description,sighted_at) VALUES('f0000000-0000-4000-8000-000000000012',auth.uid(),'Private test tip',now());
SELECT set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.sightings WHERE report_id='f0000000-0000-4000-8000-000000000012') THEN RAISE EXCEPTION 'Owner cannot read private tip'; END IF;
 BEGIN
  UPDATE public.reports SET outcome_verification='verified' WHERE id='f0000000-0000-4000-8000-000000000012';
  RAISE EXCEPTION 'Owner self-verified outcome';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Protected case fields' THEN RAISE; END IF; END;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sightings WHERE report_id='f0000000-0000-4000-8000-000000000012') THEN RAISE EXCEPTION 'Anonymous tip leak'; END IF;
END $$;
RESET ROLE;
ROLLBACK;