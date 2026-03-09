-- Deduplicate cities: merge rows that match on LOWER(name) + state_id.
-- Keeps the lowest ID per group (typically the seed-data row).

-- Step 1: Build a mapping from duplicate IDs to their keeper ID.
CREATE TEMP TABLE city_dedupe AS
SELECT
  c.id AS dup_id,
  keeper.id AS keep_id
FROM cities c
INNER JOIN (
  SELECT state_id, LOWER(name) AS name_lower, MIN(id) AS id
  FROM cities
  GROUP BY state_id, LOWER(name)
  HAVING COUNT(*) > 1
) keeper ON keeper.state_id = c.state_id
       AND LOWER(c.name) = keeper.name_lower
WHERE c.id != keeper.id;

-- Step 2: Reassign all FK references from duplicates to keepers.

-- leads.location_city_id
UPDATE leads
SET location_city_id = d.keep_id
FROM city_dedupe d
WHERE leads.location_city_id = d.dup_id;

-- franchise_cities (composite PK: franchise_id + city_id)
-- Delete if keeper already linked, otherwise update.
DELETE FROM franchise_cities fc
USING city_dedupe d
WHERE fc.city_id = d.dup_id
  AND EXISTS (
    SELECT 1 FROM franchise_cities fc2
    WHERE fc2.franchise_id = fc.franchise_id AND fc2.city_id = d.keep_id
  );
UPDATE franchise_cities
SET city_id = d.keep_id
FROM city_dedupe d
WHERE franchise_cities.city_id = d.dup_id;

-- campaign_cities (composite PK: campaign_id + city_id)
DELETE FROM campaign_cities cc
USING city_dedupe d
WHERE cc.city_id = d.dup_id
  AND EXISTS (
    SELECT 1 FROM campaign_cities cc2
    WHERE cc2.campaign_id = cc.campaign_id AND cc2.city_id = d.keep_id
  );
UPDATE campaign_cities
SET city_id = d.keep_id
FROM city_dedupe d
WHERE campaign_cities.city_id = d.dup_id;

-- tombstone_cities (composite PK: tombstone_id + city_id)
DELETE FROM tombstone_cities tc
USING city_dedupe d
WHERE tc.city_id = d.dup_id
  AND EXISTS (
    SELECT 1 FROM tombstone_cities tc2
    WHERE tc2.tombstone_id = tc.tombstone_id AND tc2.city_id = d.keep_id
  );
UPDATE tombstone_cities
SET city_id = d.keep_id
FROM city_dedupe d
WHERE tombstone_cities.city_id = d.dup_id;

-- blog_post_cities (composite PK: blog_post_id + city_id)
DELETE FROM blog_post_cities bc
USING city_dedupe d
WHERE bc.city_id = d.dup_id
  AND EXISTS (
    SELECT 1 FROM blog_post_cities bc2
    WHERE bc2.blog_post_id = bc.blog_post_id AND bc2.city_id = d.keep_id
  );
UPDATE blog_post_cities
SET city_id = d.keep_id
FROM city_dedupe d
WHERE blog_post_cities.city_id = d.dup_id;

-- Step 3: Delete the duplicate city rows.
DELETE FROM cities
WHERE id IN (SELECT dup_id FROM city_dedupe);

-- Step 4: Clean up.
DROP TABLE city_dedupe;
