import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Inbox, ShieldCheck, Sparkles, LogIn, UserPlus, PlayCircle, MessageSquarePlus } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import { PackageCard } from './components/PackageCard';
import { PackageTable } from './components/PackageTable';
import { PackageDetailModal } from './components/PackageDetailModal';
import { AddEditPackageModal } from './components/AddEditPackageModal';
import { SmartImportModal } from './components/SmartImportModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ConnectAccountsModal } from './components/ConnectAccountsModal';
import { AuthModal } from './components/AuthModal';
import { FeedbackModal } from './components/FeedbackModal';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { Toast } from './components/Toast';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { deliveryService } from './services/deliveryService';
import { cloudAdapter } from './services/cloudStorageAdapter';
import { INITIAL_PACKAGES } from './data/initialMockData';
import { useLanguage, LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth, AuthProvider } from './context/AuthContext';

function DashboardContent() {
  const { t, language, isRTL } = useLanguage();
  const { user, triggerCloudSync } = useAuth();

  // Demo URL Parameter Check (?demo=true or #demo)
  const isDemoUrl = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || window.location.hash === '#demo';
  }, []);

  const [isDemoMode, setIsDemoMode] = useState(isDemoUrl);

  // Primary State
  const [packages, setPackages] = useState(() => {
    if (isDemoUrl) {
      return INITIAL_PACKAGES;
    }
    return deliveryService.getPackages(user?.id || null);
  });

  // Reload packages when switching users or logging in/out
  useEffect(() => {
    if (isDemoMode) {
      setPackages(INITIAL_PACKAGES);
    } else {
      const userPkgs = deliveryService.getPackages(user?.id || null);
      setPackages(userPkgs);
    }
  }, [user?.id, isDemoMode]);

  // Real-time Cloud Synchronization listener
  useEffect(() => {
    if (isDemoMode || !user?.id) return;
    const unsubscribe = cloudAdapter.subscribe((updatedPackages) => {
      if (Array.isArray(updatedPackages)) {
        setPackages(updatedPackages);
      }
    });
    return () => unsubscribe();
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    if (isDemoUrl && !isDemoMode) {
      setIsDemoMode(true);
      setPackages(INITIAL_PACKAGES);
    }
  }, [isDemoUrl, isDemoMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCarrier, setSelectedCarrier] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Modals & Active Elements
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editPackage, setEditPackage] = useState(null);
  const [smartPrefill, setSmartPrefill] = useState(null);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [selectedDetailPackage, setSelectedDetailPackage] = useState(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [deletePackageId, setDeletePackageId] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync with LocalStorage & Cloud
  const updatePackagesState = (newPackages) => {
    setPackages(newPackages);
    deliveryService.savePackages(newPackages, user?.id || null);
    triggerCloudSync();
  };

  // Handlers
  const handleAddOrUpdatePackage = (pkgData) => {
    let updated;
    const exists = packages.some(p => p.id === pkgData.id);
    if (exists) {
      updated = packages.map(p => (p.id === pkgData.id ? pkgData : p));
      showToast(language === 'he' ? 'החבילה עודכנה בהצלחה!' : 'Package updated successfully!', 'success');
    } else {
      updated = [pkgData, ...packages];
      showToast(language === 'he' ? 'החבילה נוספה למעקב!' : 'New package added to tracking!', 'success');
    }
    updatePackagesState(updated);
    if (selectedDetailPackage?.id === pkgData.id) {
      setSelectedDetailPackage(pkgData);
    }
    setEditPackage(null);
    setSmartPrefill(null);
  };

  const handleDeletePackage = (id) => {
    const updated = packages.filter(p => p.id !== id);
    updatePackagesState(updated);
    if (selectedDetailPackage?.id === id) {
      setSelectedDetailPackage(null);
    }
    showToast(language === 'he' ? 'החבילה נמחקה' : 'Package deleted', 'info');
  };

  const handleTogglePin = (id) => {
    const updated = packages.map(p => {
      if (p.id === id) {
        return { ...p, isPinned: !p.isPinned };
      }
      return p;
    });
    updatePackagesState(updated);
  };

  const handleToggleArchive = (id) => {
    const updated = packages.map(p => {
      if (p.id === id) {
        const nextArchived = !p.isArchived;
        showToast(
          nextArchived
            ? (language === 'he' ? 'החבילה הועברה לארכיון' : 'Package archived')
            : (language === 'he' ? 'החבילה הוחזרה מהארכיון' : 'Package unarchived'),
          'info'
        );
        return { ...p, isArchived: nextArchived };
      }
      return p;
    });
    updatePackagesState(updated);
  };

  const handleStatusChange = (id, newStatus) => {
    const updated = packages.map(p => {
      if (p.id === id) {
        return { ...p, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    updatePackagesState(updated);
    if (selectedDetailPackage?.id === id) {
      setSelectedDetailPackage(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));
    }
  };

  const handleSmartImportResult = (parsedData) => {
    setSmartPrefill(parsedData);
    setIsAddModalOpen(true);
  };

  const handleExportData = () => {
    deliveryService.exportData(packages);
    showToast(t('backup.exported'), 'success');
  };

  const handleImportData = (jsonString) => {
    const res = deliveryService.importData(jsonString);
    if (res.success) {
      updatePackagesState(res.packages);
      showToast(t('backup.imported'), 'success');
    } else {
      showToast(res.error || 'Failed to import', 'error');
    }
  };

  const handleResetData = () => {
    if (isDemoMode) {
      if (window.confirm(t('backup.resetConfirm'))) {
        const demo = deliveryService.resetToDemo(user?.id || null);
        setPackages(demo);
        showToast(t('backup.resetDone'), 'success');
      }
    } else {
      if (window.confirm(t('backup.clearAllDeliveriesConfirm'))) {
        const cleared = deliveryService.clearUserPackages(user?.id || null);
        setPackages(cleared);
        triggerCloudSync();
        showToast(t('backup.clearedDone'), 'info');
      }
    }
  };

  const handleLaunchDemoMode = () => {
    setIsDemoMode(true);
    setPackages(INITIAL_PACKAGES);
    showToast(language === 'he' ? 'הופעל מצב הדגמה חי' : 'Demo mode loaded with sample packages', 'info');
  };

  // Filter & Sort Logic (Optimized ISO date comparison without new Date() churn)
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = pkg.title?.toLowerCase().includes(q) || pkg.titleHe?.toLowerCase().includes(q);
        const matchesTrack = pkg.trackingNumber?.toLowerCase().includes(q);
        const matchesCarrier = pkg.carrier?.toLowerCase().includes(q) || pkg.carrierName?.toLowerCase().includes(q);
        const matchesNotes = pkg.notes?.toLowerCase().includes(q) || pkg.notesHe?.toLowerCase().includes(q);
        const matchesDest = pkg.destination?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesTrack && !matchesCarrier && !matchesNotes && !matchesDest) {
          return false;
        }
      }

      if (selectedCarrier !== 'all' && pkg.carrier !== selectedCarrier) {
        return false;
      }

      if (activeTab === 'archived') {
        return pkg.isArchived;
      }

      if (pkg.isArchived) {
        return false;
      }

      if (activeTab === 'all') return true;
      if (activeTab === 'active') return pkg.status !== 'delivered';
      if (activeTab === 'in_transit') return pkg.status === 'in_transit' || pkg.status === 'shipped' || pkg.status === 'ordered';
      if (activeTab === 'out_for_delivery') return pkg.status === 'out_for_delivery';
      if (activeTab === 'delivered') return pkg.status === 'delivered';
      if (activeTab === 'customs') return pkg.status === 'customs' || pkg.status === 'exception';

      return true;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'newest') {
        const timeA = a.createdAt || '';
        const timeB = b.createdAt || '';
        return timeB.localeCompare(timeA);
      }
      if (sortBy === 'expected') {
        if (!a.expectedDeliveryDate) return 1;
        if (!b.expectedDeliveryDate) return -1;
        return a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate);
      }
      if (sortBy === 'title') {
        const titleA = language === 'he' ? (a.titleHe || a.title) : a.title;
        const titleB = language === 'he' ? (b.titleHe || b.title) : b.title;
        return (titleA || '').localeCompare(titleB || '');
      }
      if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });
  }, [packages, searchQuery, selectedCarrier, activeTab, sortBy, language]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Demo Banner indicator when in Demo Mode */}
      {isDemoMode && !user && (
        <div className="bg-gradient-to-r from-indigo-900/90 to-blue-900/90 border-b border-indigo-500/30 px-4 py-2.5 text-center text-xs font-semibold text-indigo-200 flex items-center justify-center gap-2">
          <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{isRTL ? 'אתה צופה בגרסת הדגמה חיה (?demo=true)' : 'You are viewing the Interactive Demo (?demo=true)'}</span>
          <button 
            onClick={() => setIsAuthOpen(true)}
            className="underline ms-2 text-white hover:text-blue-300 cursor-pointer font-bold"
          >
            {isRTL ? 'התחבר לחשבון אמיתי' : 'Sign in to use real tracking'}
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        isDemoMode={isDemoMode}
        onOpenAddModal={() => {
          setEditPackage(null);
          setSmartPrefill(null);
          setIsAddModalOpen(true);
        }}
        onOpenSmartImport={() => setIsSmartImportOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!user && !isDemoMode ? (
          /* GUEST / NEW USER WELCOME ONBOARDING GATE */
          <div className="max-w-2xl mx-auto my-6 sm:my-12 p-6 sm:p-10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-2xl text-center animate-in fade-in slide-in-from-bottom-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/30">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {isRTL ? 'ברוכים הבאים ל-Deliveree' : 'Welcome to Deliveree'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
              {isRTL 
                ? 'מעקב חכם אחר כל החבילות והמשלוחים שלך בישראל ובעולם עם סנכרון ענן אוטומטי.'
                : 'Smart tracking for all your shipments and deliveries with automatic real-time cloud sync.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-start flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">
                  {isRTL ? 'סנכרון ענן מאובטח' : 'Zero-Trust Cloud Sync'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-start flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">
                  {isRTL ? 'זיהוי SMS וספקים אוטומטי' : 'Carrier Auto-Detection'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-4">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{isRTL ? 'התחבר לחשבון שלך' : 'Sign In to Your Account'}</span>
              </button>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>{isRTL ? 'יצירת חשבון חדש' : 'Create New Account'}</span>
              </button>
            </div>

            {/* Direct Demo Trigger for testing without sign in */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={handleLaunchDemoMode}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer p-2 min-h-[44px]"
              >
                {isRTL ? 'או צפה בהדגמה אינטראקטיבית עם חבילות לדוגמה' : 'Or explore the interactive demo with mock packages'}
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED OR DEMO-MODE DASHBOARD */
          <>
            {/* Metric Cards */}
            <StatsCards
              packages={packages.filter(p => !p.isArchived)}
              activeFilter={activeTab}
              onSelectFilter={(tabId) => setActiveTab(tabId)}
            />

            {/* Filter & View Controls */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedCarrier={selectedCarrier}
              onCarrierChange={setSelectedCarrier}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              packages={packages}
            />

            {/* Package Content List / Table */}
            {filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl text-center backdrop-blur-xl animate-fade-in my-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200 mb-1">
                  {t('filters.noPackages')}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6">
                  {searchQuery || selectedCarrier !== 'all' || activeTab !== 'all'
                    ? (language === 'he' ? 'נסה לשנות את מילות החיפוש או לאפס את הסינונים.' : 'Try adjusting your search query or reset the filters.')
                    : (language === 'he' ? 'אין כרגע חבילות במעקב. הוסף חבילה חדשה או ייבא מהודעת SMS!' : 'No packages being tracked yet. Add a new package or import from an SMS!')}
                </p>
                <div className="flex items-center gap-3">
                  {(searchQuery || selectedCarrier !== 'all' || activeTab !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCarrier('all');
                        setActiveTab('all');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
                    >
                      {t('filters.clearFilters')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditPackage(null);
                      setSmartPrefill(null);
                      setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('addPackage')}</span>
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                {filteredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onOpenDetails={(p) => setSelectedDetailPackage(p)}
                    onEdit={(p) => {
                      setEditPackage(p);
                      setIsAddModalOpen(true);
                    }}
                    onDelete={(id) => setDeletePackageId(id)}
                    onTogglePin={handleTogglePin}
                    onToggleArchive={handleToggleArchive}
                    onStatusChange={handleStatusChange}
                    onShowToast={showToast}
                  />
                ))}
              </div>
            ) : (
              <div className="animate-fade-in">
                <PackageTable
                  packages={filteredPackages}
                  onOpenDetails={(p) => setSelectedDetailPackage(p)}
                  onEdit={(p) => {
                    setEditPackage(p);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={(id) => setDeletePackageId(id)}
                  onTogglePin={handleTogglePin}
                  onStatusChange={handleStatusChange}
                  onShowToast={showToast}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Alpha Feedback Button */}
      <aside aria-label="Alpha Feedback" className={`fixed z-30 bottom-5 ${isRTL ? 'left-5' : 'right-5'}`}>
        <button
          onClick={() => setIsFeedbackOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all cursor-pointer min-h-[44px]"
          title={language === 'he' ? 'משוב ודיווח תקלות' : 'Feedback & Bug Report'}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>{language === 'he' ? 'משוב אלפא' : 'Feedback'}</span>
        </button>
      </aside>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 bg-slate-950/60 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Deliveree • {t('appTagline')}</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Supports Israel Post, AliExpress, 4PX, DHL, FedEx, UPS & Yanwen</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Package Modal */}
      <AddEditPackageModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditPackage(null);
          setSmartPrefill(null);
        }}
        onSave={handleAddOrUpdatePackage}
        editPackage={editPackage}
        initialValues={smartPrefill}
      />

      {/* Smart Import from SMS / Email Modal */}
      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        onParsedResult={handleSmartImportResult}
      />

      {/* Shipment Details & Interactive Timeline Modal */}
      <PackageDetailModal
        pkg={selectedDetailPackage}
        isOpen={!!selectedDetailPackage}
        onClose={() => setSelectedDetailPackage(null)}
        onUpdatePackage={handleAddOrUpdatePackage}
        onShowToast={showToast}
      />

      {/* Analytics & Performance Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        packages={packages}
      />

      {/* 1-Click Connect Accounts (Gmail & Phone Sync) Modal */}
      <ConnectAccountsModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSyncNewDeliveries={handleAddOrUpdatePackage}
        onShowToast={showToast}
      />

      {/* User Account & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onShowToast={showToast}
      />

      {/* Alpha Tester Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onShowToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deletePackageId}
        onClose={() => setDeletePackageId(null)}
        onConfirm={() => {
          if (deletePackageId) {
            handleDeletePackage(deletePackageId);
            setDeletePackageId(null);
          }
        }}
      />

      {/* Floating PWA Installation Banner */}
      <InstallPwaBanner />

      {/* Floating Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DashboardContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
