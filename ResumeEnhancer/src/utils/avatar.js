// shared initial-avatar logic sir — single source of truth so every avatar in the app (home
// header, dashboard header, anywhere else) looks the same: one initial, colored deterministically
// by the user's name so the same person always lands on the same color everywhere.
export const AVATAR_COLORS = ['#F4511E', '#1E88E5', '#43A047', '#8E24AA', '#00897B', '#FB8C00', '#3949AB', '#D81B60']

export const getInitial = (user) => {
  const source = user?.firstName || user?.email || ''
  return source.trim().charAt(0).toUpperCase() || '?'
}

export const getAvatarColor = (user) => {
  const source = (user?.firstName || '') + (user?.lastName || '') || user?.email || ''
  let hash = 0
  for (let i = 0; i < source.length; i++) hash = source.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
