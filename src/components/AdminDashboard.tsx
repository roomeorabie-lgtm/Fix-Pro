import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  Layers,
  Smartphone,
  Bell,
  Settings,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  Eye,
  Edit,
  Save,
  Clock,
  ShieldCheck,
  FileText,
  Cpu,
  Activity,
  LogOut,
  AlertCircle,
  Database,
  UploadCloud
} from 'lucide-react';
import { AdminDataCenter } from './AdminDataCenter';
import {
  UserProfile,
  SubscriptionPlan,
  SubscriptionRequest,
  NotificationItem,
  Brand,
  Series,
  DeviceModel,
  Board,
  SchematicDocument,
  BoardComponent,
  BoardNet,
  TestPoint
} from '../types';
import {
  getAllUsers,
  updateUserStatus,
  manualAssignSubscription,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getNotifications,
  createNotification,
  deleteNotification,
  getBrands,
  createBrand,
  deleteBrand,
  getSeriesByBrand,
  createSeries,
  deleteSeries,
  getModelsByBrand,
  createModel,
  deleteModel,
  getBoardsByDevice,
  createBoard,
  deleteBoard,
  getSchematicsByBoard,
  createSchematic,
  deleteSchematic,
  getComponentsByBoard,
  createBoardComponent,
  deleteBoardComponent,
  getNetsByBoard,
  createBoardNet,
  deleteBoardNet,
  getTestPointsByBoard,
  createTestPoint,
  updateAdminCredentials,
  getAdminSettings
} from '../lib/api';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<
    'datacenter' | 'users' | 'requests' | 'plans' | 'brands' | 'models' | 'boards' | 'components' | 'notifications' | 'settings'
  >('datacenter');

  // USERS STATE
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // REQUESTS STATE
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // PLANS STATE
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(15);
  const [newPlanDays, setNewPlanDays] = useState(30);
  const [newPlanLabel, setNewPlanLabel] = useState('شهر');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState('وصول شامل للمخططات,دعم فني');

  // BRANDS STATE
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrandName, setNewBrandName] = useState('');

  // MODELS STATE
  const [selectedBrandForModels, setSelectedBrandForModels] = useState<string>('');
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [newModelNumber, setNewModelNumber] = useState('');
  const [newModelCpu, setNewModelCpu] = useState('');
  const [newModelPmic, setNewModelPmic] = useState('');

  // BOARDS & SCHEMATICS STATE
  const [selectedModelForBoards, setSelectedModelForBoards] = useState<string>('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardNumber, setNewBoardNumber] = useState('');
  const [newBoardRev, setNewBoardRev] = useState('');

  // SCHEMATIC UPLOAD/LINK MODAL
  const [targetBoardForSchematic, setTargetBoardForSchematic] = useState<Board | null>(null);
  const [schematicTitle, setSchematicTitle] = useState('');
  const [schematicUrl, setSchematicUrl] = useState('');
  const [schematicFileName, setSchematicFileName] = useState('');
  const [boardSchematics, setBoardSchematics] = useState<SchematicDocument[]>([]);

  // COMPONENTS & NETS STATE
  const [selectedBoardForHardware, setSelectedBoardForHardware] = useState<string>('');
  const [boardComponents, setBoardComponents] = useState<BoardComponent[]>([]);
  const [boardNets, setBoardNets] = useState<BoardNet[]>([]);
  const [newCompRef, setNewCompRef] = useState('');
  const [newCompType, setNewCompType] = useState<BoardComponent['type']>('IC');
  const [newCompValue, setNewCompValue] = useState('');
  const [newCompLayer, setNewCompLayer] = useState<'top' | 'bottom'>('top');
  const [newCompX, setNewCompX] = useState<number>(50);
  const [newCompY, setNewCompY] = useState<number>(50);
  const [newCompNets, setNewCompNets] = useState<string>('');

  // NOTIFICATIONS STATE
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'success' | 'alert'>('info');

  // SETTINGS STATE
  const [adminUsername, setAdminUsername] = useState('Fixfix');
  const [adminPassword, setAdminPassword] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoadingUsers(true);
    setLoadingRequests(true);
    try {
      const [allU, allR, allP, allB, allN] = await Promise.all([
        getAllUsers(),
        getSubscriptionRequests(),
        getSubscriptionPlans(),
        getBrands(),
        getNotifications(),
      ]);
      setUsers(allU);
      setRequests(allR);
      setPlans(allP);
      setBrands(allB);
      if (allB.length > 0) {
        setSelectedBrandForModels(allB[0].id);
      }
      setNotifications(allN);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingUsers(false);
      setLoadingRequests(false);
    }
  };

  // Load models when selected brand changes
  useEffect(() => {
    if (selectedBrandForModels) {
      getModelsByBrand(selectedBrandForModels).then((res) => {
        setModels(res);
        if (res.length > 0) {
          setSelectedModelForBoards(res[0].id);
        } else {
          setBoards([]);
        }
      });
    }
  }, [selectedBrandForModels]);

  // Load boards when selected model changes
  useEffect(() => {
    if (selectedModelForBoards) {
      getBoardsByDevice(selectedModelForBoards).then((res) => {
        setBoards(res);
        if (res.length > 0) {
          setSelectedBoardForHardware(res[0].id);
        }
      });
    }
  }, [selectedModelForBoards]);

  // Load hardware (components/nets) when selected board changes
  useEffect(() => {
    if (selectedBoardForHardware) {
      Promise.all([
        getComponentsByBoard(selectedBoardForHardware),
        getNetsByBoard(selectedBoardForHardware),
        getSchematicsByBoard(selectedBoardForHardware),
      ]).then(([comps, nts, sch]) => {
        setBoardComponents(comps);
        setBoardNets(nts);
        setBoardSchematics(sch);
      });
    }
  }, [selectedBoardForHardware]);

  // Handle User Status toggle
  const handleToggleUserStatus = async (userId: string, newStatus: UserProfile['status']) => {
    const success = await updateUserStatus(userId, newStatus);
    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    }
  };

  // Handle Approve Request
  const handleApprove = async (req: SubscriptionRequest) => {
    const success = await approveSubscriptionRequest(req);
    if (success) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r))
      );
      // Reload users to see updated active status
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    }
  };

  const handleReject = async (reqId: string) => {
    const success = await rejectSubscriptionRequest(reqId);
    if (success) {
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r))
      );
    }
  };

  // Add Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName) return;
    const newId = await createSubscriptionPlan({
      name: newPlanName,
      price: Number(newPlanPrice),
      currency: 'USD',
      durationDays: Number(newPlanDays),
      durationLabel: newPlanLabel,
      description: newPlanDesc,
      features: newPlanFeatures.split(',').map((f) => f.trim()),
      active: true,
      order: plans.length + 1,
    });
    setPlans([
      ...plans,
      {
        id: newId,
        name: newPlanName,
        price: Number(newPlanPrice),
        currency: 'USD',
        durationDays: Number(newPlanDays),
        durationLabel: newPlanLabel,
        description: newPlanDesc,
        features: newPlanFeatures.split(',').map((f) => f.trim()),
        active: true,
        order: plans.length + 1,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewPlanName('');
    setNewPlanDesc('');
  };

  // Add Brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const id = await createBrand(newBrandName.trim());
    setBrands([
      ...brands,
      {
        id,
        name: newBrandName.trim(),
        slug: newBrandName.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewBrandName('');
  };

  // Add Model
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandForModels || !newModelName) return;
    const id = await createModel({
      brandId: selectedBrandForModels,
      seriesId: '',
      name: newModelName,
      modelNumber: newModelNumber,
      technicalSpecs: {
        cpu: newModelCpu,
        pmic: newModelPmic,
      },
    });
    const newMod: DeviceModel = {
      id,
      brandId: selectedBrandForModels,
      seriesId: '',
      name: newModelName,
      modelNumber: newModelNumber,
      technicalSpecs: {
        cpu: newModelCpu,
        pmic: newModelPmic,
      },
      createdAt: new Date().toISOString(),
    };
    setModels([...models, newMod]);
    setNewModelName('');
    setNewModelNumber('');
    setNewModelCpu('');
    setNewModelPmic('');
  };

  // Add Board
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelForBoards || !newBoardNumber) return;
    const currentModel = models.find((m) => m.id === selectedModelForBoards);
    const id = await createBoard({
      deviceId: selectedModelForBoards,
      modelName: currentModel?.name || '',
      boardNumber: newBoardNumber,
      revision: newBoardRev,
      hasSchematic: false,
      hasBoardview: true,
    });
    setBoards([
      ...boards,
      {
        id,
        deviceId: selectedModelForBoards,
        modelName: currentModel?.name || '',
        boardNumber: newBoardNumber,
        revision: newBoardRev,
        hasSchematic: false,
        hasBoardview: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewBoardNumber('');
    setNewBoardRev('');
  };

  // Add Component
  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoardForHardware || !newCompRef) return;
    const netList = newCompNets
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const compId = await createBoardComponent({
      boardId: selectedBoardForHardware,
      reference: newCompRef.toUpperCase(),
      type: newCompType,
      value: newCompValue,
      layer: newCompLayer,
      x: Number(newCompX),
      y: Number(newCompY),
      connectedNets: netList,
    });

    setBoardComponents([
      ...boardComponents,
      {
        id: compId,
        boardId: selectedBoardForHardware,
        reference: newCompRef.toUpperCase(),
        type: newCompType,
        value: newCompValue,
        layer: newCompLayer,
        x: Number(newCompX),
        y: Number(newCompY),
        connectedNets: netList,
      },
    ]);

    setNewCompRef('');
    setNewCompValue('');
    setNewCompNets('');
  };

  // Add Schematic Document
  const handleAddSchematic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBoardForSchematic || !schematicUrl) return;

    const id = await createSchematic({
      boardId: targetBoardForSchematic.id,
      deviceId: targetBoardForSchematic.deviceId,
      title: schematicTitle || `مخطط ${targetBoardForSchematic.boardNumber}`,
      fileUrl: schematicUrl,
      fileName: schematicFileName || 'schematic.pdf',
      canDownload: true,
    });

    setBoardSchematics([
      ...boardSchematics,
      {
        id,
        boardId: targetBoardForSchematic.id,
        deviceId: targetBoardForSchematic.deviceId,
        title: schematicTitle || `مخطط ${targetBoardForSchematic.boardNumber}`,
        fileUrl: schematicUrl,
        fileName: schematicFileName || 'schematic.pdf',
        canDownload: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    setTargetBoardForSchematic(null);
    setSchematicTitle('');
    setSchematicUrl('');
    setSchematicFileName('');
  };

  // Add Notification
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMsg) return;
    const id = await createNotification({
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      active: true,
    });
    setNotifications([
      {
        id,
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        active: true,
        createdAt: new Date().toISOString(),
      },
      ...notifications,
    ]);
    setNotifTitle('');
    setNotifMsg('');
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setSettingsStatus('يرجى إدخال كلمة مرور الإدارة الجديدة');
      return;
    }
    const ok = await updateAdminCredentials(adminUsername, adminPassword);
    if (ok) {
      setSettingsStatus('تم تحديث بيانات دخول الإدارة بنجاح!');
      setTimeout(() => setSettingsStatus(null), 3000);
    } else {
      setSettingsStatus('فشل حفظ الإعدادات');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              لوحة تحكم FixBoard المركزية
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Admin Master
              </span>
            </h1>
            <p className="text-xs text-slate-400">إدارة المستخدمين، الاشتراكات، الأجهزة، والمخططات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHome}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            الرجوع للموقع العام
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج الإدارة</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-64 bg-slate-900/60 border-l border-slate-800 p-4 space-y-1 shrink-0 overflow-y-auto hidden md:block">
          <div className="text-[11px] font-bold text-emerald-400 px-3 py-2 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>مركز استيراد البيانات الضخمة</span>
          </div>

          <button
            onClick={() => setActiveTab('datacenter')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'datacenter'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>استيراد وتغذية البيانات (Data Import)</span>
          </button>

          <div className="text-[11px] font-bold text-slate-400 px-3 py-2 mt-3 uppercase tracking-wider">
            إدارة الأعضاء والمالية
          </div>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>المستخدمين</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/20 font-mono">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'requests'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>طلبات الاشتراك</span>
            </div>
            {requests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold">
                {requests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'plans'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>باقات الاشتراكات</span>
          </button>

          <div className="text-[11px] font-bold text-slate-400 px-3 py-2 mt-4 uppercase tracking-wider">
            قاعدة بيانات المخططات
          </div>

          <button
            onClick={() => setActiveTab('brands')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'brands'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الشركات (Brands)</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'models'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>الموديلات والأجهزة</span>
          </button>

          <button
            onClick={() => setActiveTab('boards')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'boards'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>اللوحات والمخططات</span>
          </button>

          <button
            onClick={() => setActiveTab('components')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'components'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>القطع والـ Boardview</span>
          </button>

          <div className="text-[11px] font-bold text-slate-400 px-3 py-2 mt-4 uppercase tracking-wider">
            النظام والتنبيهات
          </div>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>إشعارات الفنيين</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات الإدارة</span>
          </button>
        </aside>

        {/* Workspace Display Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* TAB: DATA CENTER & BULK IMPORT */}
          {activeTab === 'datacenter' && (
            <AdminDataCenter onDataChanged={loadAllAdminData} />
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">إدارة المستخدمين والفنيين</h2>
                  <p className="text-xs text-slate-400">
                    عرض جميع الحسابات المسجلة برقم الهاتف، وتفعيل أو تعليق الاشتراكات.
                  </p>
                </div>
                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="بحث بالاسم أو برقم الهاتف..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">الاسم</th>
                      <th className="p-3.5">رقم الهاتف</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">الباقة الحالية</th>
                      <th className="p-3.5">انتهاء الاشتراك</th>
                      <th className="p-3.5">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users
                      .filter(
                        (u) =>
                          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.phone.includes(userSearch)
                      )
                      .map((u) => {
                        let statusColor = 'bg-slate-800 text-slate-300';
                        if (u.status === 'active') statusColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                        if (u.status === 'pending') statusColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                        if (u.status === 'suspended') statusColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                        if (u.status === 'expired') statusColor = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-slate-200">{u.name}</td>
                            <td className="p-3.5 font-mono text-slate-300" dir="ltr">{u.phone}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusColor}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300">
                              {u.currentPlanName || 'لا يوجد باقة'}
                            </td>
                            <td className="p-3.5 font-mono text-slate-400">
                              {u.subscriptionEnd
                                ? new Date(u.subscriptionEnd).toLocaleDateString('ar-EG')
                                : '-'}
                            </td>
                            <td className="p-3.5 flex items-center gap-1.5">
                              {u.status !== 'active' ? (
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, 'active')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-[11px] transition"
                                >
                                  تفعيل الحساب
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, 'suspended')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold text-[11px] transition"
                                >
                                  تعطيل الحساب
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const days = prompt('أدخل عدد الأيام لتمديد الاشتراك:', '30');
                                  if (days) {
                                    const start = new Date();
                                    const end = new Date();
                                    end.setDate(end.getDate() + parseInt(days));
                                    manualAssignSubscription(
                                      u.id,
                                      `يدوي (${days} يوم)`,
                                      start.toISOString(),
                                      end.toISOString()
                                    ).then(() => {
                                      loadAllAdminData();
                                    });
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                              >
                                اشتراك مخصص
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">طلبات الاشتراك الواردة</h2>
                <p className="text-xs text-slate-400">
                  مراجعة طلبات الفنيين وتفعيل فوري لحساباتهم بعد سداد قيمة الباقة.
                </p>
              </div>

              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                    لا توجد طلبات اشتراك مسجلة حالياً
                  </div>
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-100">{req.userName}</span>
                          <span className="font-mono text-xs text-slate-400" dir="ltr">
                            {req.userPhone}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                          <span>
                            الباقة: <strong className="text-slate-200">{req.planName}</strong>
                          </span>
                          <span>
                            السعر: <strong className="text-emerald-400 font-mono">${req.price} {req.currency}</strong>
                          </span>
                          <span>
                            تاريخ الطلب:{' '}
                            <span className="font-mono">
                              {new Date(req.requestedAt).toLocaleString('ar-EG')}
                            </span>
                          </span>
                        </div>
                        {req.notes && (
                          <p className="text-xs text-amber-300 mt-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            ملاحظات الفني: {req.notes}
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(req)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                          >
                            <Check className="w-4 h-4" />
                            <span>قبول وتفعيل الاشتراك</span>
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition"
                          >
                            <X className="w-4 h-4" />
                            <span>رفض</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: PLANS */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إدارة باقات الاشتراك</h2>
                <p className="text-xs text-slate-400">
                  إضافة وتعديل باقات الاشتراك التي تظهر في واجهة الفنيين مباشرة من قاعدة البيانات.
                </p>
              </div>

              {/* Add New Plan Form */}
              <form
                onSubmit={handleCreatePlan}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-200">إضافة باقة جديدة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      اسم الباقة
                    </label>
                    <input
                      type="text"
                      required
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="الباقة السنوية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      السعر بالدولار ($)
                    </label>
                    <input
                      type="number"
                      required
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      المدة بالأيام
                    </label>
                    <input
                      type="number"
                      required
                      value={newPlanDays}
                      onChange={(e) => setNewPlanDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      تسمية المدة (عرض)
                    </label>
                    <input
                      type="text"
                      required
                      value={newPlanLabel}
                      onChange={(e) => setNewPlanLabel(e.target.value)}
                      placeholder="سنة كاملة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      الوصف
                    </label>
                    <input
                      type="text"
                      value={newPlanDesc}
                      onChange={(e) => setNewPlanDesc(e.target.value)}
                      placeholder="مثالية لمراكز الصيانة الاحترافية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      المميزات (مفصولة بفاصلة ,)
                    </label>
                    <input
                      type="text"
                      value={newPlanFeatures}
                      onChange={(e) => setNewPlanFeatures(e.target.value)}
                      placeholder="تحميل المخططات, بوردفيو غير محدود, دعم فني"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الباقة لقاعدة البيانات</span>
                </button>
              </form>

              {/* Plans List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-100">{p.name}</h4>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          ${p.price}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                      <div className="text-xs text-slate-300 space-y-1 mt-3">
                        <p>المدة: <strong>{p.durationDays} يوم ({p.durationLabel})</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => {
                          deleteSubscriptionPlan(p.id);
                          setPlans(plans.filter((x) => x.id !== p.id));
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الباقة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BRANDS */}
          {activeTab === 'brands' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إدارة الشركات والمصنعين</h2>
                <p className="text-xs text-slate-400">
                  إضافة شركات الهواتف الذكية الحقيقية (Apple, Samsung, Xiaomi, etc.)
                </p>
              </div>

              {/* Add Brand */}
              <form
                onSubmit={handleCreateBrand}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 max-w-md"
              >
                <input
                  type="text"
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="اسم الشركة (مثال: Google Pixel, OnePlus...)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </form>

              {/* Brands Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {brands.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-200 text-xs">{b.name}</span>
                    <button
                      onClick={() => {
                        deleteBrand(b.id);
                        setBrands(brands.filter((x) => x.id !== b.id));
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      title="حذف الشركة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: MODELS */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إدارة موديلات وأجهزة الهواتف</h2>
                <p className="text-xs text-slate-400">
                  ربط الموديلات بالشركات وإدخال المواصفات الفنية الحقيقية (المعالج، الـ PMIC، المودم).
                </p>
              </div>

              {/* Select Brand */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-bold">الشركة المصنعة:</label>
                <select
                  value={selectedBrandForModels}
                  onChange={(e) => setSelectedBrandForModels(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Model Form */}
              <form
                onSubmit={handleCreateModel}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <h4 className="text-xs font-bold text-slate-300">إضافة موديل جديد لهذه الشركة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اسم الموديل</label>
                    <input
                      type="text"
                      required
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="iPhone 14 Pro"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رقم الموديل (Model Number)</label>
                    <input
                      type="text"
                      value={newModelNumber}
                      onChange={(e) => setNewModelNumber(e.target.value)}
                      placeholder="A2890"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">المعالج (CPU)</label>
                    <input
                      type="text"
                      value={newModelCpu}
                      onChange={(e) => setNewModelCpu(e.target.value)}
                      placeholder="Apple A16 Bionic"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">الـ PMIC الأساسي</label>
                    <input
                      type="text"
                      value={newModelPmic}
                      onChange={(e) => setNewModelPmic(e.target.value)}
                      placeholder="PM8550 / Apple Custom"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>حفظ الموديل</span>
                </button>
              </form>

              {/* Models List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-100">{m.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {m.modelNumber || 'رقم غير محدد'}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-300 space-y-0.5">
                        {m.technicalSpecs?.cpu && <div>CPU: {m.technicalSpecs.cpu}</div>}
                        {m.technicalSpecs?.pmic && <div>PMIC: {m.technicalSpecs.pmic}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        deleteModel(m.id);
                        setModels(models.filter((x) => x.id !== m.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BOARDS & SCHEMATICS */}
          {activeTab === 'boards' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إدارة لوحات الأم والـ Schematics</h2>
                <p className="text-xs text-slate-400">
                  ربط اللوحة الأم بالموديل، ورفع أو ربط ملفات PDF لمخططات الصيانة.
                </p>
              </div>

              {/* Select Model */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-bold">اختر الموديل:</label>
                <select
                  value={selectedModelForBoards}
                  onChange={(e) => setSelectedModelForBoards(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.modelNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Board Form */}
              <form
                onSubmit={handleCreateBoard}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">رقم البوردة (Board Number)</label>
                  <input
                    type="text"
                    required
                    value={newBoardNumber}
                    onChange={(e) => setNewBoardNumber(e.target.value)}
                    placeholder="820-02536"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الإصدار (Revision)</label>
                  <input
                    type="text"
                    value={newBoardRev}
                    onChange={(e) => setNewBoardRev(e.target.value)}
                    placeholder="REV 1.0"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة اللوحة</span>
                </button>
              </form>

              {/* Boards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-100 font-mono text-base">
                          {b.boardNumber}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {b.modelName} {b.revision ? `(${b.revision})` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          deleteBoard(b.id);
                          setBoards(boards.filter((x) => x.id !== b.id));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setTargetBoardForSchematic(b)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>إرفاق مخطط (Schematic)</span>
                      </button>
                      <span className="text-[11px] text-slate-400">
                        {b.hasSchematic ? '✅ مخطط متوفر' : '❌ بدون مخطط رسمي'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal for Attaching Schematic */}
              {targetBoardForSchematic && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">
                      ربط مخطط رسمي بـ ({targetBoardForSchematic.boardNumber})
                    </h3>
                    <form onSubmit={handleAddSchematic} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">عنوان المخطط</label>
                        <input
                          type="text"
                          required
                          value={schematicTitle}
                          onChange={(e) => setSchematicTitle(e.target.value)}
                          placeholder="مخطط الدوائر الرسمية - Full Schematic"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          رابط ملف الـ PDF (رابط التخزين المباشر)
                        </label>
                        <input
                          type="url"
                          required
                          value={schematicUrl}
                          onChange={(e) => setSchematicUrl(e.target.value)}
                          placeholder="https://.../schematic.pdf"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">اسم الملف</label>
                        <input
                          type="text"
                          value={schematicFileName}
                          onChange={(e) => setSchematicFileName(e.target.value)}
                          placeholder="iphone14pro_820_02536.pdf"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-3">
                        <button
                          type="submit"
                          className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                        >
                          حفظ وربط المخطط
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetBoardForSchematic(null)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: COMPONENTS & BOARDVIEW */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إدارة قطع ومكونات اللوحة (Boardview)</h2>
                <p className="text-xs text-slate-400">
                  إضافة الـ ICs والمكثفات والمقاومات مع إحداثياتها ونقاط توصيل المسارات الحقيقية.
                </p>
              </div>

              {/* Select Board */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-bold">اختر اللوحة:</label>
                <select
                  value={selectedBoardForHardware}
                  onChange={(e) => setSelectedBoardForHardware(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boardNumber} - {b.modelName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Component Form */}
              <form
                onSubmit={handleCreateComponent}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <h4 className="text-xs font-bold text-slate-300">إضافة مكون جديد للوحة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      الرمز (Reference)
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompRef}
                      onChange={(e) => setNewCompRef(e.target.value)}
                      placeholder="U1001"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">النوع</label>
                    <select
                      value={newCompType}
                      onChange={(e) => setNewCompType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    >
                      <option value="IC">IC (دائرة متكاملة)</option>
                      <option value="Capacitor">Capacitor (مكثف)</option>
                      <option value="Resistor">Resistor (مقاومة)</option>
                      <option value="Inductor">Inductor (ملف)</option>
                      <option value="Diode">Diode (دايود)</option>
                      <option value="Connector">Connector (كونيكتور)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      القيمة / الموديل
                    </label>
                    <input
                      type="text"
                      value={newCompValue}
                      onChange={(e) => setNewCompValue(e.target.value)}
                      placeholder="PM8550 أو 10uF 6.3V"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">الوجه (Layer)</label>
                    <select
                      value={newCompLayer}
                      onChange={(e) => setNewCompLayer(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                    >
                      <option value="top">Top (علوي)</option>
                      <option value="bottom">Bottom (سفلي)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      إحداثي X (من 0 إلى 100%)
                    </label>
                    <input
                      type="number"
                      value={newCompX}
                      onChange={(e) => setNewCompX(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      إحداثي Y (من 0 إلى 100%)
                    </label>
                    <input
                      type="number"
                      value={newCompY}
                      onChange={(e) => setNewCompY(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      المسارات المتصلة (مفصولة بفاصلة ,)
                    </label>
                    <input
                      type="text"
                      value={newCompNets}
                      onChange={(e) => setNewCompNets(e.target.value)}
                      placeholder="PP_VDD_MAIN, VCC_BATT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة المكون إلى اللوحة</span>
                </button>
              </form>

              {/* Components List for Board */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Value / Part</th>
                      <th className="p-3">Layer</th>
                      <th className="p-3">Pos (X, Y)</th>
                      <th className="p-3">Connected Nets</th>
                      <th className="p-3">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {boardComponents.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-emerald-400">{c.reference}</td>
                        <td className="p-3 font-mono text-slate-300">{c.type}</td>
                        <td className="p-3 font-mono text-slate-300">{c.value || '-'}</td>
                        <td className="p-3 font-mono uppercase text-slate-400">{c.layer}</td>
                        <td className="p-3 font-mono text-slate-400">{c.x}%, {c.y}%</td>
                        <td className="p-3 font-mono text-xs text-rose-300">
                          {c.connectedNets?.join(', ') || '-'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              deleteBoardComponent(c.id);
                              setBoardComponents(boardComponents.filter((x) => x.id !== c.id));
                            }}
                            className="text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إشعارات وتنبيهات الفنيين</h2>
                <p className="text-xs text-slate-400">
                  إرسال رسائل وتحديثات عامة أو خاصة بفئات معينة تظهر للمشتركين فور الدخول.
                </p>
              </div>

              {/* Add Notification Form */}
              <form
                onSubmit={handleCreateNotification}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-xl"
              >
                <h4 className="text-xs font-bold text-slate-300">إنشاء إشعار جديد</h4>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">عنوان الإشعار</label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="تمت إضافة مخططات سلسلة Galaxy S24 الجديدة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">نص الرسالة</label>
                  <textarea
                    required
                    rows={3}
                    value={notifMsg}
                    onChange={(e) => setNotifMsg(e.target.value)}
                    placeholder="يمكنكم الآن الوصول إلى مخططات الدوائر والـ Boardview التفاعلي..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">نوع الإشعار</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                  >
                    <option value="info">معلومة (Info)</option>
                    <option value="success">نجاح / تحديث (Success)</option>
                    <option value="warning">تنبيه هام (Warning)</option>
                    <option value="alert">عاجل (Alert)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>نشر الإشعار</span>
                </button>
              </form>

              {/* Notifications List */}
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm">{n.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-400">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                      <span className="text-[10px] text-slate-500 font-mono block mt-2">
                        {new Date(n.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        deleteNotification(n.id);
                        setNotifications(notifications.filter((x) => x.id !== n.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-md">
              <div>
                <h2 className="text-xl font-bold text-slate-100">إعدادات حساب الإدارة</h2>
                <p className="text-xs text-slate-400">
                  تغيير اسم المستخدم وكلمة المرور الخاصة ببوابة الإدارة وحفظها في قاعدة البيانات.
                </p>
              </div>

              {settingsStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  {settingsStatus}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم مستخدم الإدارة
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>تحديث كلمة مرور الإدارة</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
