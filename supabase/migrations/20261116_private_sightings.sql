-- Apply before releasing the new case experience against a live database.
-- Restrictive policies also constrain any existing permissive public-read policies.
BEGIN;
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
COMMIT;
