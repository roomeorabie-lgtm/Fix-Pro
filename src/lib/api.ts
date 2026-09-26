import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  SubscriptionPlan,
  SubscriptionRequest,
  SubscriptionRequestStatus,
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

// ================= ADMIN CREDENTIALS CONFIG =================
// Initial administrative access configuration requested by user
export const INITIAL_ADMIN_CREDENTIALS = {
  username: "Fixfix",
  password: "Fix15112001"
};

// Check and get stored admin settings
export async function getAdminSettings(): Promise<{ username: string; passwordHash: string; siteTitle: string; maintenanceMode: boolean }> {
  try {
    const docRef = doc(db, 'settings', 'admin_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as any;
    } else {
      const initial = {
        username: INITIAL_ADMIN_CREDENTIALS.username,
        passwordHash: INITIAL_ADMIN_CREDENTIALS.password,
        siteTitle: 'FixBoard',
        maintenanceMode: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, initial);
      return initial;
    }
  } catch (err) {
    console.error('Error fetching admin config:', err);
    return {
      username: INITIAL_ADMIN_CREDENTIALS.username,
      passwordHash: INITIAL_ADMIN_CREDENTIALS.password,
      siteTitle: 'FixBoard',
      maintenanceMode: false
    };
  }
}

export async function updateAdminCredentials(newUsername: string, newPassword: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'admin_config');
    await updateDoc(docRef, {
      username: newUsername,
      passwordHash: newPassword,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error updating admin config:', err);
    return false;
  }
}

// ================= USER & AUTHENTICATION =================
export async function registerUser(name: string, phone: string, passwordHash: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
  try {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const userDocRef = doc(db, 'users', cleanPhone);
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      return { success: false, error: 'رقم الهاتف مسجل بالفعل مسبقاً.' };
    }

    const newUser: UserProfile = {
      id: cleanPhone,
      name: name.trim(),
      phone: cleanPhone,
      passwordHash,
      role: 'user',
      status: 'pending', // Pending admin approval or subscription
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    await setDoc(userDocRef, newUser);
    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Error registering user:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إنشاء الحساب' };
  }
}

export async function loginUser(phone: string, passwordHash: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
  try {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const userDocRef = doc(db, 'users', cleanPhone);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return { success: false, error: 'رقم الهاتف غير مسجل في النظام' };
    }

    const userData = userSnap.data() as UserProfile;
    if (userData.passwordHash !== passwordHash) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    // Check subscription expiration automatically
    let updatedStatus = userData.status;
    if (userData.subscriptionEnd) {
      const now = new Date();
      const end = new Date(userData.subscriptionEnd);
      if (now > end && userData.status === 'active') {
        updatedStatus = 'expired';
        await updateDoc(userDocRef, { status: 'expired' });
      }
    }

    // Update last login
    await updateDoc(userDocRef, {
      lastLoginAt: new Date().toISOString(),
      status: updatedStatus
    });

    return {
      success: true,
      user: { ...userData, status: updatedStatus, lastLoginAt: new Date().toISOString() }
    };
  } catch (err: any) {
    console.error('Error logging in:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Auto check expiration
      if (data.subscriptionEnd && data.status === 'active') {
        if (new Date() > new Date(data.subscriptionEnd)) {
          await updateDoc(doc(db, 'users', userId), { status: 'expired' });
          data.status = 'expired';
        }
      }
      return data;
    }
    return null;
  } catch (err) {
    console.error('Error getting profile:', err);
    return null;
  }
}

export async function getAllUsers(limitCount = 100): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (err) {
    console.error('Error getting users:', err);
    return [];
  }
}

export async function updateUserStatus(userId: string, status: UserProfile['status']): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', userId), { status });
    return true;
  } catch (err) {
    console.error('Error updating user status:', err);
    return false;
  }
}

// ================= SUBSCRIPTION PLANS =================
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const q = query(collection(db, 'subscription_plans'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Seed default initial plans if database is newly initialized
      return await seedInitialPlans();
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPlan));
  } catch (err) {
    console.error('Error fetching plans:', err);
    return [];
  }
}

async function seedInitialPlans(): Promise<SubscriptionPlan[]> {
  const initialPlans: Omit<SubscriptionPlan, 'id'>[] = [
    {
      name: 'الباقة الشهرية (1 شهر)',
      price: 15,
      currency: 'USD',
      durationDays: 30,
      durationLabel: '30 يوماً',
      description: 'مثالية لتجربة المنصة وصيانة الهواتف المعتادة',
      features: [
        'وصول كامل لجميع المخططات Schematics',
        'عرض وتكبير لوحات Boardview التفاعلية',
        'البحث الذكي عن القطع والمسارات',
        'تحديثات مستمرة للأجهزة الجديدة'
      ],
      active: true,
      order: 1,
      createdAt: new Date().toISOString()
    },
    {
      name: 'الباقة الربع سنوية (3 أشهر)',
      price: 39,
      currency: 'USD',
      durationDays: 90,
      durationLabel: '3 أشهر',
      description: 'الخيار الأكثر توفيراً لورش ومراكز الصيانة النشطة',
      features: [
        'كل ميزات الباقة الشهرية',
        'أولوية طلب المخططات الجديدة',
        'دعم فني سريع عبر المنصة',
        'توفير 15% مقارنة بالاشتراك الشهري'
      ],
      active: true,
      order: 2,
      createdAt: new Date().toISOString()
    },
    {
      name: 'الباقة النصف سنوية (6 أشهر)',
      price: 69,
      currency: 'USD',
      durationDays: 180,
      durationLabel: '6 أشهر',
      description: 'اشتراك احترافي مع مميزات متقدمة للفنيين المحترفين',
      features: [
        'وصول غير محدود لكافة الموديلات واللوحات',
        'تتبع مسارات الطاقة والبيانات كاملة',
        'تحميل ملفات PDF الرسمية المتاحة',
        'توفير 25% مع ترقية فورية'
      ],
      active: true,
      order: 3,
      createdAt: new Date().toISOString()
    },
    {
      name: 'الباقة السنوية (12 شهر)',
      price: 119,
      currency: 'USD',
      durationDays: 365,
      durationLabel: 'سنة كاملة',
      description: 'أفضل قيمة واستقرار مستمر لمركز الصيانة الخاص بك',
      features: [
        'وصول شامل طوال العام دون انقطاع',
        'وصول فوري لأحدث اللوحات المضافة أسبوعياً',
        'أعلى درجات الدعم والتحديثات',
        'توفير هائل يتجاوز 35%'
      ],
      active: true,
      order: 4,
      createdAt: new Date().toISOString()
    }
  ];

  const results: SubscriptionPlan[] = [];
  for (const plan of initialPlans) {
    const docRef = doc(collection(db, 'subscription_plans'));
    const fullPlan: SubscriptionPlan = { ...plan, id: docRef.id };
    await setDoc(docRef, fullPlan);
    results.push(fullPlan);
  }
  return results;
}

export async function createSubscriptionPlan(planData: Omit<SubscriptionPlan, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'subscription_plans'));
  await setDoc(docRef, {
    ...planData,
    id: docRef.id,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'subscription_plans', planId), updates);
    return true;
  } catch (err) {
    console.error('Error updating plan:', err);
    return false;
  }
}

export async function deleteSubscriptionPlan(planId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'subscription_plans', planId));
    return true;
  } catch (err) {
    console.error('Error deleting plan:', err);
    return false;
  }
}

// ================= SUBSCRIPTION REQUESTS & ASSIGNMENT =================
export async function createSubscriptionRequest(
  user: UserProfile,
  plan: SubscriptionPlan,
  notes?: string
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    // Check if there's already a pending request for this user
    const q = query(
      collection(db, 'subscription_requests'),
      where('userId', '==', user.id),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { success: false, error: 'لديك طلب اشتراك قيد المراجعة بالفعل من قبل الإدارة.' };
    }

    const docRef = doc(collection(db, 'subscription_requests'));
    const requestData: SubscriptionRequest = {
      id: docRef.id,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      price: plan.price,
      currency: plan.currency,
      status: 'pending',
      notes: notes || '',
      requestedAt: new Date().toISOString()
    };

    await setDoc(docRef, requestData);
    return { success: true, requestId: docRef.id };
  } catch (err: any) {
    console.error('Error creating subscription request:', err);
    return { success: false, error: err.message || 'فشل إرسال طلب الاشتراك' };
  }
}

export async function getSubscriptionRequests(statusFilter?: SubscriptionRequestStatus): Promise<SubscriptionRequest[]> {
  try {
    let q;
    if (statusFilter) {
      q = query(
        collection(db, 'subscription_requests'),
        where('status', '==', statusFilter),
        orderBy('requestedAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'subscription_requests'),
        orderBy('requestedAt', 'desc'),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionRequest));
  } catch (err) {
    console.error('Error fetching subscription requests:', err);
    return [];
  }
}

export async function approveSubscriptionRequest(
  request: SubscriptionRequest,
  customDurationDays?: number,
  customStartDate?: string,
  customEndDate?: string
): Promise<boolean> {
  try {
    const days = customDurationDays || request.durationDays;
    const start = customStartDate ? new Date(customStartDate) : new Date();
    let end: Date;
    if (customEndDate) {
      end = new Date(customEndDate);
    } else {
      end = new Date(start);
      end.setDate(end.getDate() + days);
    }

    const userDocRef = doc(db, 'users', request.userId);
    const reqDocRef = doc(db, 'subscription_requests', request.id);

    // Update user profile
    await updateDoc(userDocRef, {
      status: 'active',
      currentPlanId: request.planId,
      currentPlanName: request.planName,
      subscriptionStart: start.toISOString(),
      subscriptionEnd: end.toISOString()
    });

    // Update request
    await updateDoc(reqDocRef, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Admin'
    });

    return true;
  } catch (err) {
    console.error('Error approving subscription:', err);
    return false;
  }
}

export async function rejectSubscriptionRequest(requestId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'subscription_requests', requestId), {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Admin'
    });
    return true;
  } catch (err) {
    console.error('Error rejecting subscription:', err);
    return false;
  }
}

export async function manualAssignSubscription(
  userId: string,
  planName: string,
  startDate: string,
  endDate: string,
  status: UserProfile['status'] = 'active'
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      status,
      currentPlanName: planName,
      subscriptionStart: new Date(startDate).toISOString(),
      subscriptionEnd: new Date(endDate).toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error manually assigning subscription:', err);
    return false;
  }
}

// ================= NOTIFICATIONS =================
export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

export async function createNotification(notif: Omit<NotificationItem, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'notifications'));
  await setDoc(docRef, {
    ...notif,
    id: docRef.id,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateNotification(notifId: string, updates: Partial<NotificationItem>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), updates);
    return true;
  } catch (err) {
    console.error('Error updating notification:', err);
    return false;
  }
}

export async function deleteNotification(notifId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
    return true;
  } catch (err) {
    console.error('Error deleting notification:', err);
    return false;
  }
}

// ================= BRANDS, SERIES, MODELS, BOARDS =================
export async function getBrands(): Promise<Brand[]> {
  try {
    const q = query(collection(db, 'brands'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return await seedInitialBrands();
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Brand));
  } catch (err) {
    console.error('Error fetching brands:', err);
    return [];
  }
}

async function seedInitialBrands(): Promise<Brand[]> {
  // Real structured smartphone manufacturers
  const initialBrands = [
    { name: 'Apple', slug: 'apple', order: 1 },
    { name: 'Samsung', slug: 'samsung', order: 2 },
    { name: 'Xiaomi', slug: 'xiaomi', order: 3 },
    { name: 'Huawei', slug: 'huawei', order: 4 },
    { name: 'OPPO', slug: 'oppo', order: 5 },
    { name: 'Vivo', slug: 'vivo', order: 6 },
    { name: 'Realme', slug: 'realme', order: 7 },
    { name: 'OnePlus', slug: 'oneplus', order: 8 },
    { name: 'Google Pixel', slug: 'google-pixel', order: 9 },
    { name: 'Honor', slug: 'honor', order: 10 },
    { name: 'Infinix', slug: 'infinix', order: 11 },
    { name: 'Tecno', slug: 'tecno', order: 12 },
    { name: 'POCO', slug: 'poco', order: 13 },
    { name: 'Redmi', slug: 'redmi', order: 14 },
    { name: 'Motorola', slug: 'motorola', order: 15 },
    { name: 'Sony', slug: 'sony', order: 16 },
    { name: 'Nokia', slug: 'nokia', order: 17 }
  ];

  const results: Brand[] = [];
  for (const b of initialBrands) {
    const docRef = doc(collection(db, 'brands'));
    const item: Brand = {
      ...b,
      id: docRef.id,
      deviceCount: 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, item);
    results.push(item);
  }
  return results;
}

export async function createBrand(name: string, slug?: string, logoUrl?: string): Promise<string> {
  const docRef = doc(collection(db, 'brands'));
  const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
  await setDoc(docRef, {
    id: docRef.id,
    name,
    slug: finalSlug,
    logoUrl: logoUrl || '',
    deviceCount: 0,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteBrand(brandId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'brands', brandId));
    return true;
  } catch (err) {
    console.error('Error deleting brand:', err);
    return false;
  }
}

// SERIES
export async function getSeriesByBrand(brandId: string): Promise<Series[]> {
  try {
    const q = query(
      collection(db, 'series'),
      where('brandId', '==', brandId),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Series));
  } catch (err) {
    console.error('Error fetching series:', err);
    return [];
  }
}

export async function createSeries(brandId: string, name: string): Promise<string> {
  const docRef = doc(collection(db, 'series'));
  await setDoc(docRef, {
    id: docRef.id,
    brandId,
    name,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteSeries(seriesId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'series', seriesId));
    return true;
  } catch (err) {
    console.error('Error deleting series:', err);
    return false;
  }
}

// MODELS
export async function getModelsByBrand(brandId: string, seriesId?: string): Promise<DeviceModel[]> {
  try {
    let q;
    if (seriesId) {
      q = query(
        collection(db, 'models'),
        where('brandId', '==', brandId),
        where('seriesId', '==', seriesId),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'models'),
        where('brandId', '==', brandId),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DeviceModel));
  } catch (err) {
    console.error('Error fetching models:', err);
    return [];
  }
}

export async function getModelById(modelId: string): Promise<DeviceModel | null> {
  try {
    const snap = await getDoc(doc(db, 'models', modelId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as DeviceModel;
    }
    return null;
  } catch (err) {
    console.error('Error fetching model by id:', err);
    return null;
  }
}

export async function createModel(modelData: Omit<DeviceModel, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'models'));
  await setDoc(docRef, {
    ...modelData,
    id: docRef.id,
    boardCount: 0,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateModel(modelId: string, updates: Partial<DeviceModel>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'models', modelId), updates);
    return true;
  } catch (err) {
    console.error('Error updating model:', err);
    return false;
  }
}

export async function deleteModel(modelId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'models', modelId));
    return true;
  } catch (err) {
    console.error('Error deleting model:', err);
    return false;
  }
}

// BOARDS
export async function getBoardsByDevice(deviceId: string): Promise<Board[]> {
  try {
    const q = query(
      collection(db, 'boards'),
      where('deviceId', '==', deviceId),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Board));
  } catch (err) {
    console.error('Error fetching boards:', err);
    return [];
  }
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  try {
    const snap = await getDoc(doc(db, 'boards', boardId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Board;
    }
    return null;
  } catch (err) {
    console.error('Error fetching board:', err);
    return null;
  }
}

export async function createBoard(boardData: Omit<Board, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'boards'));
  await setDoc(docRef, {
    ...boardData,
    id: docRef.id,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateBoard(boardId: string, updates: Partial<Board>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'boards', boardId), updates);
    return true;
  } catch (err) {
    console.error('Error updating board:', err);
    return false;
  }
}

export async function deleteBoard(boardId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'boards', boardId));
    return true;
  } catch (err) {
    console.error('Error deleting board:', err);
    return false;
  }
}

// SCHEMATICS
export async function getSchematicsByBoard(boardId: string): Promise<SchematicDocument[]> {
  try {
    const q = query(
      collection(db, 'schematics'),
      where('boardId', '==', boardId),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SchematicDocument));
  } catch (err) {
    console.error('Error fetching schematics:', err);
    return [];
  }
}

export async function getSchematicsByDevice(deviceId: string): Promise<SchematicDocument[]> {
  try {
    const q = query(
      collection(db, 'schematics'),
      where('deviceId', '==', deviceId),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SchematicDocument));
  } catch (err) {
    console.error('Error fetching device schematics:', err);
    return [];
  }
}

export async function createSchematic(docData: Omit<SchematicDocument, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'schematics'));
  await setDoc(docRef, {
    ...docData,
    id: docRef.id,
    createdAt: new Date().toISOString()
  });
  // Update board indicator
  try {
    await updateDoc(doc(db, 'boards', docData.boardId), { hasSchematic: true });
  } catch (e) {
    // board might not exist or optional
  }
  return docRef.id;
}

export async function deleteSchematic(schematicId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'schematics', schematicId));
    return true;
  } catch (err) {
    console.error('Error deleting schematic:', err);
    return false;
  }
}

// COMPONENTS
export async function getComponentsByBoard(boardId: string, layer?: 'top' | 'bottom'): Promise<BoardComponent[]> {
  try {
    let q;
    if (layer) {
      q = query(
        collection(db, 'components'),
        where('boardId', '==', boardId),
        where('layer', '==', layer),
        limit(200)
      );
    } else {
      q = query(
        collection(db, 'components'),
        where('boardId', '==', boardId),
        limit(300)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardComponent));
  } catch (err) {
    console.error('Error fetching components:', err);
    return [];
  }
}

export async function createBoardComponent(compData: Omit<BoardComponent, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'components'));
  await setDoc(docRef, {
    ...compData,
    id: docRef.id
  });
  return docRef.id;
}

export async function deleteBoardComponent(compId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'components', compId));
    return true;
  } catch (err) {
    console.error('Error deleting component:', err);
    return false;
  }
}

// NETS
export async function getNetsByBoard(boardId: string): Promise<BoardNet[]> {
  try {
    const q = query(
      collection(db, 'nets'),
      where('boardId', '==', boardId),
      limit(150)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardNet));
  } catch (err) {
    console.error('Error fetching nets:', err);
    return [];
  }
}

export async function createBoardNet(netData: Omit<BoardNet, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'nets'));
  await setDoc(docRef, {
    ...netData,
    id: docRef.id
  });
  return docRef.id;
}

export async function deleteBoardNet(netId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'nets', netId));
    return true;
  } catch (err) {
    console.error('Error deleting net:', err);
    return false;
  }
}

// TEST POINTS
export async function getTestPointsByBoard(boardId: string, layer?: 'top' | 'bottom'): Promise<TestPoint[]> {
  try {
    let q;
    if (layer) {
      q = query(
        collection(db, 'test_points'),
        where('boardId', '==', boardId),
        where('layer', '==', layer),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'test_points'),
        where('boardId', '==', boardId),
        limit(100)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TestPoint));
  } catch (err) {
    console.error('Error fetching test points:', err);
    return [];
  }
}

export async function createTestPoint(tpData: Omit<TestPoint, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'test_points'));
  await setDoc(docRef, {
    ...tpData,
    id: docRef.id
  });
  return docRef.id;
}

// ================= GLOBAL SEARCH =================
export interface GlobalSearchResult {
  type: 'device' | 'component' | 'net' | 'board';
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  deviceId?: string;
  boardId?: string;
  metadata?: any;
}

export async function performGlobalSearch(queryText: string): Promise<GlobalSearchResult[]> {
  const term = queryText.trim().toLowerCase();
  if (!term || term.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  try {
    // 1. Search Models
    const modelsSnap = await getDocs(query(collection(db, 'models'), limit(40)));
    modelsSnap.forEach(d => {
      const data = d.data() as DeviceModel;
      const name = (data.name || '').toLowerCase();
      const modelNum = (data.modelNumber || '').toLowerCase();
      const region = (data.regionVariant || '').toLowerCase();
      const cpu = (data.technicalSpecs?.cpu || '').toLowerCase();
      const pmic = (data.technicalSpecs?.pmic || '').toLowerCase();

      if (name.includes(term) || modelNum.includes(term) || region.includes(term) || cpu.includes(term) || pmic.includes(term)) {
        results.push({
          type: 'device',
          id: data.id,
          title: data.name,
          subtitle: `موديل: ${data.modelNumber || 'N/A'} • ${data.regionVariant || 'إصدار عالمي'}`,
          badge: 'جهاز',
          deviceId: data.id,
          metadata: data
        });
      }
    });

    // 2. Search Boards
    const boardsSnap = await getDocs(query(collection(db, 'boards'), limit(30)));
    boardsSnap.forEach(d => {
      const data = d.data() as Board;
      const bNum = (data.boardNumber || '').toLowerCase();
      const mName = (data.modelName || '').toLowerCase();
      if (bNum.includes(term) || mName.includes(term)) {
        results.push({
          type: 'board',
          id: data.id,
          title: `بوردة ${data.boardNumber}`,
          subtitle: `${data.modelName} ${data.revision ? `(Rev ${data.revision})` : ''}`,
          badge: 'لوحة أم (Board)',
          boardId: data.id,
          deviceId: data.deviceId,
          metadata: data
        });
      }
    });

    // 3. Search Components
    const compSnap = await getDocs(query(collection(db, 'components'), limit(50)));
    compSnap.forEach(d => {
      const data = d.data() as BoardComponent;
      const ref = (data.reference || '').toLowerCase();
      const val = (data.value || '').toLowerCase();
      const part = (data.partNumber || '').toLowerCase();
      const desc = (data.description || '').toLowerCase();

      if (ref.includes(term) || val.includes(term) || part.includes(term) || desc.includes(term)) {
        results.push({
          type: 'component',
          id: data.id,
          title: `${data.reference} (${data.type})`,
          subtitle: `${data.value || data.partNumber || data.description || 'مكون إلكتروني'} • طبقة: ${data.layer}`,
          badge: 'مكون (Component)',
          boardId: data.boardId,
          metadata: data
        });
      }
    });

    // 4. Search Nets
    const netsSnap = await getDocs(query(collection(db, 'nets'), limit(50)));
    netsSnap.forEach(d => {
      const data = d.data() as BoardNet;
      const name = (data.name || '').toLowerCase();
      const type = (data.type || '').toLowerCase();
      if (name.includes(term) || type.includes(term)) {
        results.push({
          type: 'net',
          id: data.id,
          title: data.name,
          subtitle: `مسار ${data.type || 'إشارة'} • متصل بـ ${data.connectedComponents?.length || 0} عنصر`,
          badge: 'مسار (Net)',
          boardId: data.boardId,
          metadata: data
        });
      }
    });

  } catch (err) {
    console.error('Error during global search:', err);
  }

  return results.slice(0, 25);
}
