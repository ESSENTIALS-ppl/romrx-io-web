-- NOT APPLIED. Oct 19 2026. Re-file Base exercises to the joint they actually train (Quinn, BASE-CONTENT-CHECK-20261019.md B3).
-- thoracic_ext and shoulder_ir are not Base joints: rows stay in the library and are never ranked. Run AFTER 20261019190000_base_tips_75.sql.
BEGIN;
DO $$ DECLARE c int := 0; k int; BEGIN
  UPDATE public.exercises SET joint_key = 'cervical_flexion' WHERE id = '1ab46629-07fa-4023-b5d1-5f1e5e497f73' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Banded Neck Flexion
  UPDATE public.exercises SET joint_key = 'cervical_flexion' WHERE id = '313524e1-7bb0-4d7c-9cca-c588b3d593ff' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Isometric Neck Flexion
  UPDATE public.exercises SET joint_key = 'cervical_flexion' WHERE id = '3785bef2-feba-401d-9dec-8a5bd332e081' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Suboccipital Foam Roller Release
  UPDATE public.exercises SET joint_key = 'cervical_flexion' WHERE id = '0b0c89a9-733a-4c75-b26e-eee22057f187' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Suboccipital Stretch
  UPDATE public.exercises SET joint_key = 'cervical_flexion' WHERE id = '664720b2-e781-4a2e-9bfd-a90723e4c908' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Supine Chin Tuck with Head Lift
  UPDATE public.exercises SET joint_key = 'cervical_lateral_flexion' WHERE id = 'd2a0e40c-0923-4d17-95e8-21e94a2a88ad' AND joint_key = 'cervical_rot'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Upper Trapezius Stretch (side bend)
  UPDATE public.exercises SET joint_key = 'thoracic_ext' WHERE id = '8cf86682-81ea-41b3-b323-c6ac260eae0d' AND joint_key = 'lumbar_flex'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Thoracic roll out of lumbar flexion (no Base joint)
  UPDATE public.exercises SET joint_key = 'thoracic_ext' WHERE id = '685b758a-5cf7-4dcb-9b03-e4c483b0d178' AND joint_key = 'lumbar_flexion'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Thoracic roll out of lumbar flexion (no Base joint)
  UPDATE public.exercises SET joint_key = 'thoracic_ext' WHERE id = '3f192df7-4bc3-4abe-a28d-24638dd4dd0e' AND joint_key = 'lumbar_ext'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Thoracic extension roll, no Base joint (Quinn; Jim can overrule)
  UPDATE public.exercises SET joint_key = 'thoracic_ext' WHERE id = 'f33bf3ba-c92d-4ae6-b9c5-504fb1d52889' AND joint_key = 'lumbar_extension'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Thoracic extension roll, no Base joint (Quinn; Jim can overrule)
  UPDATE public.exercises SET joint_key = 'shoulder_ir' WHERE id = 'dc6fbbb9-19b1-41e8-bd37-9fb77b2e6494' AND joint_key = 'shoulder_er'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Sleeper stretch is an IR stretch
  UPDATE public.exercises SET joint_key = 'shoulder_ir' WHERE id = '330e9b47-02df-4ffd-8efc-d67b70f82a29' AND joint_key = 'shoulder_er'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Sleeper stretch is an IR stretch
  UPDATE public.exercises SET joint_key = 'hip_ext' WHERE id = '337596ae-0111-496f-8810-ce8fae2f5f39' AND joint_key = 'lumbar_ext'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Glute bridge is hip extension
  UPDATE public.exercises SET joint_key = 'hip_extension' WHERE id = '52230336-f37b-4d7a-82d1-94d46f85b0e3' AND joint_key = 'lumbar_extension'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Glute bridge is hip extension
  UPDATE public.exercises SET joint_key = 'hip_ext' WHERE id = 'f35db2b8-f7a6-471a-aa1f-ea6949632c49' AND joint_key = 'lumbar_ext'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_ext' WHERE id = '582d30bf-4049-4d6d-8bd5-11955f9d6c22' AND joint_key = 'lumbar_ext'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_extension' WHERE id = '32016442-5f83-4988-ba00-d36bc24b35b3' AND joint_key = 'lumbar_extension'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_extension' WHERE id = '23869706-44c8-4ad7-a4dd-dad551d81a73' AND joint_key = 'lumbar_extension'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_ext' WHERE id = 'fd20d02b-511b-43f1-b9f8-500821d2f619' AND joint_key = 'hip_flex'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Kneeling hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_ext' WHERE id = '51aec777-c9f4-4b37-aea8-237ab3e294b7' AND joint_key = 'hip_flex'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Quad/rectus roll is hip extension
  UPDATE public.exercises SET joint_key = 'hip_extension' WHERE id = 'bc8d9cd2-e8d3-45d8-aafa-392b5e99f065' AND joint_key = 'hip_flexion'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Kneeling hip flexor stretch is hip extension
  UPDATE public.exercises SET joint_key = 'hip_extension' WHERE id = 'e48ce9a5-1a51-4789-a3fc-e6890c193e7c' AND joint_key = 'hip_flexion'; GET DIAGNOSTICS k = ROW_COUNT; c := c + k; -- Quad/rectus roll is hip extension
  IF c <> 22 THEN RAISE EXCEPTION 'expected 22 re-filed rows, got %', c; END IF;
END $$;
COMMIT;
