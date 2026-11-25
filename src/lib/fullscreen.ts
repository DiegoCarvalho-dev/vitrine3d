import {
  type RefObject,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

// Full screen for the unit's 3D (issue #109). On Android (and desktop) the
// real Fullscreen API is used, and the phone is asked to turn landscape. On
// the iPhone, which only allows full screen for videos, the 3D covers the
// whole page instead ("pseudo" full screen); the back gesture closes it.

/** Is a media query true right now? (false on the server, live afterwards) */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

type Lockable = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

/** Asks the phone to turn landscape; refusing (iPhone, desktop) is fine. */
function lockLandscape() {
  const orientation = screen.orientation as Lockable | undefined;
  orientation?.lock?.("landscape").catch(() => {});
}

function unlockOrientation() {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // not supported: nothing to undo
  }
}

/** The page behind doesn't scroll while the 3D covers it. */
function lockPageScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** The history entry that lets the back gesture close the pseudo full screen. */
const HISTORY_MARK = "vitrineFullscreen";

export type FullscreenKind = "real" | "pseudo" | null;

/** Full screen for the element in `ref` (see the notes at the top). */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [real, setReal] = useState(false);
  const [pseudo, setPseudo] = useState(false);

  // The browser's own full screen starts and ends (button, Esc, back).
  useEffect(() => {
    const onChange = () => {
      const on =
        document.fullscreenElement !== null &&
        document.fullscreenElement === ref.current;
      setReal(on);
      if (!on) unlockOrientation();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  // Pseudo full screen: the page stays put; back gesture or Esc closes it.
  useEffect(() => {
    if (!pseudo) return;
    lockPageScroll(true);
    const close = () => setPseudo(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("popstate", close);
    window.addEventListener("keydown", onKey);
    return () => {
      lockPageScroll(false);
      window.removeEventListener("popstate", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudo]);

  const enter = useCallback(async () => {
    const element = ref.current;
    if (!element) return;
    if (document.fullscreenEnabled && element.requestFullscreen) {
      try {
        await element.requestFullscreen({ navigationUI: "hide" });
        lockLandscape();
        return;
      } catch {
        // refused (e.g. an embedded page): cover the page instead
      }
    }
    // Same entry again plus a mark: Next.js keeps its own data in the state.
    window.history.pushState(
      { ...window.history.state, [HISTORY_MARK]: true },
      "",
    );
    setPseudo(true);
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    if (pseudo) {
      // Leaving through "back" also takes our history entry away.
      if (window.history.state?.[HISTORY_MARK]) window.history.back();
      else setPseudo(false);
    }
  }, [pseudo]);

  const kind: FullscreenKind = real ? "real" : pseudo ? "pseudo" : null;
  return { active: kind !== null, kind, enter, exit };
}
