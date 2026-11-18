BEGIN;
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
COMMIT;