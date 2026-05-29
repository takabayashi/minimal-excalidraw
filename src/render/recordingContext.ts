/**
 * Tiny test double for `CanvasRenderingContext2D` that records every method
 * call and property assignment in the order they happen. Real `Canvas` is not
 * available in jsdom, so this is the substrate for renderer tests.
 *
 * Only the surface used by the renderer is implemented; calling anything else
 * will throw, which makes "we accidentally used a different API" surface
 * loudly during development.
 */
export interface RecordedSet {
  kind: "set";
  prop: string;
  value: unknown;
}

export interface RecordedCall {
  kind: "call";
  method: string;
  args: readonly unknown[];
}

export type RecordedCommand = RecordedSet | RecordedCall;

const RECORDED_METHODS = [
  "save",
  "restore",
  "beginPath",
  "closePath",
  "moveTo",
  "lineTo",
  "rect",
  "ellipse",
  "arc",
  "stroke",
  "fill",
  "strokeRect",
  "fillRect",
  "clearRect",
  "fillText",
  "strokeText",
  "setLineDash",
  "translate",
  "rotate",
  "scale",
  "setTransform",
  "resetTransform",
] as const;

const RECORDED_PROPERTIES = [
  "globalAlpha",
  "strokeStyle",
  "fillStyle",
  "lineWidth",
  "lineCap",
  "lineJoin",
  "font",
  "textBaseline",
  "textAlign",
] as const;

export interface RecordingContext {
  ctx: CanvasRenderingContext2D;
  commands: RecordedCommand[];
  /** Convenience: returns only the calls (not property sets) of a given method. */
  callsOf(method: string): readonly RecordedCall[];
  /** Convenience: returns only the most recent value set to a property. */
  lastSet(prop: string): unknown;
}

export function createRecordingContext(): RecordingContext {
  const commands: RecordedCommand[] = [];
  const propState: Record<string, unknown> = {};

  const stub: Record<string, unknown> = {};

  for (const method of RECORDED_METHODS) {
    stub[method] = (...args: unknown[]): void => {
      commands.push({ kind: "call", method, args });
    };
  }

  for (const prop of RECORDED_PROPERTIES) {
    Object.defineProperty(stub, prop, {
      configurable: true,
      enumerable: true,
      get: () => propState[prop],
      set: (value: unknown) => {
        propState[prop] = value;
        commands.push({ kind: "set", prop, value });
      },
    });
  }

  // measureText is occasionally called for layout; provide a deterministic stub.
  stub.measureText = (text: string): TextMetrics =>
    ({ width: text.length * 10 }) as TextMetrics;

  return {
    ctx: stub as unknown as CanvasRenderingContext2D,
    commands,
    callsOf(method) {
      const out: RecordedCall[] = [];
      for (const c of commands) {
        if (c.kind === "call" && c.method === method) out.push(c);
      }
      return out;
    },
    lastSet(prop) {
      let value: unknown;
      for (const c of commands) {
        if (c.kind === "set" && c.prop === prop) value = c.value;
      }
      return value;
    },
  };
}
