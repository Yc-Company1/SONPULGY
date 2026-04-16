export interface MoveClick { x: number; y: number; t: number; age: number; kind: "move" | "attack"; }

export interface InputCallbacks {
  onMove: (x: number, y: number) => void;
  onAttackMove: (x: number, y: number) => void;
  onStop: () => void;
  onFlash: (aimX: number, aimY: number) => void;
  onSkill: (key: "Q" | "W", aimX: number, aimY: number) => void;
  getFlashKey: () => "D" | "F";
}

export class InputSystem {
  canvas: HTMLCanvasElement;
  cb: InputCallbacks;
  clicks: MoveClick[] = [];
  mouse = { x: 0, y: 0 };
  aMode = false;

  private toCanvas(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private handleDown = (e: MouseEvent) => {
    e.preventDefault();
    const { x, y } = this.toCanvas(e);
    if (e.button === 2) {
      // right click: move
      this.cb.onMove(x, y);
      this.clicks.push({ x, y, t: performance.now() / 1000, age: 0, kind: "move" });
      this.aMode = false;
    } else if (e.button === 0) {
      if (this.aMode) {
        this.cb.onAttackMove(x, y);
        this.clicks.push({ x, y, t: performance.now() / 1000, age: 0, kind: "attack" });
        this.aMode = false;
      }
    }
  };
  private handleMove = (e: MouseEvent) => {
    const { x, y } = this.toCanvas(e);
    this.mouse.x = x;
    this.mouse.y = y;
  };
  private handleContext = (e: Event) => e.preventDefault();
  private handleKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "a") this.aMode = true;
    else if (k === "s") { this.aMode = false; this.cb.onStop(); }
    else if (k === "d" || k === "f") {
      if (k.toUpperCase() === this.cb.getFlashKey()) this.cb.onFlash(this.mouse.x, this.mouse.y);
    }
    else if (k === "q") this.cb.onSkill("Q", this.mouse.x, this.mouse.y);
    else if (k === "w") this.cb.onSkill("W", this.mouse.x, this.mouse.y);
    else if (e.key === "Escape") this.aMode = false;
  };

  constructor(canvas: HTMLCanvasElement, cb: InputCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    canvas.addEventListener("mousedown", this.handleDown);
    canvas.addEventListener("mousemove", this.handleMove);
    canvas.addEventListener("contextmenu", this.handleContext);
    window.addEventListener("keydown", this.handleKey);
  }

  update(dt: number) {
    this.clicks = this.clicks.filter((c) => {
      c.age += dt;
      return c.age < 0.55;
    });
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleDown);
    this.canvas.removeEventListener("mousemove", this.handleMove);
    this.canvas.removeEventListener("contextmenu", this.handleContext);
    window.removeEventListener("keydown", this.handleKey);
  }
}
