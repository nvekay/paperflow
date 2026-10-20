/** The original document: photos as images, PDFs in the browser's own viewer */
export function DocumentPreview({ src, mimeType, title }: { src: string; mimeType: string; title: string }) {
  if (mimeType.startsWith('image/')) {
    // A plain img: these are private per-document files, next/image would add nothing
    return <img src={src} alt={title} className="w-full rounded-lg border border-ink-200 bg-ink-50" />;
  }
  // Page fitted to the width, without the viewer's thumbnail pane (honoured by Chrome and Firefox)
  return (
    <object
      data={`${src}#navpanes=0&view=FitH`}
      type="application/pdf"
      className="h-[78vh] w-full rounded-lg border border-ink-200 bg-ink-50"
    >
      <a href={src} className="block p-6 text-sm text-accent underline">
        Open the PDF
      </a>
    </object>
  );
}
