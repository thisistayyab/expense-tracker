import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";

import { listRecurringRules } from "../../lib/db/repos/recurring";
import type { Db } from "../../lib/db/types";
import { addDays, toIsoDate } from "../../lib/domain/dates";
import { firstDueOnOrAfter } from "../../lib/domain/recurrence";
import { formatMoney } from "../../lib/format/money";

export const BILLS_CHANNEL_ID = "bills";

export type ReminderPermission = "granted" | "denied" | "undetermined" | "unavailable";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // The channel must exist before the Android 13 permission prompt can appear.
  await Notifications.setNotificationChannelAsync(BILLS_CHANNEL_ID, {
    name: "Bill reminders",
    importance: AndroidImportance.HIGH,
  });
}

function mapPermission(status: Notifications.NotificationPermissionsStatus): ReminderPermission {
  const ios = status.ios?.status;
  if (ios) {
    if (
      ios === IosAuthorizationStatus.AUTHORIZED ||
      ios === IosAuthorizationStatus.PROVISIONAL ||
      ios === IosAuthorizationStatus.EPHEMERAL
    ) {
      return "granted";
    }
    if (ios === IosAuthorizationStatus.DENIED) return "denied";
    return "undetermined";
  }
  if (status.status === "granted") return "granted";
  if (status.status === "denied") return "denied";
  return "undetermined";
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === "web") return "unavailable";
  try {
    await ensureChannel();
    return mapPermission(await Notifications.getPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

/** Call only from a deliberate user action (a switch or a "Turn on" button). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === "web") return "unavailable";
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (mapPermission(current) === "granted") return "granted";
    return mapPermission(await Notifications.requestPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // A missing permission or a platform without scheduling is not an error the
    // rest of the app should surface; the in-app bills card still exists.
  }
}

/**
 * Replace the scheduled set with one notification per active rule that has a
 * lead time. Cancelling first keeps edits and backfills from leaving stale dates.
 * The in-app "Bills due" card is the primary reminder (R10); this is the extra.
 */
export async function refreshReminders(
  db: Db,
  today: string = toIsoDate(new Date()),
): Promise<number> {
  if (Platform.OS === "web") return 0;

  const permission = await getReminderPermission();
  await cancelReminders();
  if (permission !== "granted") return 0;

  const rules = await listRecurringRules(db);
  let scheduled = 0;

  for (const rule of rules) {
    // This channel is for bills. Income rules are still posted when due, but a
    // salary must not appear as a "Bill due soon".
    if (rule.type !== "expense") continue;
    if (rule.remindDays <= 0) continue;
    const due = firstDueOnOrAfter(rule, today);
    if (!due) continue;

    const reminderDate = addDays(due, -rule.remindDays);
    const at = new Date(`${reminderDate}T09:00:00`);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Bill due soon",
          body: `${rule.itemName ?? "A recurring bill"} · ${formatMoney(
            rule.amountMinor,
            rule.currency,
          )} due ${due}`,
          data: { url: "/settings/recurring" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: BILLS_CHANNEL_ID,
        },
      });
      scheduled += 1;
    } catch {
      // One bad rule must not stop the remaining reminders.
    }
  }

  return scheduled;
}
