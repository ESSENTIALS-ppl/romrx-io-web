/**
 * One prompt per session (survey card B, Oct 19 2026).
 * Any in-app prompt that interrupts the user (consent banner, terms re-accept screen, survey card) marks
 * itself here when it actually shows. Survey card B never shows in a session where another prompt showed.
 * sessionStorage = this browser tab session only. Storage errors fail closed for the survey (treated as
 * "another prompt showed"), so a blocked storage never stacks prompts.
 */
const KEY = 'romrx.prompt.shown'

export type PromptName = 'consent_banner' | 'terms_reaccept' | 'survey_b'

export function markPromptShown(name: PromptName): void {
  try {
    const cur = sessionStorage.getItem(KEY)
    const list = cur ? cur.split(',') : []
    if (!list.includes(name)) sessionStorage.setItem(KEY, [...list, name].join(','))
  } catch { /* ignore */ }
}

/** True when a prompt other than `self` already showed in this session. */
export function otherPromptShown(self: PromptName): boolean {
  try {
    const cur = sessionStorage.getItem(KEY)
    if (!cur) return false
    return cur.split(',').some(n => n && n !== self)
  } catch {
    return true
  }
}

/**
 * The cookie/ads consent banner is a legal notice that most new visitors see on their first visit, in the
 * same session as their first assessment. Counting it as "another prompt" would block every first-results
 * card, so it only blocks the survey while it is on screen (decision flagged for Grant/Stacy in the PR).
 */
const VISIBLE_KEY = 'romrx.prompt.visible'

export function setPromptVisible(name: PromptName, visible: boolean): void {
  try {
    const cur = (sessionStorage.getItem(VISIBLE_KEY) ?? '').split(',').filter(Boolean)
    const next = visible ? Array.from(new Set([...cur, name])) : cur.filter(n => n !== name)
    sessionStorage.setItem(VISIBLE_KEY, next.join(','))
  } catch { /* ignore */ }
}

export function otherPromptVisible(self: PromptName): boolean {
  try {
    return (sessionStorage.getItem(VISIBLE_KEY) ?? '').split(',').some(n => n && n !== self)
  } catch {
    return true
  }
}
