"use client";

import { useState } from "react";

export function ChartViewerButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        View Chart
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0F2040] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-medium text-white">Medical Chart</h3>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={url}
              title="Medical Chart"
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
