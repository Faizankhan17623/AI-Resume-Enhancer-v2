// hand-written .ics (iCalendar) file generator sir — deliberately not a library. The format is
// a plain, well-specified text format (RFC 5545) and this app only ever needs the single-event
// case, so pulling in a whole calendar-generation package for ~30 lines of string building would
// be the wrong tradeoff, same "small focused util over a dependency" call as
// utils/deviceFingerprint.js made for User-Agent parsing.

const crypto = require('crypto')

// RFC 5545 wants UTC timestamps in this exact compact form sir: YYYYMMDDTHHMMSSZ
const toIcsDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

// .ics lines must be CRLF-terminated and folded at 75 octets sir — folding is skipped here since
// every field this app puts in one (a job title, a company name, a meeting link) realistically
// never approaches that length; adding fold logic for a case that can't occur would just be
// unexercised code
const escapeIcsText = (text = '') =>
    String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/**
 * Builds a single-event .ics file sir — used for the interview-confirmed email
 * (see Templates/InterviewConfirmed.js), attached so both the candidate and the recruiter can
 * drop it straight into whatever calendar app they already use, no Google/Outlook API needed.
 *
 * @param {object} event
 * @param {string} event.title
 * @param {string} [event.description]
 * @param {string} [event.location]   e.g. the meeting link
 * @param {Date} event.start
 * @param {Date} event.end
 * @param {string} event.organizerEmail
 * @param {string} event.attendeeEmail
 * @returns {string} the full .ics file content
 */
const buildInterviewIcs = ({ title, description, location, start, end, organizerEmail, attendeeEmail }) => {
    const uid = `${crypto.randomBytes(16).toString('hex')}@resumify`
    const now = toIcsDate(new Date())

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Resumify//Interview Scheduling//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escapeIcsText(title)}`,
    ]

    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
    if (organizerEmail) lines.push(`ORGANIZER:mailto:${organizerEmail}`)
    if (attendeeEmail) lines.push(`ATTENDEE:mailto:${attendeeEmail}`)

    lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR')

    return lines.join('\r\n')
}

module.exports = { buildInterviewIcs }
