// Carrier definitions, brand themes, tracking URL templates, and regex detection patterns

export const CARRIERS = {
  'israel-post': {
    id: 'israel-post',
    name: 'Israel Post',
    hebrewName: 'דואר ישראל',
    color: 'from-red-500 to-rose-600',
    badgeBg: 'bg-red-500/10 border-red-500/30 text-red-400',
    accentColor: '#ef4444',
    logoText: 'דואר',
    website: 'https://mypost.israelpost.co.il',
    getTrackingUrl: (trackNum) => `https://mypost.israelpost.co.il/itemtrace?itemcode=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^[A-Z]{2}\d{9}IL$/i,           // Standard UPU S10 format ending in IL (e.g. RS123456789IL, RR..., CP...)
      /^\d{13}IL$/i,
      /^[A-Z]{2}\d{8,9}$/i            // Universal registered mail
    ],
    sample: 'RS948219481IL',
    country: 'Israel'
  },
  'chita': {
    id: 'chita',
    name: 'Cheetah Delivery (Chita)',
    hebrewName: 'צ\'יטה שליחויות',
    color: 'from-amber-600 to-orange-700',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    accentColor: '#d97706',
    logoText: 'צ\'יטה',
    website: 'https://chita-il.com',
    getTrackingUrl: (trackNum) => `https://chita-il.com/runportal/tracking?num=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^CH\d{8,12}$/i,
      /^CT\d{8,12}$/i,
      /^CHT[A-Z0-9]{8,12}$/i
    ],
    sample: 'CH10849201',
    country: 'Israel'
  },
  'hfd': {
    id: 'hfd',
    name: 'HFD Delivery',
    hebrewName: 'HFD שליחויות',
    color: 'from-blue-700 to-indigo-800',
    badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    accentColor: '#3b82f6',
    logoText: 'HFD',
    website: 'https://hfd.co.il',
    getTrackingUrl: (trackNum) => `https://hfd.co.il/tracking?num=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^HFD\d{8,12}$/i,
      /^5\d{8,9}$/
    ],
    sample: 'HFD90481029',
    country: 'Israel'
  },
  'boxit': {
    id: 'boxit',
    name: 'BoxIt',
    hebrewName: 'בוקסיט (BoxIt)',
    color: 'from-pink-600 to-rose-600',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    accentColor: '#f43f5e',
    logoText: 'BoxIt',
    website: 'https://boxit.co.il',
    getTrackingUrl: (trackNum) => `https://boxit.co.il/tracking/${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^BOX[0-9A-Z]{6,12}$/i,
      /^BX\d{7,10}$/i
    ],
    sample: 'BOX920194',
    country: 'Israel'
  },
  'cainiao': {
    id: 'cainiao',
    name: 'AliExpress / Cainiao',
    hebrewName: 'קאיניאו / עליאקספרס',
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    accentColor: '#f97316',
    logoText: 'Cainiao',
    website: 'https://global.cainiao.com',
    getTrackingUrl: (trackNum) => `https://global.cainiao.com/newDetail.htm?mailNoList=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^(LP|CAINIAO)\d+/i,            // LP00582910482CN
      /^[A-Z]{2}\d{9}CN$/i,           // Standard China Post
      /^CN\d{10,}/i,
      /^AE[A-Z0-9]{10,18}$/i
    ],
    sample: 'LP00582910482CN',
    country: 'China'
  },
  'yunexpress': {
    id: 'yunexpress',
    name: 'YunExpress',
    hebrewName: 'יון אקספרס (YunExpress)',
    color: 'from-teal-600 to-emerald-700',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    accentColor: '#0d9488',
    logoText: 'Yun',
    website: 'https://www.yunexpress.com',
    getTrackingUrl: (trackNum) => `https://www.yuntrack.com/parcelTracking?pNumbers=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^YT\d{16}$/i,
      /^YT\d{18}$/i
    ],
    sample: 'YT2109849201948201',
    country: 'China / Global'
  },
  '4px': {
    id: '4px',
    name: '4PX Express',
    hebrewName: '4PX אקספרס',
    color: 'from-blue-600 to-cyan-600',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    accentColor: '#06b6d4',
    logoText: '4PX',
    website: 'https://express.4px.com',
    getTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://express.4px.com/track/search?keyword=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^4PX\d+/i,                     // 4PX300084920194
      /^FPX\d+/i
    ],
    sample: '4PX300184920194',
    country: 'China / Global'
  },
  'dhl': {
    id: 'dhl',
    name: 'DHL Express',
    hebrewName: 'DHL אקספרס',
    color: 'from-yellow-400 to-amber-500',
    badgeBg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    accentColor: '#eab308',
    logoText: 'DHL',
    website: 'https://www.dhl.com',
    getTrackingUrl: (trackNum) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^\d{10}$/,                     // 10 digits DHL express AWB
      /^JJD\d{16,18}$/i,              // DHL Packet / eCommerce
      /^GM\d{16,18}$/i
    ],
    sample: '4829104821',
    country: 'Germany / Global'
  },
  'fedex': {
    id: 'fedex',
    name: 'FedEx',
    hebrewName: 'פדאקס (FedEx)',
    color: 'from-purple-600 to-indigo-600',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    accentColor: '#a855f7',
    logoText: 'FedEx',
    website: 'https://www.fedex.com',
    getTrackingUrl: (trackNum) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^\d{12}$/,                     // Standard 12 digits
      /^\d{15}$/,                     // Ground 15 digits
      /^\d{20}$/,                     // SmartPost
      /^\d{22}$/
    ],
    sample: '794820194821',
    country: 'USA / Global'
  },
  'ups': {
    id: 'ups',
    name: 'UPS',
    hebrewName: 'יו-פי-אס (UPS)',
    color: 'from-amber-700 to-amber-900',
    badgeBg: 'bg-amber-600/10 border-amber-600/30 text-amber-300',
    accentColor: '#d97706',
    logoText: 'UPS',
    website: 'https://www.ups.com',
    getTrackingUrl: (trackNum) => `https://www.ups.com/track?tracknum=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^1Z[0-9A-Z]{16}$/i,            // Standard 1Z tracking number (e.g. 1Z9999999999999999)
      /^\d{9}$/,
      /^\d{11}$/
    ],
    sample: '1Z999AA10123456784',
    country: 'USA / Global'
  },
  'usps': {
    id: 'usps',
    name: 'USPS',
    hebrewName: 'שירות הדואר של ארה"ב (USPS)',
    color: 'from-blue-800 to-slate-900',
    badgeBg: 'bg-blue-700/10 border-blue-700/30 text-blue-300',
    accentColor: '#1d4ed8',
    logoText: 'USPS',
    website: 'https://www.usps.com',
    getTrackingUrl: (trackNum) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^94\d{20}$/,                   // 9400 1000 0000 0000 0000 00
      /^92\d{20}$/,
      /^93\d{20}$/,
      /^[A-Z]{2}\d{9}US$/i
    ],
    sample: '9400100000000000000000',
    country: 'USA'
  },
  'royal-mail': {
    id: 'royal-mail',
    name: 'Royal Mail',
    hebrewName: 'רויאל מייל (בריטניה)',
    color: 'from-red-600 to-red-800',
    badgeBg: 'bg-red-600/10 border-red-600/30 text-red-300',
    accentColor: '#dc2626',
    logoText: 'Royal Mail',
    website: 'https://www.royalmail.com',
    getTrackingUrl: (trackNum) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^[A-Z]{2}\d{9}GB$/i
    ],
    sample: 'RN123456789GB',
    country: 'United Kingdom'
  },
  'aramex': {
    id: 'aramex',
    name: 'Aramex',
    hebrewName: 'אראמקס (Aramex)',
    color: 'from-orange-600 to-red-700',
    badgeBg: 'bg-orange-600/10 border-orange-600/30 text-orange-300',
    accentColor: '#ea580c',
    logoText: 'Aramex',
    website: 'https://www.aramex.com',
    getTrackingUrl: (trackNum) => `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [
      /^\d{10,11}$/,
      /^3\d{9}$/
    ],
    sample: '3094829104',
    country: 'Middle East / Global'
  },
  'yanwen': {
    id: 'yanwen',
    name: 'Yanwen Express',
    hebrewName: 'ינוואן (Yanwen)',
    color: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    accentColor: '#14b8a6',
    logoText: 'YW',
    website: 'https://www.yw56.com.cn',
    getTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (_trackNum) => `https://www.yw56.com.cn/en/`,
    patterns: [
      /^U[A-Z]\d{9}YP$/i,             // e.g. UY894729184YP
      /^VR\d{9}YP$/i,
      /^LP\d{14}YP$/i
    ],
    sample: 'UY894729184YP',
    country: 'China'
  },
  'other': {
    id: 'other',
    name: 'Other / Universal',
    hebrewName: 'אחר / אוניברסלי',
    color: 'from-slate-600 to-gray-700',
    badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
    accentColor: '#64748b',
    logoText: 'Universal',
    website: 'https://t.17track.net',
    getTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    fallbackTrackingUrl: (trackNum) => `https://t.17track.net/en#nums=${encodeURIComponent(trackNum)}`,
    patterns: [],
    sample: 'TRACK12345678',
    country: 'Global'
  }
};

export const CARRIER_LIST = Object.values(CARRIERS);
