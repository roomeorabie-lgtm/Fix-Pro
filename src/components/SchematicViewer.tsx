import React, { useState } from 'react';
import {
  FileText,
  Download,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertCircle
} from 'lucide-react';
import { SchematicDocument } from '../types';

interface SchematicViewerProps {
  schematic: SchematicDocument | null;
  onClose?: () => void;
}

export const SchematicViewer: React.FC<SchematicViewerProps> = ({ schematic, onClose }) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  if (!schematic) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-semibold text-slate-200">المخطط غير متوفر حالياً</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          لم يتم رفع ملف Schematic رسمي لهذه اللوحة بعد. يستطيع المسؤول (Admin) إضافته لاحقاً.
        </p>
      </div>
    );
  }

  const isPdf = schematic.fileUrl.toLowerCase().endsWith('.pdf') || schematic.fileName.toLowerCase().endsWith('.pdf');

  return (
    <div
      className={`bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[750px] w-full'
      }`}
    >
      {/* Schematic Viewer Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {schematic.title}
              {schematic.totalPages && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {schematic.totalPages} صفحة
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 font-mono">{schematic.fileName}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Zoom controls (if supported or iframe scale) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoom((z) => Math.min(z + 15, 200))}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(z - 15, 60))}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Download if allowed */}
          {schematic.canDownload && (
            <a
              href={schematic.fileUrl}
              download={schematic.fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل</span>
            </a>
          )}

          {/* Open in new tab */}
          <a
            href={schematic.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
            title="فتح في نافذة جديدة"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/30 transition mr-2"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

        {/* PDF / Document Embed Container */}
      <div className="flex-1 w-full h-full bg-slate-900 relative overflow-hidden flex flex-col">
        {schematic.fileUrl ? (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={`${schematic.fileUrl}#zoom=${zoom}&toolbar=1&navpanes=1`}
              title={schematic.title}
              className="w-full flex-1 border-0 bg-slate-950"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
            <p className="font-semibold text-slate-200">الرابط المباشر للمخطط غير مكتمل</p>
            <p className="text-xs text-slate-400 mt-1">
              تأكد من إرفاق رابط PDF سليم عبر لوحة تحكم الإدارة.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
