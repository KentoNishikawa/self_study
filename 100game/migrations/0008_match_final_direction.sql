-- Phase 11: store final direction for match history display.
-- direction_start is always UP in current rules, so history should display final_direction instead.

ALTER TABLE match_results
ADD COLUMN final_direction TEXT;

UPDATE match_results
SET final_direction = CASE
  WHEN result_reason = 'bust' AND final_total <= 0 THEN 'DOWN'
  WHEN result_reason = 'bust' AND final_total >= target_value THEN 'UP'
  ELSE direction_start
END
WHERE final_direction IS NULL;
