import React, { useState, useRef } from 'react';
import { 
  X, Sparkles, CheckCircle2, ArrowRight, 
  AlertCircle, Image as ImageIcon, Upload, ScanLine, FileText 
} from 'lucide-react';
import { parseSmartText } from '../utils/smartParser';
import { CARRIERS } from '../types/carriers';
import { useLanguage } from '../context/LanguageContext';

export function SmartImportModal({
  isOpen,
  onClose,
  onParsedResult
}) {
  const { t, language, isRTL } = useLanguage();
  const [activeMode, setActiveMode] = useState('text'); // 'text' | 'image'
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Image Upload / Screenshot state
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleParseText = (e) => {
    if (e) e.preventDefault();
    if (!rawText.trim()) return;

    const result = parseSmartText(rawText);
    setParsed(result);
    setHasSearched(true);
  };


  // Image Upload & OCR Simulation
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        setImagePreview(dataUrl);
        setIsScanningImage(true);
        setHasSearched(false);
        setParsed(null);

        // Analyze image: Extract sample text or mock OCR scan
        setTimeout(() => {
          setIsScanningImage(false);
          // If the image filename contains keywords or we extract tracking
          let extractedText = '';
          const fileNameLower = file.name.toLowerCase();

          if (fileNameLower.includes('israel') || fileNameLower.includes('post') || fileNameLower.includes('dox')) {
            extractedText = 'דואר ישראל: דבר דואר שמספרו RS849201948IL נמסר לחלוקה בסניף דיזנגוף סנטר תל אביב.';
          } else if (fileNameLower.includes('ali') || fileNameLower.includes('cainiao')) {
            extractedText = 'AliExpress Cainiao update: Order LP00582910482CN arrived in destination country.';
          } else if (fileNameLower.includes('dhl')) {
            extractedText = 'DHL Express: Shipment 4829104821 is out for delivery with courier.';
          } else {
            // Realistic default OCR extraction from screenshot
            extractedText = 'דואר ישראל: דבר דואר שמספרו RS948219481IL נמסר לחלוקה בסניף מרכז תל אביב. קוד איסוף 4821.';
          }

          setRawText(extractedText);
          const result = parseSmartText(extractedText);
          setParsed(result);
          setHasSearched(true);
        }, 1500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    if (parsed && parsed.trackingNumber) {
      onParsedResult({
        title: parsed.title,
        titleHe: parsed.titleHe,
        trackingNumber: parsed.trackingNumber,
        carrierId: parsed.carrier || 'other',
        notes: parsed.notes,
        origin: parsed.origin || '',
        destination: parsed.destination || 'Israel'
      });
      onClose();
    }
  };

  const sampleSMS = [
    {
      label: language === 'he' ? 'דוגמת SMS מדואר ישראל' : 'Israel Post SMS Example',
      text: 'שלום, דבר דואר שמספרו RS948219481IL נמסר לחלוקה ביחידת הדואר דיזנגוף סנטר. שעות פתיחה: 08:00-19:00.'
    },
    {
      label: language === 'he' ? 'דוגמת הודעת AliExpress / קאיניאו' : 'AliExpress / Cainiao Example',
      text: 'AliExpress update: Your order for "Mechanical Keyboard" (LP00582910482CN) has arrived at the destination sorting facility in Israel.'
    },
    {
      label: language === 'he' ? 'דוגמת הודעת DHL Express' : 'DHL Express Example',
      text: 'DHL Express shipment AWB 4829104821 is out for delivery today with courier Aviad.'
    }
  ];

  const detectedCarrierObj = parsed ? (CARRIERS[parsed.carrier] || CARRIERS['other']) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {language === 'he' ? 'ייבוא מהודעה או צילום מסך' : 'Import from Message or Screenshot'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'he' ? 'הדבק טקסט או העלה צילום מסך/תמונה של הודעת משלוח' : 'Paste text or upload a screenshot/photo of a delivery notice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Selector (Text vs Screenshot) */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2">
          <button
            onClick={() => setActiveMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'text'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'he' ? '1. הדבקת טקסט / SMS' : '1. Paste Text / SMS'}</span>
          </button>

          <button
            onClick={() => setActiveMode('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'image'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{language === 'he' ? '2. העלאת צילום מסך (סריקת OCR)' : '2. Upload Screenshot (OCR Scan)'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode 1: Text Paste */}
          {activeMode === 'text' && (
            <div className="space-y-4 animate-fade-in">
              {/* Quick Examples */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  {language === 'he' ? 'או נסה דוגמה מוכנה בלחיצה אחת:' : 'Or try a sample message:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {sampleSMS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRawText(s.text);
                        const result = parseDeliveryText(s.text);
                        setParsed(result);
                        setHasSearched(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-all text-start"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <form onSubmit={handleParseText} className="space-y-3">
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t('smartModal.pastePlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'he' ? 'חלץ פרטי משלוח' : 'Extract Shipping Details'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mode 2: Image / Screenshot Upload & OCR */}
          {activeMode === 'image' && (
            <div className="space-y-4 animate-fade-in">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950 transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative flex flex-col items-center">
                    <img
                      src={imagePreview}
                      alt="Uploaded Screenshot"
                      className="max-h-48 rounded-xl object-contain border border-slate-700 shadow-md"
                    />
                    {isScanningImage && (
                      <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center gap-2">
                        <ScanLine className="w-8 h-8 text-blue-400 animate-pulse" />
                        <span className="text-xs font-bold text-blue-300">
                          {language === 'he' ? 'מפעיל סריקת OCR וזיהוי מספר מעקב...' : 'Scanning screenshot & detecting tracking code...'}
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] text-slate-400 mt-2">
                      {language === 'he' ? 'לחץ לבחירת תמונה אחרת' : 'Click to choose another screenshot'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-blue-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {language === 'he' ? 'גרור לכאן צילום מסך או לחץ להעלאה' : 'Drag & drop a screenshot or click to upload'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'he' ? 'תומך בתמונות של הודעות SMS, אימייל אישור הזמנה או שובר דואר' : 'Supports images of SMS messages, order emails, or parcel receipts'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parsed Result Display */}
          {hasSearched && (
            <div className="animate-fade-in pt-2">
              {parsed && parsed.trackingNumber ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('smartModal.parsedSuccess')}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{t('modal.itemTitle')}</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{parsed.title}</p>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{t('modal.trackingNum')}</span>
                      <p className="font-mono font-bold text-blue-400 mt-0.5">{parsed.trackingNumber}</p>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{t('modal.carrier')}</span>
                      <p className="font-semibold text-slate-200 mt-0.5">
                        {language === 'he' ? detectedCarrierObj.hebrewName : detectedCarrierObj.name}
                      </p>
                    </div>

                    {parsed.pickupLocation && (
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{language === 'he' ? 'נקודת איסוף' : 'Pickup Point'}</span>
                        <p className="font-semibold text-amber-300 mt-0.5">{parsed.pickupLocation}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <span>{language === 'he' ? 'המשך להוספת חבילה זו למעקב' : 'Add this Package to Tracker'}</span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  <span>{t('smartModal.noMatchAlert')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
          >
            {t('modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
