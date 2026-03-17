"use client"

/* =====================================================
   PDF EXPORT — THREE METHODS
   Use whichever works best for your setup

   Method 1: Browser Print   — no package needed
   Method 2: jsPDF           — npm install jspdf html2canvas
   Method 3: API download    — server-side, pixel perfect
===================================================== */

/* =====================================================
   METHOD 1 — BROWSER PRINT (recommended, zero setup)
   Uses window.print() with a print-specific CSS class
   Add class="print-report" to the report container
===================================================== */

export function exportViaBrowserPrint() {
  window.print()
}

/* =====================================================
   METHOD 2 — jsPDF + html2canvas
   npm install jspdf html2canvas
   Captures the DOM as a canvas then converts to PDF
===================================================== */

export async function exportViaJsPDF(
  elementId: string,
  filename: string = "interview-report.pdf"
) {
  const { default: jsPDF }     = await import("jspdf")
  const { default: html2canvas } = await import("html2canvas")

  const element = document.getElementById(elementId)
  if (!element) throw new Error(`Element #${elementId} not found`)

  const canvas = await html2canvas(element, {
    scale:           2,       // 2x for crisp text
    useCORS:         true,
    backgroundColor: "#020617", // match your dark bg
    logging:         false,
  })

  const imgData = canvas.toDataURL("image/png")
  const pdf     = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageW  = pdf.internal.pageSize.getWidth()
  const pageH  = pdf.internal.pageSize.getHeight()
  const imgW   = pageW
  const imgH   = (canvas.height * pageW) / canvas.width

  // If content is taller than one page, split across pages
  let yOffset = 0
  while (yOffset < imgH) {
    if (yOffset > 0) pdf.addPage()
    pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH)
    yOffset += pageH
  }

  pdf.save(filename)
}

/* =====================================================
   METHOD 3 — API DOWNLOAD (server-side via fetch)
   Calls GET /api/interviews/[id]/report/pdf
   Returns a PDF blob for download
===================================================== */

export async function exportViaAPI(
  interviewId: string,
  accessToken:  string,
  filename:    string = "interview-report.pdf"
) {
  const res = await fetch(`/api/interviews/${interviewId}/report/pdf`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || "Failed to generate PDF")
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)

  // Trigger browser download
  const a    = document.createElement("a")
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}