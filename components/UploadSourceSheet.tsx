"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { AvocadoMark } from "@/lib/avocadoMark";
import { SITE_NAME } from "@/lib/siteConfig";
import type { Translation } from "@/lib/i18n";
import { hapticTap } from "@/lib/nativeApp";

/**
 * Replaces the raw <input type="file"> tap target, which on iOS pops the
 * system's plain "Photo Library / Take Photo or Video / Choose File" list —
 * unstyleable OS chrome. This shows our own sheet first (matching
 * SignInSheet's look), then routes to a *single-purpose* hidden input per
 * option so each one jumps straight to its native picker instead of iOS's
 * mixed chooser: an accept list spanning images+video+PDF is what triggers
 * that 3-way prompt in the first place, so each button here narrows accept
 * to just its own source's types.
 */
export function UploadSourceSheet({
  open,
  onClose,
  onFile,
  photoAccept,
  fileAccept,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File | null) => void;
  /** Accept list for Photo Library / Camera — images & video only, no PDF. */
  photoAccept: string;
  /** Accept list for Choose File — kept separate from photoAccept so PDFs
   *  don't leak into the photo/camera inputs and re-trigger the OS chooser. */
  fileAccept: string;
  t: Translation;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function pick(input: HTMLInputElement | null) {
    hapticTap();
    input?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null);
    e.target.value = "";
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="flex w-full flex-col gap-6 rounded-t-3xl bg-[#FAFAF7] dark:bg-stone-800 p-8 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:w-full sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F3C5] to-[#C4E484] shadow-[0_4px_12px_rgba(120,160,60,0.25)] dark:from-stone-700 dark:to-stone-700 dark:shadow-none">
              <AvocadoMark size={26} />
            </span>
            <span className="font-display font-bold text-2xl text-[#232920] dark:text-stone-50">{SITE_NAME}</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.uploadSourceClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[#EDF1E4] hover:text-[#232920] dark:hover:bg-stone-700 dark:hover:text-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <SourceButton icon={<LibraryIcon />} label={t.uploadSourceLibrary} onClick={() => pick(libraryRef.current)} />
          <SourceButton icon={<CameraIcon />} label={t.uploadSourceCamera} onClick={() => pick(cameraRef.current)} />
          <SourceButton icon={<FolderIcon />} label={t.uploadSourceFiles} onClick={() => pick(filesRef.current)} />
        </div>

        <input ref={libraryRef} type="file" accept={photoAccept} className="hidden" onChange={handleChange} />
        <input
          ref={cameraRef}
          type="file"
          accept={photoAccept}
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
        <input ref={filesRef} type="file" accept={fileAccept} className="hidden" onChange={handleChange} />
      </div>
    </div>,
    document.body,
  );
}

function SourceButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-full border border-[#E2E6D9] bg-white px-5 py-3 text-sm font-medium text-[#30362B] transition-colors hover:border-[#C0DC8C] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-500"
    >
      <span className="flex h-5 w-5 items-center justify-center text-[#4D7C0F] dark:text-stone-400">{icon}</span>
      {label}
    </button>
  );
}

function LibraryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="9" r="1.75" />
      <path d="m3 16 5-5 4.5 4.5L17 11l4 4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l1.8 2H18.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z" />
    </svg>
  );
}
