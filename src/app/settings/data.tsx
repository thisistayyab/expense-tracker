import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import {
  Button,
  Card,
  ScreenBackground,
  SectionHeader,
  Sheet,
  TactilePressable,
} from "../../components/ui";
import { DeleteAllSheet } from "../../features/settings/DeleteAllSheet";
import {
  exportBackup,
  exportCsv,
  readBackupFile,
  type ExportResult,
} from "../../features/settings/dataIO";
import { refreshReminders } from "../../features/recurring/reminders";
import { useAppLock } from "../../features/security/AppLockProvider";
import { LATEST_SCHEMA_VERSION } from "../../lib/db/migrate";
import { restoreDatabase, type RestoreMode } from "../../lib/db/repos/backup";
import { getSetting, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import {
  BACKUP_TABLES,
  validateBackup,
  type BackupCounts,
  type BackupPayload,
  type BackupTable,
} from "../../lib/domain/backup";
import { haptics } from "../../lib/haptics";
import { notifyLedgerReset } from "../../lib/ledgerEvents";
import { useOnboarding } from "../../lib/onboarding";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

type Preview = {
  fileName: string;
  payload: BackupPayload;
  counts: BackupCounts;
};

const TABLE_LABELS: Record<BackupTable, string> = {
  accounts: "Accounts",
  categories: "Categories",
  recurring_rules: "Recurring rules",
  transactions: "Transactions",
  budgets: "Budgets",
  category_rules: "Category rules",
  tags: "Tags",
  transaction_tags: "Tag links",
  attachments: "Attachments",
  settings: "Settings",
};

/**
 * Data screen (03 §13): export, lossless backup, validated restore with a preview,
 * and the typed reset. Restore never touches the database until the picked file
 * has passed `validateBackup`; a malformed file leaves everything as it was.
 */
export default function DataScreen() {
  const { theme, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const { reload } = useOnboarding();
  const { refresh: refreshAppLock } = useAppLock();
  const params = useLocalSearchParams<{ action?: string }>();
  const [activeTask, setActiveTask] = useState<"csv" | "backup" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [postRestoreLockRefresh, setPostRestoreLockRefresh] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const ranAction = useRef(false);
  const taskRef = useRef(false);
  const previewBusyRef = useRef(false);
  const busy = activeTask !== null;

  const applyExport = (result: ExportResult, label: string) => {
    setMessage(
      result.shared
        ? `${label}: ${result.rows.toLocaleString()} rows · ${result.fileName}`
        : `${label} saved at ${result.uri} (sharing is unavailable on this device).`,
    );
  };

  const runCsv = useCallback(async () => {
    if (taskRef.current) return;
    taskRef.current = true;
    setActiveTask("csv");
    setError(null);
    setMessage(null);
    try {
      applyExport(await exportCsv(db), "CSV export");
    } catch (cause) {
      setError(String(cause));
    } finally {
      taskRef.current = false;
      setActiveTask(null);
    }
  }, [db]);

  const runBackup = useCallback(async () => {
    if (taskRef.current) return;
    taskRef.current = true;
    setActiveTask("backup");
    setError(null);
    setMessage(null);
    try {
      const version = Constants.expoConfig?.version ?? "1.0.0";
      applyExport(await exportBackup(db, version), "Backup");
    } catch (cause) {
      setError(String(cause));
    } finally {
      taskRef.current = false;
      setActiveTask(null);
    }
  }, [db]);

  const runRestore = useCallback(async () => {
    if (taskRef.current) return;
    taskRef.current = true;
    setActiveTask("restore");
    setError(null);
    setMessage(null);
    try {
      const picked = await readBackupFile();
      if (!picked) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(picked.text);
      } catch {
        setError("That file is not valid JSON.");
        return;
      }

      const validation = validateBackup(parsed, LATEST_SCHEMA_VERSION);
      if (!validation.ok) {
        Alert.alert(
          "This backup cannot be restored",
          validation.errors.slice(0, 8).join("\n"),
          [{ text: "OK" }],
        );
        return;
      }

      setPreview({ fileName: picked.name, payload: validation.payload, counts: validation.counts });
      setPreviewVisible(true);
    } catch (cause) {
      setError(`Could not read the file: ${String(cause)}`);
    } finally {
      taskRef.current = false;
      setActiveTask(null);
    }
  }, []);

  const applyRestore = async (mode: RestoreMode) => {
    if (!preview || previewBusy || previewBusyRef.current) return;
    previewBusyRef.current = true;
    setPreviewBusy(true);
    try {
      await restoreDatabase(db, preview.payload, mode);
      await reload();
      const storedTheme = await getSetting(db, SETTING_KEYS.theme);
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setPreference(storedTheme);
      }
      await refreshReminders(db).catch(() => 0);
      haptics.success();
      setPostRestoreLockRefresh(true);
      setPreviewVisible(false);
      setMessage(
        mode === "replace"
          ? "Backup restored. Every table was replaced."
          : "Backup merged. Newer rows won; local-only rows stayed.",
      );
    } catch (cause) {
      setError(`Restore failed and nothing was changed: ${String(cause)}`);
    } finally {
      previewBusyRef.current = false;
      setPreviewBusy(false);
    }
  };

  const confirmReplace = () => {
    if (previewBusy || previewBusyRef.current) return;
    Alert.alert(
      "Replace all data?",
      "Every current row is deleted and replaced with the backup. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Replace", style: "destructive", onPress: () => void applyRestore("replace") },
      ],
    );
  };

  useEffect(() => {
    if (ranAction.current) return;
    ranAction.current = true;
    const action = params.action;
    if (!action) return;
    // The action comes from a settings row the user just tapped, so opening the
    // share sheet or the file picker is still an explicit gesture. Deferring by a
    // tick keeps the effect body free of synchronous state updates.
    const timer = setTimeout(() => {
      if (action === "csv") void runCsv();
      else if (action === "backup") void runBackup();
      else if (action === "restore") void runRestore();
      else if (action === "delete") setResetOpen(true);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.action]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        >
          <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
            Your data lives only on this device. Export a CSV for a spreadsheet, or a JSON backup
            that can restore every table exactly — including your region and currency.
          </Text>

          <SectionHeader title="Export" />
          <View style={{ gap: 10 }}>
            <Button
              label="Export CSV"
              leftIcon="share"
              onPress={() => void runCsv()}
              disabled={busy}
              loading={activeTask === "csv"}
            />
            <Button
              label="Backup everything (JSON)"
              variant="ghost"
              onPress={() => void runBackup()}
              disabled={busy}
              loading={activeTask === "backup"}
            />
          </View>

          <SectionHeader title="Restore" />
          <Card variant="glass" style={{ gap: 10 }}>
            <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
              Pick a backup file to preview its row counts. Nothing is written until you choose
              Replace or Merge.
            </Text>
            <Button
              label="Choose a backup file"
              variant="ghost"
              onPress={() => void runRestore()}
              disabled={busy}
              loading={activeTask === "restore"}
            />
          </Card>

          <SectionHeader title="Danger zone" />
          <TactilePressable
            onPress={() => setResetOpen(true)}
            disabled={busy}
            haptic="selection"
            scaleTo={0.97}
            radius={theme.radius.card}
            accessibilityRole="button"
            accessibilityLabel="Delete all data"
            style={{
              minHeight: 48,
              borderRadius: theme.radius.card,
              borderCurve: "continuous",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: `${theme.colors.danger}32`,
              backgroundColor: `${theme.colors.danger}16`,
              justifyContent: "center",
              alignItems: "center",
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={[theme.text.label, { color: theme.colors.danger, fontFamily: FONT_FAMILIES.bold }]}>
              Delete all data…
            </Text>
          </TactilePressable>

          {message ? (
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 16 }]}>
              {message}
            </Text>
          ) : null}
          {error ? (
            <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 12 }]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Sheet
        visible={previewVisible}
        dismissible={!previewBusy}
        onClose={() => (previewBusy ? undefined : setPreviewVisible(false))}
        onClosed={() => {
          if (!previewVisible) {
            setPreview(null);
            if (postRestoreLockRefresh) {
              setPostRestoreLockRefresh(false);
              void refreshAppLock();
            }
          }
        }}
        title="Restore preview"
        footer={
          preview ? (
            <View style={{ gap: 10 }}>
              <Button
                label="Merge into current data"
                variant="accent"
                onPress={() => void applyRestore("merge")}
                loading={previewBusy}
                disabled={previewBusy}
              />
              <Button
                label="Replace all data"
                variant="ghost"
                onPress={confirmReplace}
                disabled={previewBusy}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setPreviewVisible(false)}
                disabled={previewBusy}
              />
            </View>
          ) : undefined
        }
      >
        {preview ? (
          <>
            <Text
              style={[
                theme.text.body,
                {
                  color: theme.colors.textSecondary,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 10,
                },
              ]}
            >
              {preview.fileName} · schema v{preview.payload.schemaVersion} · exported{" "}
              {preview.payload.exportedAt.slice(0, 10)}
            </Text>
            <ScrollView
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            >
              {BACKUP_TABLES.map((table, index) => (
                <View
                  key={table}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderBottomWidth:
                      index === BACKUP_TABLES.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>
                    {TABLE_LABELS[table]}
                  </Text>
                  <Text
                    style={[
                      theme.text.body,
                      { color: theme.colors.textSecondary, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {preview.counts[table].toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
      </Sheet>

      <DeleteAllSheet
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        onDeleted={() => {
          notifyLedgerReset();
          setMessage("All rows were deleted; the starter library was recreated.");
        }}
      />
    </View>
  );
}
