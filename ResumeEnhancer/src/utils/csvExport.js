// tiny CSV exporter sir — no dependency, just enough escaping to be safe:
// wrap every field in quotes, double up any quote characters inside it, AND (per 2026-11-16
// audit) neutralize CSV/formula injection — a cell starting with =, +, -, or @ executes as a
// formula the instant an admin opens the exported file in Excel/Sheets/LibreOffice. User-controlled
// fields (firstName/lastName/email in Users.jsx's export) have no server-side character
// restriction, so a signup name like `=HYPERLINK(...)` would otherwise run live in an admin's
// spreadsheet. A leading apostrophe is the standard OWASP mitigation — every affected app forces
// the cell to render as literal text instead of evaluating it.
const escapeCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value)
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str
  return `"${safe.replace(/"/g, '""')}"`
}

// rows: array of plain objects. columns: [{ key, label }] controls order + header text.
export const downloadCsv = (filename, rows, columns) => {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(',')).join('\n')
  const csv = `${header}\n${body}`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
