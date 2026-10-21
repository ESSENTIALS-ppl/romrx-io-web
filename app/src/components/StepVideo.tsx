import { useState } from 'react'
import { stepVideo } from '../lib/stepVideo'

/**
 * Demo video for one step. Hidden until the poster loads (so a step with no file shows nothing), and
 * hidden again if the video fails. preload="none": nothing downloads until the user taps play.
 * Frame: full card width, 4:5 (720x900 source).
 */
export function StepVideo({ stepId, title }: { stepId: string; title: string }) {
  const v = stepVideo(stepId)
  const [ok, setOk] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!v || failed) return null
  return (
    <div data-step-video={stepId} className={ok ? 'w-full' : 'hidden'}>
      {!ok && <img src={v.poster} alt="" className="hidden" onLoad={() => setOk(true)} onError={() => setFailed(true)} data-step-video-probe />}
      {ok && (
        <video src={v.src} poster={v.poster} controls playsInline preload="none" aria-label={title}
          onError={() => setFailed(true)} className="w-full aspect-[4/5] rounded-card bg-slate-100 object-cover" />
      )}
    </div>
  )
}
