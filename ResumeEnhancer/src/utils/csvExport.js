// tiny CSV exporter sir — no dependency, just enough escaping to be safe:
// wrap every field in quotes and double up any quote characters inside it.
const escapeCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
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
