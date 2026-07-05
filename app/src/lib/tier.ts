// Score-tier system shared across HQ, BJJ, BB. See v3.2 + v4 spec.
// PRS = 0..100. Five tiers.

export type Tier = 'ELITE' | 'STRONG' | 'DEVELOPING' | 'RESTRICTED' | 'AT_RISK'

export function scoreToTier(score: number): Tier {
  if (score >= 85) return 'ELITE'
  if (score >= 70) return 'STRONG'
  if (score >= 55) return 'DEVELOPING'
  if (score >= 40) return 'RESTRICTED'
  return 'AT_RISK'
}

export function tierColor(tier: Tier) {
  switch (tier) {
    case 'ELITE':      return 'text-tier-elite'
    case 'STRONG':     return 'text-tier-strong'
    case 'DEVELOPING': return 'text-tier-developing'
    case 'RESTRICTED': return 'text-tier-restricted'
    case 'AT_RISK':    return 'text-tier-risk'
  }
}

export function tierBg(tier: Tier) {
  switch (tier) {
    case 'ELITE':      return 'bg-tier-elite/10'
    case 'STRONG':     return 'bg-tier-strong/10'
    case 'DEVELOPING': return 'bg-tier-developing/10'
    case 'RESTRICTED': return 'bg-tier-restricted/10'
    case 'AT_RISK':    return 'bg-tier-risk/10'
  }
}

export function tierLabel(tier: Tier): string {
  return tier === 'AT_RISK' ? 'AT RISK' : tier
}

export function tierIntro(tier: Tier): string {
  switch (tier) {
    case 'ELITE':
      return 'Exceptional. Your ROM profile is in elite range. Continue to your individualized dashboard to protect what you have and stay ahead of asymmetries before they become injuries.'
    case 'STRONG':
      return 'Strong foundation. Your mobility is in a healthy range with a few gaps to address. Continue to your dashboard for your individualized plan to lock in progress.'
    case 'DEVELOPING':
      return 'Caution: your ROM has limitations that are affecting your movement readiness. Continue to the dashboard for your individualized plan and start making progress today.'
    case 'RESTRICTED':
      return 'Significant restrictions detected. Prioritize your protocol. Continue to the dashboard to get your targeted plan built around your top-3 priority joints.'
    case 'AT_RISK':
      return 'Urgent: your assessment flagged multiple AT RISK joints. Continue to the dashboard to begin your targeted, individualized plan and start reversing this today.'
  }
}
