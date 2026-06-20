import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativeAppRuntime } from "@/utils/is-native-app";

type ImpactLevel = "light" | "medium" | "heavy";
type NotificationLevel = "success" | "warning" | "error";

const IMPACT_STYLE: Record<ImpactLevel, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

const NOTIFICATION_TYPE: Record<NotificationLevel, NotificationType> = {
  success: NotificationType.Success,
  warning: NotificationType.Warning,
  error: NotificationType.Error,
};

export async function hapticImpact(level: ImpactLevel = "light"): Promise<void> {
  if (!isNativeAppRuntime()) {
    return;
  }

  try {
    await Haptics.impact({ style: IMPACT_STYLE[level] });
  } catch {
    // Native plugin unavailable or web fallback.
  }
}

export async function hapticSelection(): Promise<void> {
  if (!isNativeAppRuntime()) {
    return;
  }

  try {
    await Haptics.selectionChanged();
  } catch {
    // Native plugin unavailable or web fallback.
  }
}

export async function hapticNotification(
  type: NotificationLevel,
): Promise<void> {
  if (!isNativeAppRuntime()) {
    return;
  }

  try {
    await Haptics.notification({ type: NOTIFICATION_TYPE[type] });
  } catch {
    // Native plugin unavailable or web fallback.
  }
}
