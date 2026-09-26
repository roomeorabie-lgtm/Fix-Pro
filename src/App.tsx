import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Cpu,
  Smartphone,
  CreditCard,
  Bell,
  User,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  Brand,
  DeviceModel,
  Board,
  SchematicDocument,
  BoardComponent,
  BoardNet,
  TestPoint,
  SubscriptionPlan,
  NotificationItem
} from './types';
import {
  getBrands,
  getModelsByBrand,
  getBoardsByDevice,
  getSchematicsByBoard,
  getComponentsByBoard,
  getNetsByBoard,
  getTestPointsByBoard,
  getSubscriptionPlans,
  getNotifications
} from './lib/api';
import { seedVerifiedCatalogIntoFirestore } from './lib/bulkImportService';
import { BoardviewViewer } from './components/BoardviewViewer';
import { SchematicViewer } from './components/SchematicViewer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SubscriptionPlansView } from './components/SubscriptionPlansView';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const { user, isAdmin, adminLoggedIn, logoutUser, logoutAdmin, loginAsAdmin } = useAuth();

  // Navigation State
  const [currentPage, setCurrentPage] = useState<
    'home' | 'brands' | 'models' | 'boardview' | 'schematics' | 'plans' | 'profile' | 'admin'
  >('home');

  // Hierarchy Selection State
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [models, setModels] = useState<DeviceModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  // Active Board Data for Viewer
  const [boardComponents, setBoardComponents] = useState<BoardComponent[]>([]);
  const [boardNets, setBoardNets] = useState<BoardNet[]>([]);
  const [boardTestPoints, setBoardTestPoints] = useState<TestPoint[]>([]);
  const [activeSchematic, setActiveSchematic] = useState<SchematicDocument | null>(null);

  // Plans & Notifications
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setIsLoading(true);
    try {
      const [brandList, planList, notifList] = await Promise.all([
        getBrands(),
        getSubscriptionPlans(),
        getNotifications(),
      ]);
      setBrands(brandList);
      setPlans(planList);
      setNotifications(notifList);

      // Check if devices need initial seed (one-time initialization)
      if (brandList.length > 0) {
        const testModels = await getModelsByBrand(brandList[0].id);
        if (testModels.length === 0) {
          // One-time catalog populate if brand has no models yet
          const seeded = await seedVerifiedCatalogIntoFirestore();
          if (seeded.importedCount > 0) {
            const updatedBrands = await getBrands();
            setBrands(updatedBrands);
          }
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When Brand is selected
  const handleSelectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setSelectedBoard(null);
    setIsLoading(true);
    try {
      const modelList = await getModelsByBrand(brand.id);
      setModels(modelList);
      setCurrentPage('models');
    } catch (err) {
      console.error('Error loading models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When Model is selected
  const handleSelectModel = async (model: DeviceModel) => {
    setSelectedModel(model);
    setSelectedBoard(null);
    setIsLoading(true);
    try {
      const boardList = await getBoardsByDevice(model.id);
      setBoards(boardList);
      if (boardList.length > 0) {
        handleSelectBoard(boardList[0]);
      } else {
        setCurrentPage('boardview');
      }
    } catch (err) {
      console.error('Error loading boards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When Board is selected
  const handleSelectBoard = async (board: Board) => {
    setSelectedBoard(board);
    setIsLoading(true);
    try {
      const [comps, nts, tps, schems] = await Promise.all([
        getComponentsByBoard(board.id),
        getNetsByBoard(board.id),
        getTestPointsByBoard(board.id),
        getSchematicsByBoard(board.id),
      ]);
      setBoardComponents(comps);
      setBoardNets(nts);
      setBoardTestPoints(tps);
      setActiveSchematic(schems.length > 0 ? schems[0] : null);
      setCurrentPage('boardview');
    } catch (err) {
      console.error('Error loading board details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Global Search selection handler
  const handleSelectSearchResult = async (result: any) => {
    if (result.type === 'device') {
      const model = result.metadata as DeviceModel;
      setSelectedModel(model);
      const bList = await getBoardsByDevice(model.id);
      setBoards(bList);
      if (bList.length > 0) {
        handleSelectBoard(bList[0]);
      } else {
        setCurrentPage('boardview');
      }
    } else if (result.type === 'board') {
      const board = result.metadata as Board;
      handleSelectBoard(board);
    } else if (result.type === 'component' || result.type === 'net') {
      // Find board and select component
      if (result.boardId) {
        const board = boards.find((b) => b.id === result.boardId);
        if (board) {
          handleSelectBoard(board);
        }
      }
    }
  };

  // If in Admin Mode
  if (adminLoggedIn && currentPage === 'admin') {
    return (
      <AdminDashboard
        onLogout={() => {
          logoutAdmin();
          setCurrentPage('home');
        }}
        onNavigateHome={() => setCurrentPage('home')}
      />
    );
  }

  // Check Subscription Status
  const isSubscriber = user?.status === 'active';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">FixBoard</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                منصة مخططات وصيانة الهواتف الذكية
              </p>
            </div>
          </div>

          {/* Quick Search Bar Trigger */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-400 flex items-center justify-between transition group shadow-inner"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                <span>بحث عن جهاز (iPhone 14), بوردة, IC (U1001), أو مسار...</span>
              </div>
              <kbd className="px-2 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                Ctrl + K
              </kbd>
            </button>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
              title="بحث"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage('plans')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                currentPage === 'plans'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>خطط الاشتراك</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage('profile')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">{user.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                      user.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : user.status === 'expired'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {user.status}
                  </span>
                </button>
                <button
                  onClick={logoutUser}
                  className="p-1.5 text-slate-400 hover:text-rose-400 text-xs"
                  title="تسجيل الخروج"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition"
                >
                  دخول
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-sm"
                >
                  تسجيل جديد
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Broadcast Notifications Alert Bar */}
      {notifications.filter((n) => n.active).length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-b border-emerald-900/50 py-2 px-4 text-center">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-xs text-emerald-300">
            <Bell className="w-3.5 h-3.5 animate-bounce text-emerald-400 shrink-0" />
            <span className="font-bold">{notifications[0].title}:</span>
            <span className="text-slate-300 truncate max-w-xl">{notifications[0].message}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb Hierarchy Navigation Bar */}
      <nav className="bg-slate-900/60 border-b border-slate-800/60 px-4 sm:px-8 py-2 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => {
              setSelectedBrand(null);
              setSelectedModel(null);
              setSelectedBoard(null);
              setCurrentPage('home');
            }}
            className="hover:text-emerald-400 transition"
          >
            الرئيسية
          </button>

          {selectedBrand && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => {
                  setSelectedModel(null);
                  setSelectedBoard(null);
                  setCurrentPage('models');
                }}
                className="font-bold text-slate-200 hover:text-emerald-400 transition"
              >
                {selectedBrand.name}
              </button>
            </>
          )}

          {selectedModel && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => setCurrentPage('boardview')}
                className="font-bold text-slate-200 hover:text-emerald-400 transition"
              >
                {selectedModel.name}
              </button>
            </>
          )}

          {selectedBoard && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {selectedBoard.boardNumber}
              </span>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Areas */}
      <main className="flex-1 flex flex-col">
        {/* PAGE 1: HOME (Hero + Brands list + Quick Access) */}
        {currentPage === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-12 w-full">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 sm:p-14 text-center space-y-6 shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>قاعدة بيانات هندسية حقيقية للفنيين والمهندسين</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
                منصة <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">FixBoard</span> لاحتراف صيانة الهواتف واللوحات الأم
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                استكشف مخططات الدوائر الرسمية (Schematics)، وتتبع مسارات الطاقة والبيانات مع واجهة
                Boardview تفاعلية دقيقة، وبيانات هندسية مستندة إلى وثائق الصيانة الموثوقة.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                >
                  <Search className="w-4 h-4" />
                  <span>بحث سريع في المخططات</span>
                </button>
                <button
                  onClick={() => setCurrentPage('plans')}
                  className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700 transition"
                >
                  استعراض الباقات والأسعار
                </button>
              </div>

              {/* Features summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto border-t border-slate-800/80">
                <div className="p-3 text-center">
                  <div className="text-xl font-bold font-mono text-emerald-400">100%</div>
                  <div className="text-xs text-slate-400 mt-1">بيانات حقيقية موثوقة</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xl font-bold font-mono text-cyan-400">Boardview</div>
                  <div className="text-xs text-slate-400 mt-1">تتبع مسارات وقطع متقدم</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xl font-bold font-mono text-amber-400">PDF Schematics</div>
                  <div className="text-xs text-slate-400 mt-1">عرض مخططات الدوائر كاملة</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xl font-bold font-mono text-rose-400">Active Support</div>
                  <div className="text-xs text-slate-400 mt-1">تحديث مستمر للوحات الجديدة</div>
                </div>
              </div>
            </div>

            {/* Brands Selection Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">الشركات والمصنعين المدعومين</h2>
                  <p className="text-xs text-slate-400">
                    اختر الشركة لاستعراض كافة السلاسل والموديلات المتاحة
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {brands.length} شركات مسجلة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    onClick={() => handleSelectBrand(brand)}
                    className="group p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-emerald-500/40 flex items-center justify-center transition">
                      <Smartphone className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition">
                        {brand.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">استعراض الأجهزة</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: MODELS LIST */}
        {currentPage === 'models' && selectedBrand && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  موديلات شركة {selectedBrand.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  اختر الجهاز لفتح لوحة الـ Boardview ومخططات الـ Schematic المتاحة
                </p>
              </div>

              <button
                onClick={() => setCurrentPage('home')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                تغيير الشركة
              </button>
            </div>

            {models.length === 0 ? (
              <div className="p-16 text-center bg-slate-900/50 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
                <Smartphone className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <h3 className="font-bold text-slate-200">لم يتم رفع أجهزة لهذه الشركة بعد</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  يقوم فريق FixBoard بإضافة وفحص مخططات هذا المصنّع دورياً. يستطيع المسؤول إضافة أجهزة من لوحة التحكم.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {models.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => handleSelectModel(mod)}
                    className="p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                          {mod.regionVariant || 'Global'}
                        </span>
                        <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                      </div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition mt-2">
                        {mod.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        رقم الموديل: {mod.modelNumber || 'N/A'}
                      </p>
                    </div>

                    {mod.technicalSpecs && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-mono">
                        {mod.technicalSpecs.cpu && <div>CPU: {mod.technicalSpecs.cpu}</div>}
                        {mod.technicalSpecs.pmic && <div>PMIC: {mod.technicalSpecs.pmic}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGE 3: BOARDVIEW / SCHEMATICS VIEWER */}
        {currentPage === 'boardview' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4 w-full flex-1 flex flex-col">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>{selectedModel?.name || 'استعراض اللوحة'}</span>
                  {selectedBoard && (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {selectedBoard.boardNumber}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  عرض تفاعلي مباشر للـ Boardview ومسارات اللوحة الأم والمكونات الإلكترونية
                </p>
              </div>

              {/* Boards Switcher */}
              {boards.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">لوحات الجهاز:</span>
                  <div className="flex gap-1.5">
                    {boards.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleSelectBoard(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                          selectedBoard?.id === b.id
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {b.boardNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Schematics Toggle */}
              {selectedBoard?.hasSchematic && (
                <button
                  onClick={() => setCurrentPage('schematics')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>فتح المخطط (Schematic PDF)</span>
                </button>
              )}
            </div>

            {/* Check Subscription Gate */}
            {!isSubscriber && !isAdmin ? (
              <div className="p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">
                  {user ? 'هذا المحتوى يتطلب اشتراكاً نشطاً' : 'سجل دخولك أو اشترك للوصول للوحة'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  بيانات الـ Boardview ومخططات الـ Schematics وتفاصيل الـ ICs متاحة لمشتركي باقات
                  FixBoard المعتمدين.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setCurrentPage('plans')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    استعراض باقات الاشتراك
                  </button>
                  {!user && (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setIsAuthOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      تسجيل الدخول
                    </button>
                  )}
                </div>
              </div>
            ) : selectedBoard ? (
              <BoardviewViewer
                board={selectedBoard}
                components={boardComponents}
                nets={boardNets}
                testPoints={boardTestPoints}
                onOpenSchematic={() => setCurrentPage('schematics')}
              />
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                لا توجد لوحة محددة حالياً
              </div>
            )}
          </div>
        )}

        {/* PAGE 4: SCHEMATICS VIEWER */}
        {currentPage === 'schematics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4 w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage('boardview')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
                <span>العودة للـ Boardview</span>
              </button>

              <span className="text-xs font-mono text-slate-400">
                {selectedModel?.name} • {selectedBoard?.boardNumber}
              </span>
            </div>

            <SchematicViewer
              schematic={activeSchematic}
              onClose={() => setCurrentPage('boardview')}
            />
          </div>
        )}

        {/* PAGE 5: SUBSCRIPTION PLANS */}
        {currentPage === 'plans' && (
          <SubscriptionPlansView
            plans={plans}
            user={user}
            onOpenAuth={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          />
        )}

        {/* PAGE 6: USER PROFILE */}
        {currentPage === 'profile' && user && (
          <div className="max-w-xl mx-auto px-4 py-12 space-y-6 w-full">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">{user.phone}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الحساب:</span>
                  <span
                    className={`font-semibold uppercase px-2 py-0.5 rounded-full text-[10px] ${
                      user.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : user.status === 'expired'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الباقة الحالية:</span>
                  <span className="font-bold text-slate-200">
                    {user.currentPlanName || 'لا يوجد باقة نشطة'}
                  </span>
                </div>
                {user.subscriptionEnd && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ انتهاء الاشتراك:</span>
                    <span className="font-mono text-emerald-400">
                      {new Date(user.subscriptionEnd).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('plans')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                >
                  ترقية أو تجديد الاشتراك
                </button>
                <button
                  onClick={logoutUser}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">FixBoard</span>
            <span>•</span>
            <span>جميع الحقوق محفوظة لمنصة FixBoard © {new Date().getFullYear()}</span>
          </div>

          {/* Discreet Admin Entry Button as requested in brief */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (adminLoggedIn) {
                  setCurrentPage('admin');
                } else {
                  setIsAdminLoginOpen(true);
                }
              }}
              className="text-slate-400 hover:text-slate-400 text-[11px] transition cursor-pointer select-none"
              title="لوحة الإدارة"
            >
              إعداد
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => setIsAuthOpen(false)}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          loginAsAdmin();
          setCurrentPage('admin');
        }}
      />
    </div>
  );
}
