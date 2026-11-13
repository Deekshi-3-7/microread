/**
 * Gating and copy for the friend-profile completion celebration.
 *
 * The celebration fires when a member opens another member's detailed profile
 * (FriendDetail) and that friend has completed at least one book. It is gated
 * per friend, per browser session, so:
 *   - refreshing or re-rendering the same profile does NOT replay it,
 *   - navigating back to a profile already seen this visit does NOT replay it,
 *   - opening a different friend's profile DOES celebrate that friend.
 *
 * sessionStorage is used so each new visit (new tab/session) can celebrate
 * again. All access is wrapped in try/catch so blocked storage degrades
 * gracefully (the celebration simply shows, rather than crashing).
 */

const PROFILE_CELEBRATED_KEY =
  'microread-profile-celebrated'

function readCelebratedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(
      PROFILE_CELEBRATED_KEY
    )

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** True if this friend's profile hasn't been celebrated yet this session. */
export function profileCelebrationIsNew(
  memberId: string
): boolean {
  return !readCelebratedIds().includes(memberId)
}

/** Remember that this friend's profile was celebrated this session. */
export function markProfileCelebrated(
  memberId: string
): void {
  try {
    const ids = readCelebratedIds()

    if (!ids.includes(memberId)) {
      ids.push(memberId)
      sessionStorage.setItem(
        PROFILE_CELEBRATED_KEY,
        JSON.stringify(ids)
      )
    }
  } catch {
    // Storage unavailable — skip silently.
  }
}

// Shown when you open your OWN profile — addressed to you.
export const SELF_QUOTES = [
  'Every page brought you closer. Keep going! 🌱',
  'Small pages, daily steps — and look how they added up. 🌱',
  'One more milestone in your reading journey! 🌱',
]

// Shown when you open a FRIEND's profile — celebrating them, not you.
export const FRIEND_QUOTES = [
  'Their progress inspires the whole circle. 🌱',
  'Every page brought them closer — worth celebrating! 🌱',
  'Another milestone in a friend’s reading journey. 🌱',
]

/** Pick a quote at random (keeps the celebration from feeling canned). */
export function pickMessage(
  messages: string[]
): string {
  if (messages.length === 0) {
    return ''
  }

  return messages[
    Math.floor(
      Math.random() * messages.length
    )
  ]
}

/** Format a 'YYYY-MM-DD' completion date for display, safely. */
export function formatCompletionDate(
  dateKey: string | null | undefined
): string {
  if (!dateKey) {
    return ''
  }

  const date = new Date(`${dateKey}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
