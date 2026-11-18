BEGIN;
CREATE TABLE idanu_private.geocoding_budget(id boolean PRIMARY KEY DEFAULT true CHECK(id), last_call timestamptz NOT NULL DEFAULT '-infinity');
INSERT INTO idanu_private.geocoding_budget(id) VALUES(true);
CREATE FUNCTION public.idanu_geocoding_lease() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE idanu_private.geocoding_budget SET last_call=clock_timestamp() WHERE id AND last_call < clock_timestamp()-interval '1100 milliseconds';
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.idanu_geocoding_lease() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.idanu_geocoding_lease() TO anon,authenticated;
COMMIT;