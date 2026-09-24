-- Base band consistency audit (counts only, no PII). Run with service-role SQL
-- against romrxbjj-v2. Companion to src/lib/mobilityBands.test.ts, covering the
-- data side the unit test cannot see:
--   * persisted joint_scores vs the compute_joint_scores() formula (drift)
--   * how many real (non-test) accounts saw the pre-fix My Body vs My Protocol
--     band disagreement (worst joint band vs PRS-aggregate band)
--   * assessments whose worst_joints would list > 3 "top problem areas" pre-fix
-- Expected after the fix: joint_scores_drift = 0. The legacy_* columns are
-- historical exposure counts (what the old UI showed), not current bugs.
WITH a AS (
  SELECT a.*, COALESCE(public.is_test_account(u.email), true) AS is_test
  FROM public.assessments a LEFT JOIN auth.users u ON u.id = a.user_id
),
bi(k, l, r, rb, nm, tgt) AS (VALUES
  ('hip_er','hip_er_l','hip_er_r',40,40,45),('hip_ir','hip_ir_l','hip_ir_r',30,30,45),
  ('hip_abd','hip_abd_l','hip_abd_r',30,40,90),('hip_flex','hip_flex_l','hip_flex_r',100,100,120),
  ('shoulder_er','shoulder_er_l','shoulder_er_r',60,60,90),('shoulder_flex','shoulder_flex_l','shoulder_flex_r',120,140,180),
  ('ankle_df','ankle_df_l','ankle_df_r',10,10,20),('cervical_lat','cervical_lat_l','cervical_lat_r',30,40,45)),
si(k, c, rb, nm, tgt) AS (VALUES
  ('lumbar_flex','lumbar_flex',40,40,60),('lumbar_ext','lumbar_ext',15,20,25),
  ('cervical_flex','cervical_flex',35,45,50),('cervical_ext','cervical_ext',40,55,60)),
prs AS (  -- replica of legacy computePRS() (the /100 number)
  SELECT a.id, GREATEST(0, LEAST(100, 100
    - COALESCE((SELECT SUM(
        CASE WHEN LEAST(v.lv, v.rv) < bi.rb THEN 8 WHEN LEAST(v.lv, v.rv) < bi.nm THEN 4 ELSE 0 END
      + CASE WHEN ABS(v.lv - v.rv) >= 15 THEN 6 WHEN ABS(v.lv - v.rv) >= 8 THEN 3 ELSE 0 END)
      FROM bi, LATERAL (SELECT (to_jsonb(a)->>bi.l)::numeric lv, (to_jsonb(a)->>bi.r)::numeric rv) v
      WHERE v.lv IS NOT NULL AND v.rv IS NOT NULL), 0)
    - COALESCE((SELECT SUM(CASE WHEN x.sv < si.rb THEN 6 WHEN x.sv < si.nm THEN 3 ELSE 0 END)
      FROM si, LATERAL (SELECT (to_jsonb(a)->>si.c)::numeric sv) x WHERE x.sv IS NOT NULL), 0))) AS prs
  FROM a
),
worst AS (SELECT assessment_id, MIN(score) AS band FROM public.joint_scores GROUP BY 1),
drift AS (  -- persisted score vs formula
  SELECT js.assessment_id, count(*) n FROM public.joint_scores js
  JOIN a ON a.id = js.assessment_id
  JOIN (SELECT k, tgt FROM bi UNION ALL SELECT k, tgt FROM si) t ON t.k = js.joint_key
  WHERE js.score <> CASE
    WHEN COALESCE(LEAST(js.left_value, js.right_value), js.left_value, js.right_value) / t.tgt >= 1 THEN 3
    WHEN COALESCE(LEAST(js.left_value, js.right_value), js.left_value, js.right_value) / t.tgt >= 0.9 THEN 2
    ELSE 1 END
  GROUP BY 1
),
per AS (
  SELECT a.id, a.user_id, a.is_test,
    w.band AS my_body_band,
    CASE WHEN p.prs >= 70 THEN 3 WHEN p.prs >= 40 THEN 2 ELSE 1 END AS legacy_my_protocol_band,
    COALESCE(array_length(a.worst_joints, 1), 0) AS n_worst,
    (SELECT count(DISTINCT regexp_replace(j, '_(l|r)$', '')) FROM unnest(a.worst_joints) j) AS n_worst_distinct,
    a.assessed_at = MAX(a.assessed_at) OVER (PARTITION BY a.user_id) AS is_latest
  FROM a JOIN prs p ON p.id = a.id LEFT JOIN worst w ON w.assessment_id = a.id
)
SELECT
  CASE WHEN is_test THEN 'test' ELSE 'real' END AS cohort,
  count(DISTINCT user_id) AS users_with_assessments,
  count(*) AS assessments,
  count(*) FILTER (WHERE my_body_band IS NULL) AS assessments_without_joint_scores,
  count(DISTINCT user_id) FILTER (WHERE is_latest AND my_body_band IS DISTINCT FROM legacy_my_protocol_band AND my_body_band IS NOT NULL) AS legacy_band_mismatch_users_latest,
  count(DISTINCT user_id) FILTER (WHERE my_body_band IS DISTINCT FROM legacy_my_protocol_band AND my_body_band IS NOT NULL) AS legacy_band_mismatch_users_any,
  count(DISTINCT user_id) FILTER (WHERE is_latest AND n_worst > 3) AS legacy_gt3_problem_areas_users_latest,
  count(*) FILTER (WHERE n_worst_distinct < 3 AND n_worst > 0) AS fewer_than_3_distinct_joints_after_fix,
  (SELECT COALESCE(SUM(n), 0) FROM drift JOIN a x ON x.id = drift.assessment_id WHERE x.is_test = per.is_test) AS joint_scores_drift
FROM per GROUP BY is_test ORDER BY cohort;
