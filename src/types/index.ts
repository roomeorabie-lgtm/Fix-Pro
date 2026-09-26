// FixBoard Core Types

export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'expired';

export interface UserProfile {
  id: string; // phone number or generated unique id
  name: string;
  phone: string;
  passwordHash: string; // stored hashed or encoded
  role: UserRole;
  status: UserStatus;
  currentPlanId?: string;
  currentPlanName?: string;
  subscriptionStart?: string; // ISO date
  subscriptionEnd?: string; // ISO date
  createdAt: string;
  lastLoginAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  durationLabel: string; // e.g. "شهر", "3 أشهر", "سنة"
  description: string;
  features: string[];
  active: boolean;
  order: number;
  createdAt: string;
}

export type SubscriptionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  planId: string;
  planName: string;
  durationDays: number;
  price: number;
  currency: string;
  status: SubscriptionRequestStatus;
  notes?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  targetPlanId?: string; // empty means all plans
  active: boolean;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string; // e.g. "Apple", "Samsung", "Xiaomi"
  slug: string;
  logoUrl?: string;
  deviceCount?: number;
  order?: number;
  createdAt: string;
}

export interface Series {
  id: string;
  brandId: string;
  name: string; // e.g. "iPhone", "Galaxy S", "Redmi Note"
  order?: number;
  createdAt: string;
}

export interface DeviceModel {
  id: string;
  brandId: string;
  seriesId: string;
  name: string; // e.g. "iPhone 14 Pro", "Galaxy S23 Ultra"
  modelNumber?: string; // e.g. "A2890", "SM-S918B"
  regionVariant?: string; // e.g. "Global", "US (eSIM)", "China"
  imageUrl?: string;
  boardCount?: number;
  technicalSpecs?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    modem?: string;
    pmic?: string;
    chargingIC?: string;
    audioIC?: string;
    displayIC?: string;
    touchIC?: string;
    wifiBluetoothIC?: string;
    rfICs?: string;
    notes?: string;
  };
  createdAt: string;
}

export interface Board {
  id: string;
  deviceId: string;
  modelName: string;
  boardNumber: string; // e.g. "820-02536", "SM-S918_MAIN_REV0.5"
  revision?: string;
  topImageUrl?: string;
  bottomImageUrl?: string;
  hasSchematic: boolean;
  hasBoardview: boolean;
  notes?: string;
  createdAt: string;
}

export interface SchematicDocument {
  id: string;
  boardId: string;
  deviceId: string;
  title: string;
  fileUrl: string; // Direct PDF URL or storage URL
  fileName: string;
  fileSize?: string;
  totalPages?: number;
  canDownload: boolean;
  notes?: string;
  createdAt: string;
}

export interface BoardviewPin {
  pinNumber: string | number;
  netName: string;
  x: number;
  y: number;
}

export interface BoardComponent {
  id: string;
  boardId: string;
  reference: string; // e.g. "U1001", "C2304", "R102", "L501"
  type: 'IC' | 'Capacitor' | 'Resistor' | 'Inductor' | 'Diode' | 'Connector' | 'TestPoint' | 'Crystal' | 'Other';
  value?: string; // e.g. "10uF 6.3V", "100k 1%", "PM8550"
  partNumber?: string;
  description?: string;
  location?: string;
  layer: 'top' | 'bottom';
  x: number; // 0 to 100 percentage or coordinate
  y: number; // 0 to 100 percentage or coordinate
  width?: number;
  height?: number;
  rotation?: number;
  datasheetUrl?: string;
  connectedNets?: string[];
  pins?: BoardviewPin[];
  notes?: string;
}

export interface BoardNet {
  id: string;
  boardId: string;
  name: string; // e.g. "PP_VDD_MAIN", "VCC_BATT", "I2C_SDA_PMIC"
  type?: 'power' | 'ground' | 'data' | 'clock' | 'control' | 'rf';
  voltage?: string; // e.g. "3.8V", "1.8V"
  sourceComponent?: string; // e.g. "U1001 (PMIC) Pin C4"
  connectedComponents: string[]; // references like ["U1001", "C1204", "L102"]
  notes?: string;
}

export interface TestPoint {
  id: string;
  boardId: string;
  reference: string; // e.g. "TP102", "JTAG_TMS"
  netName: string;
  layer: 'top' | 'bottom';
  x: number;
  y: number;
  expectedVoltage?: string;
  expectedDiodeValue?: string; // e.g. "0.450V"
  notes?: string;
}

export type ImportCategory = 'devices' | 'boards' | 'schematics' | 'boardviews' | 'components' | 'nets' | 'testpoints' | 'unified';

export interface ImportValidationIssue {
  row: number;
  identifier: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportPreviewItem {
  id?: string;
  brandName?: string;
  seriesName?: string;
  modelName: string;
  modelNumber?: string;
  boardNumber?: string;
  cpu?: string;
  pmic?: string;
  storage?: string;
  ram?: string;
  hasSchematic?: boolean;
  schematicUrl?: string;
  schematicFileName?: string;
  componentCount?: number;
  raw: Record<string, any>;
  status: 'valid' | 'duplicate' | 'invalid';
  validationMessage?: string;
}

export interface ImportBatchResult {
  totalProcessed: number;
  importedCount: number;
  skippedDuplicates: number;
  failedCount: number;
  errors: ImportValidationIssue[];
  timestamp: string;
  category: ImportCategory;
}

export interface ImportHistoryRecord {
  id: string;
  filename: string;
  category: ImportCategory;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  importedAt: string;
  performedBy: string;
}

