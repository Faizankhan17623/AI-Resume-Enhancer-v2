// IST has a fixed +5:30 offset from UTC, no DST — so plain minute math is correct
// and we don't need a timezone library for just this one zone sir.
const IST_OFFSET_MINUTES = 5 * 60 + 30

// hour12 is 1-12, minute is 0-59, meridiem is 'AM'|'PM'. dateStr is 'YYYY-MM-DD'.
// Builds the wall-clock IST moment, then shifts it back to the true UTC instant.
export const istPartsToUtcDate = (dateStr, hour12, minute, meridiem) => {
  if (!dateStr || !hour12 || minute === undefined || minute === null || !meridiem) return null

  let hour24 = hour12 % 12
  if (meridiem === 'PM') hour24 += 12

  const hh = String(hour24).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')

  // treat the picked wall-clock time as if it were UTC, then subtract the IST offset
  // to get the real UTC instant it represents sir
  const asIfUtc = new Date(`${dateStr}T${hh}:${mm}:00Z`)
  if (Number.isNaN(asIfUtc.getTime())) return null

  return new Date(asIfUtc.getTime() - IST_OFFSET_MINUTES * 60 * 1000)
}

// Inverse: given a UTC Date (or ISO string), return IST wall-clock parts for display.
export const utcDateToIstParts = (utcDate) => {
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate)
  if (Number.isNaN(d.getTime())) return null

  const shifted = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000)
  const hour24 = shifted.getUTCHours()
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour12,
    minute: shifted.getUTCMinutes(),
    meridiem,
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// e.g. "25 Jul 2026, 02:30 PM IST"
export const utcDateToIstDisplay = (utcDate) => {
  if (!utcDate) return ''
  const parts = utcDateToIstParts(utcDate)
  if (!parts) return ''
  const mm = String(parts.minute).padStart(2, '0')
  const hh = String(parts.hour12).padStart(2, '0')
  return `${parts.day} ${MONTH_NAMES[parts.month]} ${parts.year}, ${hh}:${mm} ${parts.meridiem} IST`
}

// builds the richer "feature disabled" toast message from a 503 response body sir —
// shared by Review/CoverLetter/JobSearch operations so the copy stays consistent
export const featureDisabledMessage = (data, fallback) => {
  let msg = data?.message || fallback || 'This feature is temporarily disabled'
  if (data?.note) msg += `: ${data.note}`
  if (data?.disabledUntil) msg += `. Back around ${utcDateToIstDisplay(data.disabledUntil)}.`
  return msg
}

// 'YYYY-MM-DD' for the given day offset from now, in IST calendar terms.
export const istDateStrFromNow = (dayOffset = 0) => {
  const nowIst = new Date(Date.now() + IST_OFFSET_MINUTES * 60 * 1000)
  nowIst.setUTCDate(nowIst.getUTCDate() + dayOffset)
  const y = nowIst.getUTCFullYear()
  const m = String(nowIst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(nowIst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
