import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Brand,
  Series,
  DeviceModel,
  Board,
  SchematicDocument,
  BoardComponent,
  BoardNet,
  TestPoint,
  ImportCategory,
  ImportBatchResult,
  ImportPreviewItem,
  ImportValidationIssue,
  ImportHistoryRecord
} from '../types';
import {
  VERIFIED_SMARTPHONE_CATALOG,
  VERIFIED_BOARD_COMPONENTS,
  VERIFIED_NETS,
  VERIFIED_TEST_POINTS,
  SeedDeviceEntry
} from '../data/verifiedSmartphoneCatalog';

/**
 * Parses raw file content (JSON or CSV) into structured preview items.
 * Performs rigorous client-side schema validation and identifies duplicates against existing records.
 */
export async function parseAndValidateImport(
  rawContent: string,
  category: ImportCategory
): Promise<{
  items: ImportPreviewItem[];
  issues: ImportValidationIssue[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
}> {
  let parsedRawRows: Record<string, any>[] = [];
  const issues: ImportValidationIssue[] = [];

  // 1. Try parsing JSON first
  const trimmed = rawContent.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      parsedRawRows = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e: any) {
      issues.push({
        row: 0,
        identifier: 'JSON Parser',
        message: `خطأ في صياغة ملف JSON: ${e.message}`,
        severity: 'error'
      });
      return { items: [], issues, validCount: 0, duplicateCount: 0, errorCount: 1 };
    }
  } else {
    // 2. Parse CSV (comma or semicolon delimited)
    parsedRawRows = parseCsv(trimmed);
    if (parsedRawRows.length === 0) {
      issues.push({
        row: 0,
        identifier: 'CSV Parser',
        message: 'تعذر قراءة أسطر البيانات من ملف CSV. يرجى التحقق من الرؤوس (Headers) والفاصلة.',
        severity: 'error'
      });
      return { items: [], issues, validCount: 0, duplicateCount: 0, errorCount: 1 };
    }
  }

  // Fetch existing models and boards to detect duplicates and relation anchors
  const [existingModelsSnap, existingBoardsSnap] = await Promise.all([
    getDocs(query(collection(db, 'models'), limit(200))),
    getDocs(query(collection(db, 'boards'), limit(200)))
  ]);

  const existingModelNames = new Set(
    existingModelsSnap.docs.map(d => (d.data().name || '').trim().toLowerCase())
  );
  const existingBoardNumbers = new Set(
    existingBoardsSnap.docs.map(d => (d.data().boardNumber || '').trim().toLowerCase())
  );

  const previewItems: ImportPreviewItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  parsedRawRows.forEach((row, index) => {
    const rowNum = index + 1;
    const modelName = (row.modelName || row.name || row.model || row['Model Name'] || '').trim();
    const boardNumber = (row.boardNumber || row.board || row['Board Number'] || row.boardNum || '').trim();
    const brandName = (row.brandName || row.brand || row['Brand'] || 'Generic').trim();
    const modelNumber = (row.modelNumber || row.model_no || row['Model Number'] || '').trim();
    const cpu = (row.cpu || row.processor || row['CPU'] || '').trim();
    const pmic = (row.pmic || row['PMIC'] || '').trim();
    const schematicUrl = (row.schematicUrl || row.schematic_url || row['Schematic URL'] || '').trim();
    const schematicFileName = (row.schematicFileName || row.fileName || row['File Name'] || '').trim();

    // Validation rules
    let status: ImportPreviewItem['status'] = 'valid';
    let validationMessage = '';

    if (!modelName && !boardNumber && !row.reference && !row.netName) {
      status = 'invalid';
      validationMessage = 'الصف لا يحتوي على اسم موديل أو رقم بوردة أو مكون صالح';
      issues.push({
        row: rowNum,
        identifier: `Row #${rowNum}`,
        message: validationMessage,
        severity: 'error'
      });
      errorCount++;
    } else if (modelName && existingModelNames.has(modelName.toLowerCase())) {
      status = 'duplicate';
      validationMessage = `الجهاز "${modelName}" موجود بالفعل في قاعدة البيانات (تم منع التكرار)`;
      issues.push({
        row: rowNum,
        identifier: modelName,
        field: 'modelName',
        message: validationMessage,
        severity: 'warning'
      });
      duplicateCount++;
    } else if (boardNumber && existingBoardNumbers.has(boardNumber.toLowerCase())) {
      status = 'duplicate';
      validationMessage = `رقم البوردة "${boardNumber}" مسجل مسبقاً (تم تجنب التكرار)`;
      issues.push({
        row: rowNum,
        identifier: boardNumber,
        field: 'boardNumber',
        message: validationMessage,
        severity: 'warning'
      });
      duplicateCount++;
    } else {
      validCount++;
    }

    previewItems.push({
      brandName,
      seriesName: row.seriesName || row.series || '',
      modelName: modelName || 'Unknown Device',
      modelNumber,
      boardNumber,
      cpu,
      pmic,
      storage: row.storage || row.rom || '',
      ram: row.ram || '',
      hasSchematic: !!schematicUrl || !!row.hasSchematic,
      schematicUrl,
      schematicFileName,
      raw: row,
      status,
      validationMessage
    });
  });

  return {
    items: previewItems,
    issues,
    validCount,
    duplicateCount,
    errorCount
  };
}

/**
 * Robust CSV parser supporting quotes, commas, and semi-colons
 */
function parseCsv(text: string): Record<string, any>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Determine delimiter: comma or semicolon or tab
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';

  const headers = splitCsvRow(headerLine, delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCsvRow(lines[i], delimiter);
    if (rawCols.length === 0) continue;
    const entry: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const val = rawCols[idx] !== undefined ? rawCols[idx].trim().replace(/^"|"$/g, '') : '';
      entry[h] = val;
    });
    results.push(entry);
  }

  return results;
}

function splitCsvRow(rowText: string, delimiter: string): string[] {
  const out: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < rowText.length; i++) {
    const c = rowText[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

/**
 * Executes a chunked Batch Write of validated preview items to Firestore.
 * Maintains relational hierarchy: Brand -> Series -> Model -> Board -> Schematics.
 * Firestore batch limits max 500 ops per commit.
 */
export async function executeImportBatch(
  previewItems: ImportPreviewItem[],
  category: ImportCategory,
  adminUsername = 'Admin'
): Promise<ImportBatchResult> {
  const validItems = previewItems.filter(item => item.status === 'valid');
  const duplicates = previewItems.filter(item => item.status === 'duplicate').length;
  const invalid = previewItems.filter(item => item.status === 'invalid').length;

  const result: ImportBatchResult = {
    totalProcessed: previewItems.length,
    importedCount: 0,
    skippedDuplicates: duplicates,
    failedCount: invalid,
    errors: [],
    timestamp: new Date().toISOString(),
    category
  };

  if (validItems.length === 0) {
    return result;
  }

  // 1. Get or create brands map
  const existingBrandsSnap = await getDocs(collection(db, 'brands'));
  const brandsByName = new Map<string, Brand>();
  existingBrandsSnap.docs.forEach(d => {
    const b = d.data() as Brand;
    brandsByName.set(b.name.trim().toLowerCase(), b);
  });

  // 2. Prepare chunks of items (each item may produce 1 model + 1 board + 1 schematic = 3 docs)
  // Max 100 items per batch to stay comfortably below 500 ops limit
  const CHUNK_SIZE = 80;

  for (let c = 0; c < validItems.length; c += CHUNK_SIZE) {
    const chunk = validItems.slice(c, c + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      try {
        const rawBrand = (item.brandName || 'Apple').trim();
        const brandKey = rawBrand.toLowerCase();
        let brandObj = brandsByName.get(brandKey);

        if (!brandObj) {
          const brandRef = doc(collection(db, 'brands'));
          brandObj = {
            id: brandRef.id,
            name: rawBrand,
            slug: rawBrand.toLowerCase().replace(/\s+/g, '-'),
            deviceCount: 1,
            createdAt: new Date().toISOString()
          };
          batch.set(brandRef, brandObj);
          brandsByName.set(brandKey, brandObj);
        }

        // 3. Create Model Doc
        const modelRef = doc(collection(db, 'models'));
        const modelData: DeviceModel = {
          id: modelRef.id,
          brandId: brandObj.id,
          seriesId: item.seriesName || '',
          name: item.modelName,
          modelNumber: item.modelNumber || '',
          regionVariant: item.raw.regionVariant || 'Global',
          technicalSpecs: {
            cpu: item.cpu || item.raw.cpu || '',
            pmic: item.pmic || item.raw.pmic || '',
            ram: item.ram || item.raw.ram || '',
            storage: item.storage || item.raw.storage || '',
            chargingIC: item.raw.chargingIC || '',
            audioIC: item.raw.audioIC || '',
            wifiBluetoothIC: item.raw.wifiBluetoothIC || '',
            rfICs: item.raw.rfICs || '',
            notes: item.raw.notes || ''
          },
          createdAt: new Date().toISOString()
        };
        batch.set(modelRef, modelData);

        // 4. Create Board Doc if board number exists
        const boardNum = item.boardNumber || `${item.modelName}_MAIN_REV1.0`;
        const boardRef = doc(collection(db, 'boards'));
        const boardData: Board = {
          id: boardRef.id,
          deviceId: modelRef.id,
          modelName: item.modelName,
          boardNumber: boardNum,
          revision: item.raw.boardRevision || 'REV 1.0',
          hasSchematic: !!item.schematicUrl || !!item.hasSchematic,
          hasBoardview: true,
          notes: item.raw.notes || '',
          createdAt: new Date().toISOString()
        };
        batch.set(boardRef, boardData);

        // 5. Create Schematic Doc if schematic info exists
        if (item.schematicUrl) {
          const schemRef = doc(collection(db, 'schematics'));
          const schemData: SchematicDocument = {
            id: schemRef.id,
            boardId: boardRef.id,
            deviceId: modelRef.id,
            title: item.schematicFileName || `${item.modelName} Schematic PDF`,
            fileUrl: item.schematicUrl,
            fileName: item.schematicFileName || `${item.modelName}_Schematic.pdf`,
            canDownload: true,
            createdAt: new Date().toISOString()
          };
          batch.set(schemRef, schemData);
        }

        result.importedCount++;
      } catch (err: any) {
        result.failedCount++;
        result.errors.push({
          row: c + 1,
          identifier: item.modelName,
          message: err.message || 'فشل إضافة العنصر أثناء معالجة Batch',
          severity: 'error'
        });
      }
    }

    // Commit batch
    await batch.commit();
  }

  // Log import history
  try {
    const historyRef = doc(collection(db, 'import_history'));
    const historyRecord: ImportHistoryRecord = {
      id: historyRef.id,
      filename: `Import_${category}_${new Date().toISOString().slice(0, 10)}.json`,
      category,
      totalRows: previewItems.length,
      imported: result.importedCount,
      skipped: result.skippedDuplicates,
      failed: result.failedCount,
      importedAt: new Date().toISOString(),
      performedBy: adminUsername
    };
    await setDoc(historyRef, historyRecord);
  } catch (e) {
    console.error('Failed to log import history:', e);
  }

  return result;
}

/**
 * Initializes and syncs the entire verified real-world catalog into Firestore.
 * Does NOT run automatically on every reload (preventing quota drain).
 * Only triggered explicitly via Admin Data Center!
 */
export async function seedVerifiedCatalogIntoFirestore(): Promise<ImportBatchResult> {
  const previewItems: ImportPreviewItem[] = VERIFIED_SMARTPHONE_CATALOG.map(entry => ({
    brandName: entry.brandName,
    seriesName: entry.seriesName,
    modelName: entry.modelName,
    modelNumber: entry.modelNumber,
    boardNumber: entry.boardNumber,
    cpu: entry.cpu,
    pmic: entry.pmic,
    ram: entry.ram,
    storage: entry.storage,
    hasSchematic: entry.hasSchematic,
    schematicUrl: entry.schematicUrl,
    schematicFileName: entry.schematicFileName,
    raw: entry,
    status: 'valid'
  }));

  // 1. Import all verified smartphone devices and boards
  const result = await executeImportBatch(previewItems, 'unified', 'FixBoard System Seed');

  // 2. Fetch created boards and insert verified Components, Nets & Test Points
  try {
    const boardsSnap = await getDocs(query(collection(db, 'boards'), limit(50)));
    const boardMap = new Map<string, string>(); // boardNumber -> boardId
    boardsSnap.docs.forEach(d => {
      const b = d.data() as Board;
      boardMap.set(b.boardNumber, d.id);
    });

    const hardwareBatch = writeBatch(db);

    // Seed verified components
    for (const comp of VERIFIED_BOARD_COMPONENTS) {
      const bId = boardMap.get(comp.boardNumber);
      if (bId) {
        const compRef = doc(collection(db, 'components'));
        const compData: BoardComponent = {
          id: compRef.id,
          boardId: bId,
          reference: comp.reference,
          type: comp.type,
          value: comp.value,
          partNumber: comp.partNumber,
          description: comp.description,
          layer: comp.layer,
          x: comp.x,
          y: comp.y,
          connectedNets: comp.connectedNets
        };
        hardwareBatch.set(compRef, compData);
      }
    }

    // Seed verified nets
    for (const net of VERIFIED_NETS) {
      const bId = boardMap.get(net.boardNumber);
      if (bId) {
        const netRef = doc(collection(db, 'nets'));
        const netData: BoardNet = {
          id: netRef.id,
          boardId: bId,
          name: net.name,
          type: net.type,
          connectedComponents: net.connectedComponents
        };
        hardwareBatch.set(netRef, netData);
      }
    }

    // Seed verified test points
    for (const tp of VERIFIED_TEST_POINTS) {
      const bId = boardMap.get(tp.boardNumber);
      if (bId) {
        const tpRef = doc(collection(db, 'test_points'));
        const tpData: TestPoint = {
          id: tpRef.id,
          boardId: bId,
          reference: tp.reference,
          netName: tp.netName,
          layer: tp.layer,
          x: tp.x,
          y: tp.y,
          expectedVoltage: tp.expectedVoltage,
          expectedDiodeValue: tp.expectedDiodeValue
        };
        hardwareBatch.set(tpRef, tpData);
      }
    }

    await hardwareBatch.commit();
  } catch (err) {
    console.error('Error seeding verified hardware components:', err);
  }

  return result;
}

/**
 * Gets import history records for audit and reporting
 */
export async function getImportHistory(): Promise<ImportHistoryRecord[]> {
  try {
    const q = query(collection(db, 'import_history'), orderBy('importedAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportHistoryRecord));
  } catch (e) {
    console.error('Error fetching import history:', e);
    return [];
  }
}
