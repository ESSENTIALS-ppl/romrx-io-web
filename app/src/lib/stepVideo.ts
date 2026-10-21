/**
 * Per-step demo video slots (Oct 21 2026, plan: proof video-20261021/video-plan.md). Files are static at the
 * site root (Netlify publish = "."): /videos/<step_id>.mp4 and /videos/<step_id>.jpg (poster). Frame 4:5,
 * 720x900. A slot shows only once its poster loads; a missing poster or a video error hides it.
 */
export const VIDEO_STEP_IDS = ['hip_er', 'hip_ir', 'shoulder_er', 'shoulder_flex', 'cervical_lat', 'cervical_flex_ext', 'hip_flex', 'hip_abd', 'ankle_df'] as const
export type VideoStepId = typeof VIDEO_STEP_IDS[number]
export const VIDEO_BASE = '/videos'

export function stepVideo(stepId: string): { src: string; poster: string } | null {
  if (!(VIDEO_STEP_IDS as readonly string[]).includes(stepId)) return null
  return { src: `${VIDEO_BASE}/${stepId}.mp4`, poster: `${VIDEO_BASE}/${stepId}.jpg` }
}
