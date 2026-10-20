import { isValidElement, type ReactNode } from "react";
import type { Action, ExternalToast, toast } from "sonner";
import {
  APP_TOAST_FORWARDED_OPTION_KEYS,
  appToast,
  type AppToastOptions,
  type AppToastTone,
} from "@/components/ui/app-toast";
import { recordNotification } from "./notification-store";

type SonnerToast = typeof toast;
type ToastMessage = ReactNode | (() => ReactNode);
type ToastMethod = (
  message: ToastMessage,
  data?: ExternalToast,
) => string | number;

function isAction(value: unknown): value is Action {
  return (
    typeof value === "object" &&
    value !== null &&
    !isValidElement(value) &&
    "label" in value &&
    "onClick" in value &&
    typeof value.onClick === "function"
  );
}

function forwardOption<Key extends keyof ExternalToast>(
  options: Pick<ExternalToast, Key>,
  data: ExternalToast,
  key: Key,
): void {
  options[key] = data[key];
}

function appToastOptions(
  data: ExternalToast | undefined,
): AppToastOptions | null {
  if (data === undefined) {
    return {};
  }
  const { action, cancel, description, icon } = data;
  if (
    icon !== undefined ||
    typeof description === "function" ||
    (action !== undefined && !isAction(action)) ||
    (cancel !== undefined && !isAction(cancel))
  ) {
    return null;
  }
  const options: AppToastOptions = { action, cancel, description };
  for (const key of APP_TOAST_FORWARDED_OPTION_KEYS) {
    if (data[key] !== undefined) {
      forwardOption(options, data, key);
    }
  }
  return options;
}

function recordSonnerToast(
  tone: AppToastTone,
  message: ToastMessage,
  data: ExternalToast | undefined,
): void {
  if (tone === "loading" || typeof message === "function") {
    return;
  }
  const description = data?.description;
  recordNotification({
    toastId: data?.id ?? null,
    tone,
    title: message,
    description:
      description === undefined || typeof description === "function"
        ? null
        : description,
    createdAt: Date.now(),
  });
}

function routeToAppToast(
  tone: AppToastTone,
  sonnerMethod: ToastMethod,
): ToastMethod {
  return (message, data) => {
    if (typeof message !== "function") {
      const options = appToastOptions(data);
      if (options !== null) {
        return appToast[tone](message, options);
      }
    }
    recordSonnerToast(tone, message, data);
    return sonnerMethod(message, data);
  };
}

export function createPluginToast(baseToast: SonnerToast): SonnerToast {
  return Object.assign(
    routeToAppToast("message", (message, data) => baseToast(message, data)),
    baseToast,
    {
      success: routeToAppToast("success", (message, data) =>
        baseToast.success(message, data),
      ),
      info: routeToAppToast("message", (message, data) =>
        baseToast.info(message, data),
      ),
      warning: routeToAppToast("warning", (message, data) =>
        baseToast.warning(message, data),
      ),
      error: routeToAppToast("error", (message, data) =>
        baseToast.error(message, data),
      ),
      message: routeToAppToast("message", (message, data) =>
        baseToast.message(message, data),
      ),
      loading: routeToAppToast("loading", (message, data) =>
        baseToast.loading(message, data),
      ),
      dismiss: (id?: number | string) => {
        appToast.dismiss(id);
        return id;
      },
    },
  );
}
