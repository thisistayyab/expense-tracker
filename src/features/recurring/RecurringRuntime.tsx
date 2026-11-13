import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import type { Db } from "../../lib/db/types";
import { processDueRecurring } from "./processDue";
import { refreshReminders } from "./reminders";

/**
 * Foreground-only recurring work, mounted once under the signed-in shell.
 *
 * Posting happens on launch and every return to the foreground — never in the
 * background or on a timer (ADR-009). A tapped bill reminder opens the recurring
 * screen; it never opens the add sheet or a keyboard on launch (ADR-010).
 */
export function RecurringRuntime() {
  if (Platform.OS === "web") return null;
  return <NativeRecurringRuntime />;
}

function NativeRecurringRuntime() {
  const db: Db = useSQLiteContext();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    const url = response.notification.request.content.data?.url;
    if (typeof url !== "string" || !url.startsWith("/")) return;

    router.push(url as Href);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [response]);

  useEffect(() => {
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        await processDueRecurring(db);
        await refreshReminders(db);
      } catch (cause) {
        if (__DEV__) console.warn("[recurring] foreground run failed", cause);
      } finally {
        running = false;
      }
    };

    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });
    return () => subscription.remove();
  }, [db]);

  return null;
}
