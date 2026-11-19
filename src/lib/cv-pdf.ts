/**
 * Turns the rendered CV sheet into a real PDF file, in the browser.
 *
 * The sheet is drawn to a canvas and cut into A4 pages. A cut is moved up to
 * the nearest blank band, so a line of text is never sliced in half between
 * two pages. The file holds the picture of the CV; the searchable text goes
 * to the pool separately, from the form data.
 */

const A4_RATIO = 297 / 210;
/** How far above the page edge a blank band is looked for, as a share of a page. */
const SEARCH_SHARE = 0.1;

/** The lowest row at or above `from` that sits inside blank space, or `from`. */
function safeCut(ctx: CanvasRenderingContext2D, width: number, from: number, pageHeight: number) {
  const span = Math.floor(pageHeight * SEARCH_SHARE);
  const top = Math.max(0, from - span);
  const rows = ctx.getImageData(0, top, width, from - top + 1);
  const px = new Uint32Array(rows.data.buffer);
  const same = (a: number, b: number) => {
    for (let x = 0; x < width; x++) if (px[a * width + x] !== px[b * width + x]) return false;
    return true;
  };
  const last = from - top;
  for (let r = last - 1; r >= 2; r--) {
    if (same(r, r - 1) && same(r, r + 1) && same(r, r - 2)) return top + r;
  }
  return from;
}

export async function renderCvPdf(node: HTMLElement): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const source = await toCanvas(node, { pixelRatio: 2, backgroundColor: "#ffffff" });
  const width = source.width;
  const pageHeight = Math.round(width * A4_RATIO);
  const ctx = source.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const page = document.createElement("canvas");
  page.width = width;
  page.height = pageHeight;
  const pageCtx = page.getContext("2d");
  if (!pageCtx) throw new Error("canvas unavailable");

  let start = 0;
  let first = true;
  while (start < source.height - 1) {
    const limit = start + pageHeight;
    const end = limit >= source.height ? source.height : safeCut(ctx, width, limit, pageHeight);
    const slice = Math.max(1, end - start);

    pageCtx.fillStyle = "#ffffff";
    pageCtx.fillRect(0, 0, width, pageHeight);
    pageCtx.drawImage(source, 0, start, width, slice, 0, 0, width, slice);

    if (!first) pdf.addPage();
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    first = false;
    start = end;
  }
  return pdf.output("blob");
}
