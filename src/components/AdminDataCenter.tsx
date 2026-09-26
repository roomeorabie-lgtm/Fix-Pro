import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Layers,
  Cpu,
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ImportCategory,
  ImportPreviewItem,
  ImportValidationIssue,
  ImportBatchResult,
  ImportHistoryRecord
} from '../types';
import {
  parseAndValidateImport,
  executeImportBatch,
  seedVerifiedCatalogIntoFirestore,
  getImportHistory
} from '../lib/bulkImportService';

interface AdminDataCenterProps {
  onDataChanged?: () => void;
}

export const AdminDataCenter: React.FC<AdminDataCenterProps> = ({ onDataChanged }) => {
  const [category, setCategory] = useState<ImportCategory>('unified');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [issues, setIssues] = useState<ImportValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<ImportBatchResult | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'history' | 'templates'>('import');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const records = await getImportHistory();
    setImportHistory(records);
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setBatchResult(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      await runValidation(content, category);
    };
    reader.readAsText(file);
  };

  const runValidation = async (content: string, cat: ImportCategory) => {
    if (!content.trim()) return;
    setIsValidating(true);
    try {
      const res = await parseAndValidateImport(content, cat);
      setPreviewItems(res.items);
      setIssues(res.issues);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (previewItems.length === 0) return;
    setIsImporting(true);
    try {
      const result = await executeImportBatch(previewItems, category, 'FixBoard Master');
      setBatchResult(result);
      loadHistory();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Import execution error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  // One-click official verified database import
  const handleSeedOfficialCatalog = async () => {
    const confirm = window.confirm(
      'هل تريد استيراد قاعدة بيانات أجهزة ومخططات الهواتف الذكية الحقيقية الموثوقة (Apple, Samsung, Xiaomi, POCO, Google, Huawei, etc.) إلى Firestore الآن؟'
    );
    if (!confirm) return;

    setIsImporting(true);
    try {
      const result = await seedVerifiedCatalogIntoFirestore();
      setBatchResult(result);
      loadHistory();
      onDataChanged?.();
    } catch (e) {
      console.error('Seeding error:', e);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreview = previewItems.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const validCount = previewItems.filter(p => p.status === 'valid').length;
  const duplicateCount = previewItems.filter(p => p.status === 'duplicate').length;
  const invalidCount = previewItems.filter(p => p.status === 'invalid').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Database className="w-3.5 h-3.5" />
            <span>مركز استيراد وإدارة البيانات الضخمة (FixBoard Data Center)</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100">
            استيراد وتحديث قاعدة بيانات الأجهزة والمخططات دفعة واحدة
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            يدعم النظام استيراد ملفات CSV / JSON كبيرة الحجم مع منع التكرار التلقائي (Deduplication)،
            والتحقق من صحة العلاقات الهندسية (Brand ⬅️ Series ⬅️ Model ⬅️ Board ⬅️ Schematic ⬅️ Components)
            قبل الحفظ الفعلي.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSeedOfficialCatalog}
            disabled={isImporting}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>استيراد الكتالوج الحقيقي المعتمد (18+ ماركة و20+ جهاز)</span>
          </button>
          <span className="text-[10px] text-slate-400 text-center font-mono">
            * بيانات هندسية موثوقة (Board numbers, CPUs, PMICs, Schematics)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'import'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>استيراد ملف جديد (CSV / JSON)</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>سجل الاستيراد والعمليات السابقة ({importHistory.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>نماذج الجداول (Download Templates)</span>
        </button>
      </div>

      {/* TAB 1: IMPORT WORKSPACE */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload Drop Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">حدد نوع البيانات المراد استيرادها:</span>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ImportCategory;
                    setCategory(newCat);
                    if (fileContent) runValidation(fileContent, newCat);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="unified">حزمة شاملة (Devices + Boards + Schematics)</option>
                  <option value="devices">أجهزة فقط (Models & Specs)</option>
                  <option value="boards">لوحات أم فقط (Boards & Revisions)</option>
                  <option value="components">مكونات إلكترونية (Components & Pins)</option>
                  <option value="nets">مسارات وإشارات (Nets & Connections)</option>
                  <option value="testpoints">نقاط فحص (Test Points)</option>
                </select>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/50 hover:bg-slate-950 flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    اضغط لاختيار ملف بيانات CSV أو JSON أو أسقطه هنا
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    يدعم ملفات البيانات الضخمة (حتى آلاف الأسطر) مع الفحص الذاتي للتكرار
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {fileName && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-semibold">{fileName}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {previewItems.length} عنصر مفحوص
                  </span>
                </div>
              )}
            </div>

            {/* Validation & Stats Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تقرير التحقق من البيانات (Pre-import Validation)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  يقوم النظام بالتحقق الصارم من كل عنصر قبل الكتابة في Firestore.
                </p>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 text-xs">
                    <span className="text-slate-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      عناصر صالحة للاستيراد:
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {validCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 text-xs">
                    <span className="text-slate-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      مكررات تم رصدها (تخطي تلقائي):
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {duplicateCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 text-xs">
                    <span className="text-slate-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      أخطاء في الهيكل أو التنسيق:
                    </span>
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {invalidCount}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={validCount === 0 || isImporting}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الكتابة المجمعة في Firestore (Batch Write)...</span>
                  </>
                ) : (
                  <>
                    <span>تنفيذ الاستيراد الآن ({validCount} عنصر صالح)</span>
                    <ArrowRight className="w-4 h-4 -rotate-180" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Result Notification */}
          {batchResult && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100">
                    اكتملت عملية الاستيراد بنجاح!
                  </h4>
                  <p className="text-xs text-slate-400">
                    تمت المعالجة في {new Date(batchResult.timestamp).toLocaleTimeString('ar-EG')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 text-center">
                  <span className="text-xs text-slate-400">تمت إضافتها بنجاح:</span>
                  <div className="text-lg font-mono font-bold text-emerald-400">
                    {batchResult.importedCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 text-center">
                  <span className="text-xs text-slate-400">تم منع تكرارها:</span>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {batchResult.skippedDuplicates}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 text-center">
                  <span className="text-xs text-slate-400">فشل في المعالجة:</span>
                  <div className="text-lg font-mono font-bold text-rose-400">
                    {batchResult.failedCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 text-center">
                  <span className="text-xs text-slate-400">إجمالي الأسطر:</span>
                  <div className="text-lg font-mono font-bold text-slate-200">
                    {batchResult.totalProcessed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table with Filters */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-200">
                  معاينة البيانات قبل الحفظ ({filteredPreview.length} عنصر معروض)
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      filterStatus === 'all'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    الكل ({previewItems.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('valid')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      filterStatus === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    صالح فقط ({validCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('duplicate')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      filterStatus === 'duplicate'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    مكرر ({duplicateCount})
                  </button>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 max-h-96 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3">حالة الفحص</th>
                      <th className="p-3">الشركة</th>
                      <th className="p-3">اسم الموديل</th>
                      <th className="p-3">رقم الموديل</th>
                      <th className="p-3">رقم البوردة (Board)</th>
                      <th className="p-3">المعالج (CPU)</th>
                      <th className="p-3">الـ PMIC</th>
                      <th className="p-3">المخطط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          {item.status === 'valid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              جاهز للإدخال
                            </span>
                          )}
                          {item.status === 'duplicate' && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-help"
                              title={item.validationMessage}
                            >
                              مكرر (تخطي)
                            </span>
                          )}
                          {item.status === 'invalid' && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              title={item.validationMessage}
                            >
                              غير صالح
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-200">{item.brandName}</td>
                        <td className="p-3 font-bold text-slate-100">{item.modelName}</td>
                        <td className="p-3 font-mono text-slate-300">{item.modelNumber || '-'}</td>
                        <td className="p-3 font-mono text-cyan-400">{item.boardNumber || '-'}</td>
                        <td className="p-3 font-mono text-slate-300">{item.cpu || '-'}</td>
                        <td className="p-3 font-mono text-slate-300">{item.pmic || '-'}</td>
                        <td className="p-3">
                          {item.hasSchematic ? (
                            <span className="text-emerald-400 font-mono text-[11px]">مرفق PDF</span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">غير متوفر</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">سجل عمليات الاستيراد السابقة</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع التواريخ وعدد العناصر المستوردة ومن قام بالعملية
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تحديث السجل"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">الملف / الحزمة</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">تم استيرادها</th>
                  <th className="p-3.5">المكررات المتخطاة</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">المشرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {importHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      لا توجد عمليات استيراد مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  importHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-slate-200 font-mono">{rec.filename}</td>
                      <td className="p-3.5 font-mono text-slate-400 uppercase">{rec.category}</td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        +{rec.imported} عنصر
                      </td>
                      <td className="p-3.5 font-mono text-amber-400">{rec.skipped}</td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(rec.importedAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-3.5 text-slate-300">{rec.performedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>نموذج استيراد CSV (CSV Import Template)</span>
            </h3>
            <p className="text-xs text-slate-400">
              يمكنك نسخ هذا التنسيق في Excel أو Google Sheets وحفظه كـ CSV لاستيراد مئات الأجهزة دفعة واحدة:
            </p>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto" dir="ltr">
{`brandName,seriesName,modelName,modelNumber,boardNumber,cpu,pmic,schematicUrl
Apple,iPhone,iPhone 15 Pro,A2848,820-03259,Apple A17 Pro,APL109F,https://...
Samsung,Galaxy S Series,Galaxy S24 Ultra,SM-S928B,SM-S928B_MAIN_REV0.4,SM8650,PM8550,https://...
Xiaomi,Xiaomi Flagship,Xiaomi 13 Ultra,2304FPN6DC,M1_MAIN_BOARD_V2,SM8550,PM8550,https://...`}
            </pre>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>نموذج استيراد JSON (JSON Batch Template)</span>
            </h3>
            <p className="text-xs text-slate-400">
              هيكل البيانات البرمجي المفضل عند تصدير البيانات من قواعد بيانات سابقة:
            </p>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto" dir="ltr">
{`[
  {
    "brandName": "Apple",
    "seriesName": "iPhone",
    "modelName": "iPhone 14 Pro Max",
    "modelNumber": "A2651",
    "boardNumber": "820-02537",
    "cpu": "Apple A16 Bionic",
    "pmic": "APL109A",
    "hasSchematic": true,
    "schematicUrl": "https://.../schematic.pdf"
  }
]`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
