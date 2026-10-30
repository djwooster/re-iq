"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { THEME_PROMPT_KEY, useTheme, type ThemePreference } from "./theme-provider";

const noop = () => () => {};

/** True when the OS is in dark mode and the user has never been asked or picked a theme. */
function shouldPrompt() {
  try {
    return !window.localStorage.getItem(THEME_PROMPT_KEY) && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/**
 * The app defaults to light. If the user's computer is set to dark, tell them
 * once that dark and system modes exist. Any choice, including closing, is final.
 */
export function DarkModePrompt() {
  const { preference, setPreference } = useTheme();
  const eligible = useSyncExternalStore(noop, shouldPrompt, () => false);
  const [closed, setClosed] = useState(false);

  const choose = (p: ThemePreference) => {
    setPreference(p);
    setClosed(true);
  };

  return (
    <Modal
      open={eligible && !closed && preference === "light"}
      onClose={() => choose("light")}
      title="Dark mode is available"
      description="Your computer is set to dark mode, and this app opens in light mode by default."
      footer={
        <>
          <Button variant="ghost" onClick={() => choose("light")}>
            Keep light
          </Button>
          <Button onClick={() => choose("system")}>Match my computer</Button>
          <Button variant="primary" onClick={() => choose("dark")}>
            Use dark
          </Button>
        </>
      }
    >
      <p className="text-xs text-fg-2">
        Match my computer switches between light and dark whenever your system setting does. You can change this any time in Settings.
      </p>
    </Modal>
  );
}
