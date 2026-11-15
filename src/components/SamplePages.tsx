import { useEffect, useRef } from 'react';
import bns from '../assets/sample-bns.webp';
import bnss from '../assets/sample-bnss.webp';
import bsa from '../assets/sample-bsa.webp';

const pages = [
  { src: bns, alt: 'Watermarked sample page mapping IPC 302 to BNS 103' },
  { src: bnss, alt: 'Watermarked sample page mapping CrPC 438 to BNSS 482' },
  { src: bsa, alt: 'Watermarked sample page mapping IEA 65B to BSA 63' },
];

export function SamplePreview({ index, onOpen, onClose }: { index: number | null; onOpen: (index: number) => void; onClose: () => void }) {
  const images = useRef<Array<HTMLImageElement | null>>([]);
  const homes = useRef<Array<HTMLDivElement | null>>([]);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = index == null ? null : images.current[index];
    if (node && stage.current) {
      stage.current.appendChild(node);
      return;
    }
    images.current.forEach((image, position) => {
      const home = homes.current[position];
      if (image && home && image.parentElement !== home) home.appendChild(image);
    });
  }, [index]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {pages.map((page, position) => (
          <button type="button" key={page.src} onClick={() => onOpen(position)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left">
            <div ref={(element) => { homes.current[position] = element; }} className="aspect-[4/5]">
              <img
                ref={(element) => { images.current[position] = element; }}
                src={page.src}
                alt={page.alt}
                width={800}
                height={1040}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="block px-2 py-2 text-xs font-medium">Preview page {position + 1}</span>
          </button>
        ))}
      </div>
      {index == null ? null : (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Sample page preview">
          <div className="w-full max-w-md rounded-3xl bg-paper p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Watermarked sample</p>
              <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm">Close</button>
            </div>
            <div ref={stage} className="min-h-48" />
            <p className="mt-3 text-xs text-slate-600">This is a preview, not the paid bundle. The full files open in Campus after a verified payment.</p>
          </div>
        </div>
      )}
    </>
  );
}
