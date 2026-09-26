import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Cpu,
  Smartphone,
  Layers,
  Activity,
  X,
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { performGlobalSearch, GlobalSearchResult } from '../lib/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: GlobalSearchResult) => void;
}

export const GlobalSearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await performGlobalSearch(searchTerm);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  if (!isOpen) return null;

  const renderIcon = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'device':
        return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'board':
        return <Layers className="w-5 h-5 text-cyan-400" />;
      case 'component':
        return <Cpu className="w-5 h-5 text-amber-400" />;
      case 'net':
        return <Activity className="w-5 h-5 text-rose-400" />;
      default:
        return <Search className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-800 p-4 flex items-center gap-3 bg-slate-900/90">
          <Search className="w-6 h-6 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الموديل (iPhone 14 Pro), رقم البوردة, المكون (U1001), أو المسار (PP_VDD_MAIN)..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-base md:text-lg focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition"
          >
            ESC
          </button>
        </div>

        {/* Results / Empty state */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>جاري البحث في قاعدة بيانات FixBoard...</span>
            </div>
          )}

          {!isLoading && searchTerm.length >= 2 && results.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-base font-medium">لم يتم العثور على نتائج مطابقة لـ "{searchTerm}"</p>
              <p className="text-xs text-slate-400 mt-1">
                تأكد من كتابة اسم الجهاز، المعالج، رقم البوردة أو رمز القطعة بشكل صحيح.
              </p>
            </div>
          )}

          {!isLoading && !searchTerm && (
            <div className="p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                اقتراحات بحث سريعة
              </div>
              <div className="flex flex-wrap gap-2">
                {['iPhone 13', 'iPhone 15 Pro Max', 'Galaxy S24 Ultra', 'U5001', 'U1001', 'PP_VDD_MAIN', 'VCC_MAIN', 'PM8550'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchTerm(tag)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-300 border border-slate-700/50 transition"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((res) => (
            <div
              key={`${res.type}-${res.id}`}
              onClick={() => {
                onSelectResult(res);
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-105 transition">
                  {renderIcon(res.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 group-hover:text-emerald-400 transition">
                      {res.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                      {res.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{res.subtitle}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition -rotate-180" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
