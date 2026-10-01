import {
  EMBED_MOBILE_MAX_WIDTH,
  type EmbedLayoutMessage,
  type EmbedViewportMessage,
  isEmbedLayoutMessage,
} from "../lib/widget/embed-protocol";

// `currentScript` is only set while the script first runs.
const script = document.currentScript;

const FRAME_ATTRIBUTE = "data-marshaldesk-widget";
const COLLAPSED_SIZE = 88;
const OPEN_WIDTH = 448;
const OPEN_HEIGHT = 740;

type Styles = Record<string, string>;

function setStyles(element: HTMLElement, styles: Styles) {
  for (const [name, value] of Object.entries(styles)) {
    // `important` so the customer's own CSS for iframes can't resize the widget.
    element.style.setProperty(name, value, "important");
  }
}

function isMobile(): boolean {
  return window.innerWidth <= EMBED_MOBILE_MAX_WIDTH;
}

function mount(appOrigin: string, workspaceId: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(FRAME_ATTRIBUTE, "");
  iframe.title = "Chat";
  // Lets the widget see the full page URL (visitor details), not just the origin.
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.src = `${appOrigin}/widget/${encodeURIComponent(workspaceId)}?host=${encodeURIComponent(location.hostname)}`;
  setStyles(iframe, {
    position: "fixed",
    "z-index": "2147483000",
    border: "0",
    margin: "0",
    padding: "0",
    background: "transparent",
    // A color scheme that differs from the widget document's makes the iframe opaque.
    "color-scheme": "light",
    "max-width": "none",
    "max-height": "none",
    "min-width": "0",
    "min-height": "0",
    top: "auto",
    bottom: "0",
    left: "auto",
    right: "0",
    width: "0",
    height: "0",
    visibility: "hidden",
  });

  let layout: EmbedLayoutMessage | null = null;
  let lastMobile: boolean | null = null;
  let savedOverflow: { html: string; body: string } | null = null;

  function lockScroll() {
    if (savedOverflow) return;
    savedOverflow = {
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!savedOverflow) return;
    document.documentElement.style.overflow = savedOverflow.html;
    document.body.style.overflow = savedOverflow.body;
    savedOverflow = null;
  }

  function postViewport() {
    const mobile = isMobile();
    if (mobile === lastMobile) return;
    lastMobile = mobile;
    const message: EmbedViewportMessage = {
      type: "marshaldesk:viewport",
      mobile,
    };
    iframe.contentWindow?.postMessage(message, appOrigin);
  }

  function applyLayout() {
    if (!layout) return;
    const side = layout.position === "bottom-left" ? "left" : "right";
    const otherSide = side === "left" ? "right" : "left";

    switch (layout.state) {
      case "hidden":
        unlockScroll();
        setStyles(iframe, { visibility: "hidden", width: "0", height: "0" });
        return;
      case "collapsed":
        unlockScroll();
        setStyles(iframe, {
          visibility: "visible",
          top: "auto",
          bottom: "0",
          [side]: "0",
          [otherSide]: "auto",
          width: `${COLLAPSED_SIZE}px`,
          height: `${COLLAPSED_SIZE}px`,
        });
        return;
      case "open":
        if (isMobile()) {
          lockScroll();
          setStyles(iframe, {
            visibility: "visible",
            top: "0",
            bottom: "0",
            left: "0",
            right: "0",
            width: "100vw",
            height: "100dvh",
          });
        } else {
          unlockScroll();
          setStyles(iframe, {
            visibility: "visible",
            top: "auto",
            bottom: "0",
            [side]: "0",
            [otherSide]: "auto",
            width: `min(${OPEN_WIDTH}px, 100vw)`,
            height: `min(${OPEN_HEIGHT}px, 100dvh)`,
          });
        }
        return;
      default: {
        const unhandled: never = layout.state;
        throw new Error(`Unhandled layout: ${String(unhandled)}`);
      }
    }
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== appOrigin || event.source !== iframe.contentWindow) {
      return;
    }
    if (!isEmbedLayoutMessage(event.data)) return;
    layout = event.data;
    postViewport();
    applyLayout();
  });

  window.addEventListener("resize", () => {
    if (!layout) return;
    postViewport();
    applyLayout();
  });

  document.body.appendChild(iframe);
}

function init() {
  if (!(script instanceof HTMLScriptElement) || !script.src) return;
  if (document.querySelector(`iframe[${FRAME_ATTRIBUTE}]`)) return;
  const workspaceId = script.dataset.workspace;
  if (!workspaceId) {
    console.warn("MarshalDesk: add data-workspace to the embed script.");
    return;
  }
  const appOrigin = new URL(script.src).origin;

  if (document.body) {
    mount(appOrigin, workspaceId);
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!document.querySelector(`iframe[${FRAME_ATTRIBUTE}]`)) {
          mount(appOrigin, workspaceId);
        }
      },
      { once: true },
    );
  }
}

init();
