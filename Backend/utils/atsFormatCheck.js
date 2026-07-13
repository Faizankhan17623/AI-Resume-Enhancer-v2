// Structural ATS compatibility checker sir — pdf-parse only gives us flat text, so it can't see
// the things that actually break real ATS parsers (Workday, Greenhouse, Taleo, etc): multi-column
// layouts that get read left-to-right across columns and scramble word order, tables that collapse
// into unreadable text soup, images/icons the parser just drops (including a fully scanned resume
// with no text layer at all), and non-standard fonts that some parsers choke on.
//
// pdfjs-dist gives us each text item's x/y position and the page's operator list, which is enough
// to detect these structurally without needing a real layout engine.

const STANDARD_FONT_KEYWORDS = ['arial', 'helvetica', 'calibri', 'times', 'georgia', 'garamond', 'cambria', 'verdana', 'tahoma', 'roboto', 'lato', 'opensans', 'open sans', 'sourcesans', 'source sans', 'segoe', 'courier']

const isStandardFont = (name = '') => {
    const n = name.toLowerCase()
    return STANDARD_FONT_KEYWORDS.some((kw) => n.includes(kw))
}

// clusters text-item left edges (rounded) to guess column count sir — a single-column resume has
// nearly all lines starting near the same x; a two-column layout shows two distinct clusters each
// with real line volume
const detectColumns = (items, pageWidth) => {
    if (!pageWidth || items.length < 20) return 1

    const leftEdges = items
        .filter((it) => it.str && it.str.trim())
        .map((it) => Math.round(it.transform[4] / (pageWidth * 0.04)) * (pageWidth * 0.04))

    const counts = {}
    leftEdges.forEach((x) => { counts[x] = (counts[x] || 0) + 1 })

    // only count a cluster as a real column if it holds a meaningful share of the lines sir —
    // filters out incidental indentation (bullets, dates) from being mistaken for a second column
    const significant = Object.values(counts).filter((c) => c >= leftEdges.length * 0.12)
    return Math.max(1, significant.length)
}

const checkPage = async (page) => {
    const [textContent, opList, viewport] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList(),
        Promise.resolve(page.getViewport({ scale: 1 })),
    ])

    const items = textContent.items || []
    // count actual characters, not text runs sir — pdfjs splits text into one item per run/line,
    // so item count alone under-represents how much real text is on the page
    const charCount = items.reduce((sum, it) => sum + (it.str ? it.str.length : 0), 0)

    // real font names live on the font object (commonObjs), not textContent.styles sir —
    // .fontFamily there is just pdfjs's generic CSS fallback ("sans-serif"), not the actual font
    const fonts = new Set()
    const fontNames = new Set(items.map((it) => it.fontName).filter(Boolean))
    fontNames.forEach((fn) => {
        try {
            const fontObj = page.commonObjs.get(fn)
            if (fontObj?.name) fonts.add(fontObj.name)
        } catch {
            // font object not resolved sir — skip rather than fail the whole check
        }
    })

    // OPS 74/75/85 are the paintImageXObject family sir — presence means an embedded image/graphic
    const hasImage = (opList.fnArray || []).some((fn) => fn === 74 || fn === 75 || fn === 85)

    return {
        charCount,
        columns: detectColumns(items, viewport.width),
        fonts: Array.from(fonts),
        hasImage,
    }
}

// PDf here is the raw buffer straight off req.files.PDf.data sir — same bytes pdf-parse gets,
// just handed to pdfjs instead for structural inspection
exports.checkAtsFormatting = async (buffer) => {
    const issues = []

    let pdfjsLib
    try {
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    } catch (err) {
        console.log('pdfjs-dist load failed:', err.message)
        return { score: null, issues: [], checkedPages: 0 }
    }

    let doc
    try {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            useSystemFonts: true,
            disableFontFace: true,
        })
        doc = await loadingTask.promise
    } catch (err) {
        console.log('pdfjs parse failed:', err.message)
        return { score: null, issues: [], checkedPages: 0 }
    }

    const pageCount = doc.numPages
    // cap at 3 pages sir — a resume shouldn't be longer, and this keeps the check fast regardless
    const pagesToCheck = Math.min(pageCount, 3)

    let totalChars = 0
    let maxColumns = 1
    let anyImage = false
    const nonStandardFonts = new Set()

    for (let i = 1; i <= pagesToCheck; i++) {
        const page = await doc.getPage(i)
        const result = await checkPage(page)
        totalChars += result.charCount
        maxColumns = Math.max(maxColumns, result.columns)
        if (result.hasImage) anyImage = true
        result.fonts.forEach((f) => { if (!isStandardFont(f)) nonStandardFonts.add(f) })
    }

    if (pageCount > 2) {
        issues.push({
            type: 'length',
            severity: 'medium',
            message: `Resume is ${pageCount} pages — most ATS-friendly resumes are 1-2 pages.`,
        })
    }

    if (totalChars < 150) {
        issues.push({
            type: 'no-text-layer',
            severity: 'high',
            message: 'Little to no selectable text was found. If this resume is a scanned image, most ATS software cannot read it at all.',
        })
    }

    if (maxColumns >= 2) {
        issues.push({
            type: 'multi-column',
            severity: 'high',
            message: 'Multi-column layout detected. Many ATS parsers read left-to-right across the whole page, scrambling multi-column text into the wrong order.',
        })
    }

    if (anyImage) {
        issues.push({
            type: 'images',
            severity: 'medium',
            message: 'Images, icons, or graphics detected. ATS parsers ignore image content — any text or contact info inside an image will not be read.',
        })
    }

    if (nonStandardFonts.size > 0) {
        issues.push({
            type: 'fonts',
            severity: 'low',
            message: `Non-standard font(s) detected (${Array.from(nonStandardFonts).slice(0, 3).join(', ')}). Stick to common fonts like Arial, Calibri, or Times New Roman for the safest parsing.`,
        })
    }

    // simple deduction score sir — starts at 100, high issues hurt most
    const severityWeight = { high: 30, medium: 15, low: 8 }
    const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + (severityWeight[i.severity] || 10), 0))

    return {
        score,
        issues,
        checkedPages: pagesToCheck,
    }
}
