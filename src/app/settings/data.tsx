import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";

import { Button, Card, SectionHeader, Sheet } from "../../components/ui";
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
import { useOnboarding } from "../../lib/onboarding";
import { useTheme } from "../../lib/theme";

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
  const db: Db = useSQLiteContext();
  const { reload } = useOnboarding();
  const { refresh: refreshAppLock } = useAppLock();
  const params = useLocalSearchParams<{ action?: string }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const ranAction = useRef(false);

  const applyExport = (result: ExportResult, label: string) => {
    setMessage(
      result.shared
        ? `${label}: ${result.rows.toLocaleString()} rows · ${result.fileName}`
        : `${label} saved at ${result.uri} (sharing is unavailable on this device).`,
    );
  };

  const runCsv = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      applyExport(await exportCsv(db), "CSV export");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }, [db]);

  const runBackup = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const version = Constants.expoConfig?.version ?? "1.0.0";
      applyExport(await exportBackup(db, version), "Backup");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }, [db]);

  const runRestore = useCallback(async () => {
    setBusy(true);
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
    } catch (cause) {
      setError(`Could not read the file: ${String(cause)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const applyRestore = async (mode: RestoreMode) => {
    if (!preview || previewBusy) return;
    setPreviewBusy(true);
    try {
      await restoreDatabase(db, preview.payload, mode);
      await reload();
      await refreshAppLock();
      const storedTheme = await getSetting(db, SETTING_KEYS.theme);
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setPreference(storedTheme);
      }
      await refreshReminders(db).catch(() => 0);
      haptics.success();
      setPreview(null);
      setMessage(
        mode === "replace"
          ? "Backup restored. Every table was replaced."
          : "Backup merged. Newer rows won; local-only rows stayed.",
      );
    } catch (cause) {
      setError(`Restore failed and nothing was changed: ${String(cause)}`);
    } finally {
      setPreviewBusy(false);
    }
  };

  const confirmReplace = () => {
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Your data lives only on this device. Export a CSV for a spreadsheet, or a JSON backup
          that can restore every table exactly — including your region and currency.
        </Text>

        <SectionHeader title="Export" />
        <View style={{ gap: 10 }}>
          <Button label="Export CSV" onPress={() => void runCsv()} disabled={busy} loading={busy} />
          <Button
            label="Backup everything (JSON)"
            variant="ghost"
            onPress={() => void runBackup()}
            disabled={busy}
          />
        </View>

        <SectionHeader title="Restore" />
        <Card style={{ gap: 10 }}>
          <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
            Pick a backup file to preview its row counts. Nothing is written until you choose
            Replace or Merge.
          </Text>
          <Button
            label="Choose a backup file"
            variant="ghost"
            onPress={() => void runRestore()}
            disabled={busy}
          />
        </Card>

        <SectionHeader title="Danger zone" />
        <Pressable
          onPress={() => setResetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete all data"
          style={({ pressed }) => ({
            minHeight: 46,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[theme.text.label, { color: theme.colors.danger }]}>Delete all data…</Text>
        </Pressable>

        {busy ? <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 14 }} /> : null}

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

      <Sheet
        visible={Boolean(preview)}
        onClose={() => (previewBusy ? undefined : setPreview(null))}
        title="Restore preview"
      >
        {preview ? (
          <>
            <Text
              style={[
                theme.text.body,
                { color: theme.colors.textSecondary, paddingHorizontal: 20, paddingBottom: 10 },
              ]}
            >
              {preview.fileName} · schema v{preview.payload.schemaVersion} · exported{" "}
              {preview.payload.exportedAt.slice(0, 10)}
            </Text>
            <ScrollView style={{ maxHeight: 260, paddingHorizontal: 20 }}>
              {BACKUP_TABLES.map((table) => (
                <View
                  key={table}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 7,
                    borderBottomWidth: 1,
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
            <View style={{ padding: 20, gap: 10 }}>
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
                onPress={() => setPreview(null)}
                disabled={previewBusy}
              />
            </View>
          </>
        ) : null}
      </Sheet>

      <DeleteAllSheet
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        onDeleted={() => setMessage("All rows were deleted; the starter library was recreated.")}
      />
    </View>
  );
}
