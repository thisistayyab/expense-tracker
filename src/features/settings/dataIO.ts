import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { Db } from "../../lib/db/types";
import { LATEST_SCHEMA_VERSION } from "../../lib/db/migrate";
import { dumpDatabase } from "../../lib/db/repos/backup";
import { listTransactionsForExport } from "../../lib/db/repos/export";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupPayload,
} from "../../lib/domain/backup";
import { transactionsToCsv } from "../../lib/domain/csv";
import { toIsoDate } from "../../lib/domain/dates";

export type ExportResult = {
  fileName: string;
  rows: number;
  shared: boolean;
  uri: string;
};

function stamp(): string {
  return toIsoDate(new Date()).replace(/-/g, "");
}

async function writeAndShare(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle: string,
  uti: string,
): Promise<{ shared: boolean; uri: string }> {
  if (Platform.OS === "web") {
    throw new Error("File export is available in the mobile app; the data never leaves this device.");
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false, uri: file.uri };
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle,
    UTI: uti,
  });
  return { shared: true, uri: file.uri };
}

/** Every transaction, all currencies, signed amounts, Excel-safe BOM. */
export async function exportCsv(db: Db): Promise<ExportResult> {
  const rows = await listTransactionsForExport(db);
  const fileName = `expense-tracker-${stamp()}.csv`;
  const result = await writeAndShare(
    fileName,
    transactionsToCsv(rows),
    "text/csv",
    "Export transactions",
    "public.comma-separated-values-text",
  );
  return { fileName, rows: rows.length, ...result };
}

/** Lossless dump of every table, including settings and the schema version. */
export async function exportBackup(db: Db, appVersion: string): Promise<ExportResult> {
  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: LATEST_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    tables: await dumpDatabase(db),
  };
  const fileName = `expense-tracker-backup-${stamp()}.json`;
  const result = await writeAndShare(
    fileName,
    `${JSON.stringify(payload, null, 2)}\n`,
    "application/json",
    "Save backup",
    "public.json",
  );
  return { fileName, rows: Object.values(payload.tables).reduce((sum, rows) => sum + rows.length, 0), ...result };
}

/** Returns null when the picker is cancelled; parse/validation happens in the screen. */
export async function readBackupFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (Platform.OS === "web" && asset.file) {
    return { name: asset.name, text: await asset.file.text() };
  }

  const file = new File(asset.uri);
  return { name: asset.name, text: await file.text() };
}
