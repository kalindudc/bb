// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachSonnerToast } from "@/components/ui/app-toast-runtime";
import { getNotifications, resetNotificationStore } from "./notification-store";
import { createPluginToast } from "./plugin-toast";

beforeEach(() => {
  resetNotificationStore();
  attachSonnerToast(toast);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  toast.dismiss();
});

describe("plugin toasts", () => {
  it("render as bb's toast and are recorded once", () => {
    const custom = vi.spyOn(toast, "custom");
    const warning = vi.spyOn(toast, "warning");
    const onClick = vi.fn();

    createPluginToast(toast).warning("Over budget", {
      id: "over:1",
      description: "$12.40 of the $10 thread budget",
      action: { label: "Open thread", onClick },
      duration: Infinity,
    });

    expect(warning).not.toHaveBeenCalled();
    expect(custom).toHaveBeenCalledTimes(1);
    const [content, options] = custom.mock.calls[0]!;
    expect(options).toMatchObject({
      id: "over:1",
      duration: Infinity,
      className: "bb-app-toast",
    });
    render(content("over:1"));
    expect(
      screen.getByRole("button", { name: "Dismiss notification" }),
    ).toBeDefined();
    const action = screen.getByRole("button", { name: "Open thread" });
    expect(action.classList.contains("underline")).toBe(true);
    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(getNotifications()).toMatchObject([
      {
        tone: "warning",
        title: "Over budget",
        description: "$12.40 of the $10 thread budget",
      },
    ]);
  });

  it("route loading, its result, info, plain calls, and dismiss through bb's toast", () => {
    const custom = vi.spyOn(toast, "custom");
    const dismiss = vi.spyOn(toast, "dismiss");
    const pluginToast = createPluginToast(toast);

    const id = pluginToast.loading("Cleaning up", { id: "cleanup" });
    pluginToast.success("Cleaned up", { id });
    pluginToast.info("Started on all machines");
    pluginToast("Saved");
    pluginToast.dismiss(id);

    expect(custom.mock.calls.map(([, options]) => options?.duration)).toEqual([
      Infinity,
      4000,
      4000,
      4000,
    ]);
    expect(dismiss).toHaveBeenCalledWith("cleanup");
    expect(getNotifications().map(({ title, tone }) => [title, tone])).toEqual([
      ["Saved", "message"],
      ["Started on all machines", "message"],
      ["Cleaned up", "success"],
    ]);
  });

  it("keep sonner's toast for content bb's toast cannot show, and still record it", () => {
    const custom = vi.spyOn(toast, "custom");
    const error = vi.spyOn(toast, "error");
    const pluginToast = createPluginToast(toast);

    pluginToast.error("Build failed", { action: <button>Retry</button> });
    pluginToast.error("Sandbox boot failed", { icon: <span /> });
    pluginToast.error("Lazy description", { description: () => "exit 1" });
    pluginToast.error(() => "Lazy title");

    expect(custom).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(4);
    expect(getNotifications().map(({ title }) => title)).toEqual([
      "Lazy description",
      "Sandbox boot failed",
      "Build failed",
    ]);
  });

  it("keep the rest of sonner's toast API", () => {
    const pluginToast = createPluginToast(toast);

    expect(pluginToast.promise).toBe(toast.promise);
    expect(pluginToast.custom).toBe(toast.custom);
    expect(pluginToast.getHistory).toBe(toast.getHistory);
  });
});
