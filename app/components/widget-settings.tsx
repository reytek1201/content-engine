"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import {
  fetchAndSyncWidgetSnapshot,
  isNativeWidgetBridgeAvailable,
} from "@/utils/native-widget-plugin";
import { Capacitor } from "@capacitor/core";
import { useState, type ReactNode } from "react";

function WidgetPreviewCard({
  title,
  statusLine,
  nextStep,
  size = "small",
}: {
  title: string;
  statusLine: string;
  nextStep: string;
  size?: "small" | "medium";
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border/80 bg-[#09090b] shadow-lg ${
        size === "medium" ? "col-span-2" : ""
      }`}
    >
      <div className="p-3.5">
        <p className="text-[13px] font-semibold leading-tight text-zinc-50">
          {title}
        </p>
        <p className="mt-1 text-[11px] font-medium text-zinc-400">
          {statusLine}
        </p>
        {size === "medium" ? (
          <div className="mt-2.5 flex gap-1">
            {["Copy", "Images", "Captions", "Video", "Publish"].map(
              (label, index) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={`flex h-2 w-2 items-center justify-center rounded-full ${
                      index < 2
                        ? "bg-emerald-500/30"
                        : index === 2
                          ? "bg-primary/25"
                          : "bg-white/10"
                    }`}
                  />
                  <span className="text-[7px] font-semibold uppercase tracking-wide text-zinc-500">
                    {label}
                  </span>
                </div>
              ),
            )}
          </div>
        ) : null}
        <p className="mt-2.5 text-[11px] font-semibold text-primary">
          {nextStep} →
        </p>
      </div>
    </div>
  );
}

function InstructionStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {number}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      </div>
    </li>
  );
}

function TipCard({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
        •
      </span>
      <span>{children}</span>
    </li>
  );
}

function IosWidgetInstructions() {
  return (
    <ol className="space-y-5">
      <InstructionStep number={1} title="Enter edit mode">
        Go to your Home Screen, then{" "}
        <strong className="font-medium text-foreground">
          touch and hold an empty area
        </strong>{" "}
        until the apps start to jiggle. On some devices, tap{" "}
        <strong className="font-medium text-foreground">Edit</strong> in the top
        corner, then{" "}
        <strong className="font-medium text-foreground">Add Widget</strong>.
      </InstructionStep>

      <InstructionStep number={2} title="Find SlidePress">
        Search for{" "}
        <strong className="font-medium text-foreground">SlidePress</strong> in the
        widget gallery, or scroll the app list until you see the SlidePress icon.
      </InstructionStep>

      <InstructionStep number={3} title="Pick a widget">
        Choose{" "}
        <strong className="font-medium text-foreground">Continue Campaign</strong>{" "}
        to see progress on your latest active campaign, or{" "}
        <strong className="font-medium text-foreground">New Campaign</strong> for
        a one-tap shortcut to create.
      </InstructionStep>

      <InstructionStep number={4} title="Choose a size and add it">
        Swipe for{" "}
        <strong className="font-medium text-foreground">small</strong> or{" "}
        <strong className="font-medium text-foreground">medium</strong> (Continue
        Campaign only), then tap{" "}
        <strong className="font-medium text-foreground">Add Widget</strong>. Drag
        it where you want and tap{" "}
        <strong className="font-medium text-foreground">Done</strong>.
      </InstructionStep>

      <InstructionStep number={5} title="Load your campaign data">
        Open SlidePress and{" "}
        <strong className="font-medium text-foreground">visit a campaign</strong>{" "}
        (or pull to refresh on My campaigns). The widget updates with that
        campaign&apos;s title, image progress, and next step.
      </InstructionStep>
    </ol>
  );
}

function AndroidWidgetInstructions() {
  return (
    <ol className="space-y-5">
      <InstructionStep number={1} title="Open the widget picker">
        On your home screen,{" "}
        <strong className="font-medium text-foreground">
          touch and hold an empty area
        </strong>
        , then tap <strong className="font-medium text-foreground">Widgets</strong>
        . On some launchers, long-press the home screen and choose{" "}
        <strong className="font-medium text-foreground">Add widget</strong>.
      </InstructionStep>

      <InstructionStep number={2} title="Find SlidePress">
        Search for{" "}
        <strong className="font-medium text-foreground">SlidePress</strong> or
        scroll until you see the SlidePress icon.
      </InstructionStep>

      <InstructionStep number={3} title="Pick a widget">
        Choose{" "}
        <strong className="font-medium text-foreground">Continue Campaign</strong>{" "}
        for campaign progress, or{" "}
        <strong className="font-medium text-foreground">New Campaign</strong> for
        a shortcut to create.
      </InstructionStep>

      <InstructionStep number={4} title="Resize and place it">
        Drag the widget onto your home screen. For Continue Campaign, you can
        often resize it wider to show the full journey strip.
      </InstructionStep>

      <InstructionStep number={5} title="Load your campaign data">
        Open SlidePress and{" "}
        <strong className="font-medium text-foreground">visit a campaign</strong>{" "}
        (or pull to refresh on My campaigns). The widget updates with that
        campaign&apos;s title, image progress, and next step.
      </InstructionStep>
    </ol>
  );
}

export default function WidgetSettings() {
  const isNativeApp = useIsNativeApp();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const platform = Capacitor.getPlatform();
  const isIosNative = isNativeApp === true && platform === "ios";
  const isAndroidNative = isNativeApp === true && platform === "android";
  const hasWidgetSupport = isIosNative || isAndroidNative;

  async function handleRefreshWidget() {
    if (!hasWidgetSupport || refreshing) {
      return;
    }

    setRefreshing(true);
    setRefreshMessage(null);

    try {
      await fetchAndSyncWidgetSnapshot();
      setRefreshMessage("Widget updated. Check your home screen.");
    } catch {
      setRefreshMessage("Could not refresh the widget. Try again.");
    } finally {
      setRefreshing(false);
    }
  }

  if (isNativeApp !== true) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Home screen widgets are available in the SlidePress mobile app.
      </p>
    );
  }

  if (!isNativeWidgetBridgeAvailable()) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Home screen widgets are available on iOS and Android in the SlidePress
        app.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted-foreground">
          See your active campaign and next step from the home screen — without
          opening SlidePress. Tap the widget to jump straight back into your
          workspace.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <WidgetPreviewCard
            title="Summer Sale carousel"
            statusLine="3/5 images"
            nextStep="Generate captions"
          />
          <WidgetPreviewCard
            title="New campaign"
            statusLine="Turn a topic into slides"
            nextStep="Open create"
          />
          <WidgetPreviewCard
            title="Summer Sale carousel"
            statusLine="5/5 images · Captions ready"
            nextStep="Save all to Photos"
            size="medium"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Continue Campaign (small or medium) and New Campaign shortcut.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Add to Home Screen
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isIosNative
              ? "Works on iPhone and iPad."
              : "Works on Android phones and tablets."}
          </p>
        </div>

        {isIosNative ? <IosWidgetInstructions /> : <AndroidWidgetInstructions />}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Keep it up to date
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The widget refreshes automatically in most cases.
          </p>
        </div>

        <ul className="space-y-2">
          <TipCard>
            <strong className="font-medium text-foreground">While you work</strong>{" "}
            — opening a campaign updates the widget live as images generate,
            captions finish, and exports complete.
          </TipCard>
          <TipCard>
            <strong className="font-medium text-foreground">
              Push notifications
            </strong>{" "}
            — if alerts are on, finishing images or a video export also updates
            the widget when the app receives the notification.
          </TipCard>
          <TipCard>
            <strong className="font-medium text-foreground">
              Returning to the app
            </strong>{" "}
            — resuming SlidePress or pull-to-refresh on My campaigns syncs the
            latest status.
          </TipCard>
          <TipCard>
            <strong className="font-medium text-foreground">Tap to continue</strong>{" "}
            — the widget opens the right campaign (or the create flow for New
            Campaign).
          </TipCard>
        </ul>

        <div className="rounded-xl border border-border bg-background/30 p-4">
          <p className="text-sm font-medium text-foreground">
            Widget looks stale?
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Open a campaign, then use refresh below — or remove and re-add the
            widget after your first sync.
          </p>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void handleRefreshWidget()}
            className="btn-primary mt-4 min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh widget now"}
          </button>
          {refreshMessage ? (
            <p className="mt-3 text-sm text-emerald-400">{refreshMessage}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
