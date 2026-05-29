import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom (as of v25) does not implement `PointerEvent`. Without it, React's
// `onPointerDown` / `onPointerMove` / `onPointerUp` handlers don't fire from
// `fireEvent.pointerDown(...)`. Polyfill a minimal subclass of MouseEvent
// before any test imports React so the synthetic event system attaches the
// pointer listeners.
if (
  typeof globalThis.PointerEvent === "undefined" &&
  typeof window !== "undefined"
) {
  class PointerEventPolyfill extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;
    public readonly width: number;
    public readonly height: number;
    public readonly pressure: number;
    public readonly tangentialPressure: number;
    public readonly tiltX: number;
    public readonly tiltY: number;
    public readonly twist: number;
    public readonly isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "";
      this.width = init.width ?? 0;
      this.height = init.height ?? 0;
      this.pressure = init.pressure ?? 0;
      this.tangentialPressure = init.tangentialPressure ?? 0;
      this.tiltX = init.tiltX ?? 0;
      this.tiltY = init.tiltY ?? 0;
      this.twist = init.twist ?? 0;
      this.isPrimary = init.isPrimary ?? false;
    }
  }
  (globalThis as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
  (window as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
}

// jsdom does not implement `setPointerCapture` / `releasePointerCapture` on
// HTMLElement; provide stubs so handlers that call them don't throw.
if (typeof HTMLElement !== "undefined") {
  type AnyHTMLElement = HTMLElement & {
    setPointerCapture?: (id: number) => void;
    releasePointerCapture?: (id: number) => void;
    hasPointerCapture?: (id: number) => boolean;
  };
  const proto = HTMLElement.prototype as AnyHTMLElement;
  if (typeof proto.setPointerCapture !== "function") {
    proto.setPointerCapture = function () {};
  }
  if (typeof proto.releasePointerCapture !== "function") {
    proto.releasePointerCapture = function () {};
  }
  if (typeof proto.hasPointerCapture !== "function") {
    proto.hasPointerCapture = function () {
      return false;
    };
  }
}
