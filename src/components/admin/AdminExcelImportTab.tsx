import React, { useState, useRef } from 'react';
import { Station } from '../../types/station';
import {
  ExtractedCenter,
  CenterCategory,
  parseExcelSheet,
  parsePdfOrTextContent,
  applyImportedCentersToStations,
  generateSampleExcelTemplate,
} from '../../utils/excelParser';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2,
  MapPin,
  Flame,
  Droplets,
  ShieldCheck,
  Search,
  Check,
  RefreshCw,
  Building,
  GitMerge,
  FileText,
  Save,
  HelpCircle,
} from 'lucide-react';

interface AdminExcelImportTabProps {
  stations: Station[];
  importStations: (stations: Station[], mode: 'append' | 'replace') => void;
  saveAllDataNow: () => boolean;
  showToast: (msg: string) => void;
}

export const AdminExcelImportTab: React.FC<AdminExcelImportTabProps> = ({
  stations,
  importStations,
  saveAllDataNow,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // حالة نوع النشاط المستهدف
  const [selectedCategory, setSelectedCategory] = useState<CenterCategory>('auto');

  // خيار التسجيل العام الافتراضي
  const [globalActionType, setGlobalActionType] = useState<'standalone' | 'merge'>('standalone');

  // المراكز المستخرجة
  const [extractedCenters, setExtractedCenters] = useState<ExtractedCenter[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    newCount?: number;
    mergedCount?: number;
  } | null>(null);

  // البحث والتصفية في جدول المعاينة
  const [previewSearch, setPreviewSearch] = useState('');

  // صندوق لصق النصوص والـ PDF يدوياً
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // معالجة رفع الملف (إكسيل أو PDF)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);

    try {
      const fileName = file.name.toLowerCase();
      let centers: ExtractedCenter[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const buffer = await file.arrayBuffer();
        centers = parseExcelSheet(buffer, selectedCategory, stations);
      } else if (fileName.endsWith('.pdf') || fileName.endsWith('.txt')) {
        const text = await file.text();
        centers = parsePdfOrTextContent(text, selectedCategory, stations);
      } else {
        // محاولة القراءة كإكسيل
        const buffer = await file.arrayBuffer();
        centers = parseExcelSheet(buffer, selectedCategory, stations);
      }

      // تطبيق خيار التسجيل العام الافتراضي
      const updated: ExtractedCenter[] = centers.map((c) => ({
        ...c,
        actionType: (globalActionType === 'merge' && c.matchedStationId ? 'merge' : 'standalone') as 'standalone' | 'merge',
      }));

      setExtractedCenters(updated);

      if (updated.length > 0) {
        showToast(`تم استخراج والوصول لمواقع ${updated.length} مركز بنجاح! راجع الجدول أدناه واضغط تثبيت.`);
      } else {
        showToast('لم يتم العثور على صفوف بيانات صالحة في الملف، تأكد من وجود أعمدة (الاسم، العنوان).');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء قراءة الملف، يمكنك استخدام خيار لصق النصوص والبيانات كبديل.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // معالجة النصوص المنسوخة
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    try {
      const centers = parsePdfOrTextContent(pastedText, selectedCategory, stations);
      const updated: ExtractedCenter[] = centers.map((c) => ({
        ...c,
        actionType: (globalActionType === 'merge' && c.matchedStationId ? 'merge' : 'standalone') as 'standalone' | 'merge',
      }));
      setExtractedCenters(updated);
      showToast(`تم استخراج ${updated.length} مركز من النص المنسوخ.`);
    } catch (err) {
      showToast('تعذر معالجة النص، تأكد من تنسيق الأسطر.');
    } finally {
      setIsProcessing(false);
    }
  };

  // تبديل خيار التسجيل العام لكافة الصفوف المستخرجة
  const handleGlobalActionChange = (action: 'standalone' | 'merge') => {
    setGlobalActionType(action);
    setExtractedCenters((prev) =>
      prev.map((c) => ({
        ...c,
        actionType: action === 'merge' && c.matchedStationId ? 'merge' : 'standalone',
      }))
    );
  };

  // تبديل خيار التسجيل لصف فردي
  const handleToggleRowAction = (centerId: string) => {
    setExtractedCenters((prev) =>
      prev.map((c) => {
        if (c.id === centerId) {
          const nextAction = c.actionType === 'standalone' ? 'merge' : 'standalone';
          return { ...c, actionType: nextAction };
        }
        return c;
      })
    );
  };

  // تغيير المحطة المدمج معها لصف فردي
  const handleSelectMatchedStation = (centerId: string, stationId: string) => {
    const target = stations.find((s) => s.id === stationId);
    setExtractedCenters((prev) =>
      prev.map((c) => {
        if (c.id === centerId) {
          return {
            ...c,
            actionType: 'merge',
            matchedStationId: stationId,
            matchedStationName: target ? target.name : undefined,
          };
        }
        return c;
      })
    );
  };

  // حذف صف فردي من المعاينة
  const handleDeleteRow = (centerId: string) => {
    setExtractedCenters((prev) => prev.filter((c) => c.id !== centerId));
  };

  // تنفيذ التثبيت والحفظ النهائي في المنظومة
  const handleCommitCenters = () => {
    if (extractedCenters.length === 0) return;

    const result = applyImportedCentersToStations(stations, extractedCenters);
    importStations(result.updatedStations, 'replace');
    saveAllDataNow();

    setImportStatus({
      success: true,
      message: `تم تثبيت وحفظ ${extractedCenters.length} مركز بنجاح في المنظومة!`,
      newCount: result.newCount,
      mergedCount: result.mergedCount,
    });

    showToast(`تم تسجيل ${result.newCount} مركز منفصل جديد، ودمج ${result.mergedCount} مركز ضمن المحطات القائمة!`);
    setExtractedCenters([]);
  };

  // تصفية المعاينة
  const filteredPreview = extractedCenters.filter((c) => {
    if (!previewSearch) return true;
    const q = previewSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.governorate.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-right" dir="rtl">
      {/* الترويسة والتعريف */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-md border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black tracking-tight">
              استيراد مراكز التحويل والزيوت والفحص (Excel / PDF)
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            ارفع شيت إكسيل أو ملف PDF يحتوي على أسماء وعناوين المراكز؛ يتم التعرف على المواقع الجغرافية تلقائياً وتسجيل كل مركز إما <strong>ضمن نطاق محطة قائمة</strong> أو <strong>كمركز منفصل تماماً</strong>.
          </p>
        </div>

        <button
          onClick={generateSampleExcelTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow shrink-0"
          title="تحميل شيت إكسيل يحتوي على أمثلة للأعمدة والبيانات"
        >
          <Download className="w-4 h-4" />
          <span>تحميل نموذج إكسيل جاهز</span>
        </button>
      </div>

      {/* 1. اختيار نوع النشاط وخيار التسجيل الافتراضي */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* نوع النشاط في الملف */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-white block">
            1. نوع النشاط المستهدف من الملف:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CenterCategory)}
            className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 font-bold focus:outline-none"
          >
            <option value="auto">⚡ تحديد ذكي تلقائي من نصوص الشيت</option>
            <option value="conversionMaintenance">🔧 مراكز تحويل وصيانة السيارات</option>
            <option value="bpOilCenter">💧 مراكز زيوت BP كاسترول</option>
            <option value="cylinderTesting">🛡️ مراكز فحص واختبار الأسطوانات</option>
          </select>
          <span className="text-[10px] text-slate-400 block">
            يمكنك تركها على التحديد التلقائي ليتعرف النظام على النشاط من الكلمات
          </span>
        </div>

        {/* خيار التسجيل العام الافتراضي */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-white block">
            2. طريقة التسجيل الافتراضية:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleGlobalActionChange('standalone')}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold border transition ${
                globalActionType === 'standalone'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>كمركز منفصل تماماً</span>
            </button>

            <button
              onClick={() => handleGlobalActionChange('merge')}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold border transition ${
                globalActionType === 'merge'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>دمج ضمن محطة قائمة</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block">
            يمكنك تخصيص كل صف بمفرده لاحقاً من جدول المعاينة قبل الحفظ
          </span>
        </div>
      </div>

      {/* 2. منطقة رفع الملف (Drag & Drop) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-emerald-500/40 dark:border-emerald-600/30 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <FileSpreadsheet className="w-7 h-7" />
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            اختر ملف إكسيل (.xlsx, .xls, .csv) أو ملف PDF (.pdf)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            يقبل جداول الإكسيل الرسمية، كشوف المحطات، أو كشوف مراكز الغاز المطبوعة بصيغة PDF
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-md">
            <Upload className="w-4 h-4" />
            <span>اختر الملف من جهازك</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowPasteBox(!showPasteBox)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <FileText className="w-4 h-4" />
            <span>{showPasteBox ? 'إخفاء صندوق اللصق' : 'أو لصق النصوص مباشرة'}</span>
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-bold pt-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>جارِ قراءة البيانات واستخراج الإحداثيات الجغرافية لمصر...</span>
          </div>
        )}
      </div>

      {/* صندوق لصق النصوص والـ PDF يدوياً */}
      {showPasteBox && (
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="text-xs font-bold text-slate-800 dark:text-white block">
            الصق نصوص وجداول الـ PDF أو الإكسيل هنا (سطر لكل مركز):
          </label>
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="مثال:&#10;مركز كارجاس تحويل مصدق - شارع مصدق الدقي - الجيزة - 0237618990&#10;مركز فحص أسطوانات ألماظة - طريق المطار مصر الجديدة - القاهرة"
            className="w-full p-3 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono focus:outline-none"
          />
          <button
            onClick={handleProcessPastedText}
            disabled={!pastedText.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow"
          >
            معالجة واستخراج المراكز من النص المنسوخ
          </button>
        </div>
      )}

      {/* رسالة نجاح الحفظ إن وُجدت */}
      {importStatus && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-black block">{importStatus.message}</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                مراكز مستقلة جديدة: {importStatus.newCount} | مراكز مدمجة بالمحطات: {importStatus.mergedCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. جدول المعاينة الذكي للمراكز المستخرجة قبل التثبيت */}
      {extractedCenters.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>المراكز المستخرجة الجاهزة للتثبيت</span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {extractedCenters.length} مركز
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                راجع المراكز، عدل خيار كل مركز (منفصل / مدمج)، ثم اضغط على زر الحفظ النهائي
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="بحث في المعاينة..."
                  className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setExtractedCenters([])}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                title="إلغاء المعاينة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* جدول الصفوف */}
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">اسم المركز</th>
                  <th className="p-3">العنوان والموقع</th>
                  <th className="p-3">النشاط</th>
                  <th className="p-3">الإحداثيات</th>
                  <th className="p-3">طريقة التسجيل</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPreview.map((center) => (
                  <tr key={center.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    {/* اسم المركز */}
                    <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                      {center.name}
                    </td>

                    {/* العنوان والمحافظة */}
                    <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[220px]">
                      <div className="truncate">{center.address}</div>
                      <span className="text-[10px] text-slate-400 block">{center.governorate}</span>
                    </td>

                    {/* النشاط */}
                    <td className="p-3">
                      {center.category === 'cylinderTesting' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          فحص أسطوانات
                        </span>
                      ) : center.category === 'bpOilCenter' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Droplets className="w-3 h-3 text-blue-600" />
                          زيوت BP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <Flame className="w-3 h-3 text-emerald-600" />
                          تحويل وصيانة
                        </span>
                      )}
                    </td>

                    {/* الإحداثيات */}
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      <div>{center.lat.toFixed(4)}, {center.lng.toFixed(4)}</div>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans">
                        {center.hasExactCoordinates ? 'إحداثيات دقيقة من الشيت' : 'محدد بالموقع الجغرافي'}
                      </span>
                    </td>

                    {/* طريقة التسجيل: منفصل أو مدمج */}
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleToggleRowAction(center.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            center.actionType === 'standalone'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {center.actionType === 'standalone' ? (
                            <>
                              <Building className="w-3 h-3" />
                              <span>مركز منفصل جديد</span>
                            </>
                          ) : (
                            <>
                              <GitMerge className="w-3 h-3" />
                              <span>مدمج مع محطة قائمة</span>
                            </>
                          )}
                        </button>

                        {/* قائمة المحطات القريبة إذا اختار دمج */}
                        {center.actionType === 'merge' && (
                          <select
                            value={center.matchedStationId || ''}
                            onChange={(e) => handleSelectMatchedStation(center.id, e.target.value)}
                            className="text-[10px] p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 max-w-[160px]"
                          >
                            <option value="">اختر المحطة للدمج...</option>
                            {stations.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.governorate})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* زر الحذف */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteRow(center.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="حذف هذا الصف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* زر التثبيت والحفظ النهائي */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 font-semibold">
              سيتم حفظ وتأكيد تسجيل المراكز فوراً في قاعدة البيانات وتحديث الخريطة.
            </span>

            <button
              onClick={handleCommitCenters}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>تثبيت وحفظ المراكز في المنظومة الآن ({extractedCenters.length})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
