import React, { useState } from 'react';
import { 
  X, Mail, Check, Sparkles, 
  RefreshCw, Smartphone, QrCode, Trash2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function ConnectAccountsModal({
  isOpen,
  onClose,
  onSyncNewDeliveries,
  onShowToast
}) {
  const { language } = useLanguage();

  // Connected accounts state
  const [gmailConnected, setGmailConnected] = useState(() => {
    return localStorage.getItem('deliveree_gmail_connected') === 'true';
  });
  const [smsConnected, setSmsConnected] = useState(() => {
    return localStorage.getItem('deliveree_sms_connected') === 'true';
  });

  const [isAuthorizingGmail, setIsAuthorizingGmail] = useState(false);
  const [isScanningInbox, setIsScanningInbox] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  // Dynamic origin URL for testing on physical mobile device
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://deliveree.app';
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appOrigin)}`;

  // 1-Click Gmail Connect (OAuth API Simulation)
  const handleConnectGmail = () => {
    setIsAuthorizingGmail(true);
    setTimeout(() => {
      setIsAuthorizingGmail(false);
      setGmailConnected(true);
      localStorage.setItem('deliveree_gmail_connected', 'true');
      if (onShowToast) onShowToast(
        language === 'he' ? 'חשבון Gmail חובר בהצלחה! הרשאת קריאת הודעות שילוח אושרה.' : 'Gmail connected! Read-only shipping email permission granted.',
        'success'
      );
    }, 1000);
  };

  const handleDisconnectGmail = () => {
    setGmailConnected(false);
    localStorage.removeItem('deliveree_gmail_connected');
    if (onShowToast) onShowToast(language === 'he' ? 'חשבון Gmail נותק' : 'Gmail disconnected', 'info');
  };

  // Scan Connected Inbox via API
  const handleScanInbox = () => {
    setIsScanningInbox(true);
    setTimeout(() => {
      setIsScanningInbox(false);
      // Auto-extract deliveries from simulated API inbox fetch
      const newItems = [
        {
          id: `pkg-${Date.now()}-1`,
          title: 'Sony WH-1000XM5 Wireless Headphones',
          titleHe: 'אוזניות Sony WH-1000XM5',
          trackingNumber: `RS${Math.floor(100000000 + Math.random() * 900000000)}IL`,
          carrier: 'israel-post',
          carrierName: 'Israel Post',
          status: 'out_for_delivery',
          category: 'electronics',
          orderDate: new Date().toISOString().slice(0, 10),
          expectedDeliveryDate: new Date().toISOString().slice(0, 10),
          origin: 'Shenzhen, China',
          destination: 'Tel Aviv, Israel',
          notes: 'Auto-detected from Israel Post arrival email. Locker Code #8491',
          notesHe: 'זוהה אוטומטית מאימייל דואר ישראל. קוד איסוף #8491 בסניף דיזנגוף',
          isPinned: true,
          isArchived: false,
          checkpoints: [
            {
              id: `cp-${Date.now()}-1`,
              title: 'Awaiting Pickup at Branch',
              titleHe: 'ממתין לאיסוף בסניף',
              description: 'Scanned at local branch. Locker code: 8491',
              descriptionHe: 'החבילה הגיעה לסניף דואר. קוד איסוף: 8491',
              location: 'Dizengoff Branch, Tel Aviv',
              timestamp: new Date().toISOString(),
              isCompleted: true
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `pkg-${Date.now()}-2`,
          title: 'Xiaomi Smart Air Purifier 4',
          titleHe: 'מטהר אוויר חכם Xiaomi Air Purifier 4',
          trackingNumber: `LP${Math.floor(10000000000000 + Math.random() * 90000000000000)}CN`,
          carrier: 'cainiao',
          carrierName: 'AliExpress / Cainiao',
          status: 'in_transit',
          category: 'home',
          orderDate: new Date().toISOString().slice(0, 10),
          expectedDeliveryDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
          origin: 'Hangzhou, China',
          destination: 'Tel Aviv, Israel',
          notes: 'Auto-detected from AliExpress shipping dispatch email',
          notesHe: 'זוהה אוטומטית מאימייל יציאת משלוח מעליאקספרס',
          isPinned: false,
          isArchived: false,
          checkpoints: [
            {
              id: `cp-${Date.now()}-2`,
              title: 'Flight Dispatched',
              titleHe: 'יצא בטיסה לישראל',
              description: 'Departed origin airport sorting hub',
              descriptionHe: 'יצא ממרכז המיון בשדה התעופה',
              location: 'Hong Kong Cargo Terminal',
              timestamp: new Date().toISOString(),
              isCompleted: true
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      if (onSyncNewDeliveries) {
        newItems.forEach(item => onSyncNewDeliveries(item));
      }

      if (onShowToast) onShowToast(
        language === 'he' ? 'סריקת Gmail הסתיימה: נמצאו 2 חבילות חדשות ונוספו למעקב!' : 'Gmail scan complete: 2 new shipments found & tracked!',
        'success'
      );
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {language === 'he' ? 'חיבור אימייל ו-SMS לקליטה אוטומטית' : 'Connect Email & SMS (1-Click Auto-Sync)'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'he' ? 'חיבור ישיר בלחיצה אחת עם הרשאות API (ללא צורך בכללי העברה ידניים)' : '1-click direct API connection with permissions (no manual forwarding rules)'}
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

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Section 1: 1-Click Gmail Connect */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    {language === 'he' ? 'חיבור ישיר לחשבון Google / Gmail' : 'Google / Gmail Direct Connect'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'he' ? 'זיהוי אוטומטי של אישורי שילוח באמצעות Gmail API' : 'Auto-detect shipping receipts via Gmail API'}
                  </p>
                </div>
              </div>

              {gmailConnected ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{language === 'he' ? 'מחובר' : 'Connected'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                  {language === 'he' ? 'לא מחובר' : 'Not Connected'}
                </span>
              )}
            </div>

            {gmailConnected ? (
              <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold">● {language === 'he' ? 'סנכרון פעיל:' : 'Active Sync:'}</span> {language === 'he' ? 'סורק הודעות מדואר ישראל, עליאקספרס ו-DHL' : 'Scanning Israel Post, AliExpress & DHL'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleScanInbox}
                    disabled={isScanningInbox}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningInbox ? 'animate-spin' : ''}`} />
                    <span>{isScanningInbox ? (language === 'he' ? 'סורק כעת...' : 'Scanning...') : (language === 'he' ? 'סרוק תיבה עכשיו' : 'Scan Inbox Now')}</span>
                  </button>
                  <button
                    onClick={handleDisconnectGmail}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title={language === 'he' ? 'נתק חשבון' : 'Disconnect'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {language === 'he' ? 'דרושה הרשאת קריאה בלבד להודעות שילוח' : 'Read-only access for shipping receipts'}
                </span>
                <button
                  onClick={handleConnectGmail}
                  disabled={isAuthorizingGmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAuthorizingGmail ? (language === 'he' ? 'מתחבר ומאשר...' : 'Authorizing...') : (language === 'he' ? 'חבר חשבון Gmail בלחיצה אחת' : 'Connect Gmail in 1-Click')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: 1-Click SMS & Mobile Phone Connect */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    {language === 'he' ? 'קליטת SMS אוטומטית מהטלפון' : 'Phone SMS Auto-Ingestion'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'he' ? 'קליטת SMS מחברות שליחויות בישראל' : 'Detect delivery SMS from Israeli carriers'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSmsConnected(!smsConnected);
                  if (onShowToast) onShowToast(
                    !smsConnected
                      ? (language === 'he' ? 'הרשאת קריאת SMS הופעלה במכשיר' : 'SMS Permission enabled on device')
                      : (language === 'he' ? 'הרשאת SMS בוטלה' : 'SMS Permission disabled'),
                    'info'
                  );
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  smsConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                }`}
              >
                {smsConnected ? (language === 'he' ? '● מחובר ומאזין ל-SMS' : '● Connected') : (language === 'he' ? 'הפעל הרשאת SMS' : 'Enable SMS Sync')}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              {language === 'he'
                ? 'במכשירים ניידים (אנדרואיד / אייפון), הפעלת ההרשאה מאפשרת לאפליקציה לקלוט אוטומטית הודעות עם קודי איסוף ומספרי מעקב ברגע הגעתן.'
                : 'On mobile devices, granting permission allows Deliveree to detect delivery SMS alerts with locker codes the moment they arrive.'}
            </p>
          </div>

          {/* Section 3: Open & Test on Your Mobile Phone (QR Code) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  {language === 'he' ? 'בדוק ישירות בטלפון הנייד שלך (סרוק QR)' : 'Open & Test on Your Mobile Phone'}
                </h3>
              </div>
              <button
                onClick={() => setShowQR(!showQR)}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                {showQR ? (language === 'he' ? 'הסתר QR' : 'Hide QR') : (language === 'he' ? 'הצג QR לסריקה' : 'Show QR')}
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {language === 'he'
                ? `סרוק את הקוד במצלמת הטלפון או פתח את הקישור בדפדפן: ${appOrigin}`
                : `Scan the code with your phone camera or open the link in your browser: ${appOrigin}`}
            </p>

            {showQR && (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 animate-fade-in">
                <div className="p-2 bg-white rounded-xl shadow-lg">
                  <img src={qrCodeImageUrl} alt="QR Code to open Deliveree on phone" className="w-36 h-36" />
                </div>
                <div className="space-y-1.5 text-start">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    {language === 'he' ? 'הוראות פתיחה בטלפון:' : 'Mobile Instructions:'}
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>{language === 'he' ? 'פתח את המצלמה בטלפון וסרוק את ה-QR.' : 'Open phone camera & scan QR code.'}</li>
                    <li>{language === 'he' ? 'האפליקציה תיפתח מיידית בדפדפן הטלפון.' : 'Deliveree opens instantly in your phone.'}</li>
                    <li>{language === 'he' ? 'באפשרותך ללחוץ "הוסף למסך הבית" להתקנה כאפליקציה!' : 'You can tap "Add to Home Screen" to install as App!'}</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
