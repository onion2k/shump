import './styles.css';

type TelemetryMessage = {
  seq: number;
  ts: number;
  kind: 'sample' | 'event' | 'status' | string;
  payload: Record<string, unknown>;
};

type TelemetrySample = {
  fps: number;
  averageFrameTimeMs: number;
  drawCalls: number;
  drawCallsPerSecond: number;
  memory: {
    usedJsHeapSizeMb: number;
    totalJsHeapSizeMb: number;
    jsHeapSizeLimitMb: number;
  } | null;
  pathname?: string;
};

const CHANNEL_NAME = 'shump.telemetry.v1';
const STORAGE_KEY = 'shump.telemetry.buffer.v1';
const MAX_POINTS = 180;
const MAX_EVENTS = 80;

const app = document.querySelector<HTMLDivElement>('#telemetry-root');
if (!app) {
  throw new Error('Telemetry root not found');
}

app.innerHTML = `
  <main class="tv-shell">
    <header class="tv-header">
      <h1>Shump Telemetry Viewer</h1>
      <p>Open this page while the game runs to view live performance metrics.</p>
      <p id="status-line" class="tv-status">Waiting for telemetry stream from this origin...</p>
    </header>

    <section class="tv-grid">
      <article class="tv-card">
        <h2>FPS</h2>
        <div id="fps-value" class="tv-kpi">-</div>
        <canvas id="fps-chart" width="420" height="140"></canvas>
      </article>

      <article class="tv-card">
        <h2>Draw Calls / sec</h2>
        <div id="draw-value" class="tv-kpi">-</div>
        <canvas id="draw-chart" width="420" height="140"></canvas>
      </article>

      <article class="tv-card">
        <h2>Memory (MB)</h2>
        <div id="mem-value" class="tv-kpi">-</div>
        <canvas id="mem-chart" width="420" height="140"></canvas>
      </article>

      <article class="tv-card tv-events">
        <h2>Events</h2>
        <ul id="event-list"></ul>
      </article>
    </section>
  </main>
`;

const fpsEl = must<HTMLDivElement>('#fps-value');
const drawEl = must<HTMLDivElement>('#draw-value');
const memEl = must<HTMLDivElement>('#mem-value');
const eventListEl = must<HTMLUListElement>('#event-list');
const statusLineEl = must<HTMLParagraphElement>('#status-line');

const fpsChart = must<HTMLCanvasElement>('#fps-chart');
const drawChart = must<HTMLCanvasElement>('#draw-chart');
const memChart = must<HTMLCanvasElement>('#mem-chart');

const fpsPoints: number[] = [];
const drawPoints: number[] = [];
const memPoints: number[] = [];
const events: string[] = [];
let hasSeenSample = false;

bootstrapFromStorage();
subscribe();
window.setInterval(() => {
  bootstrapFromStorage();
}, 1000);

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node;
}

function bootstrapFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const messages = JSON.parse(raw) as TelemetryMessage[];
    for (const message of messages) {
      onMessage(message, false);
    }
    render();
  } catch {
    // ignore invalid buffer
  }
}

function subscribe() {
  if (typeof BroadcastChannel === 'function') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event) => {
      onMessage(event.data as TelemetryMessage, true);
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }
    try {
      const messages = JSON.parse(event.newValue) as TelemetryMessage[];
      const latest = messages[messages.length - 1];
      if (latest) {
        onMessage(latest, true);
      }
    } catch {
      // ignore invalid storage payload
    }
  });

  window.addEventListener('shump:telemetry-message', (event) => {
    onMessage((event as CustomEvent<TelemetryMessage>).detail, true);
  });
}

function onMessage(message: TelemetryMessage, rerender: boolean) {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.kind === 'sample') {
    const sample = message.payload as unknown as TelemetrySample;
    hasSeenSample = true;
    pushPoint(fpsPoints, sample.fps);
    pushPoint(drawPoints, sample.drawCallsPerSecond);
    pushPoint(memPoints, sample.memory?.usedJsHeapSizeMb ?? 0);

    fpsEl.textContent = sample.fps.toFixed(1);
    drawEl.textContent = `${sample.drawCallsPerSecond.toFixed(1)} (${sample.drawCalls} draws)`;
    memEl.textContent = sample.memory
      ? `${sample.memory.usedJsHeapSizeMb.toFixed(1)} / ${sample.memory.totalJsHeapSizeMb.toFixed(1)}`
      : 'n/a';
    statusLineEl.textContent = `Receiving telemetry from ${sample.pathname ?? '/'}`;
  } else {
    const eventType = typeof message.payload?.type === 'string' ? message.payload.type : message.kind;
    const timestamp = new Date(message.ts).toLocaleTimeString();
    const row = `${timestamp} - ${eventType}`;
    events.unshift(row);
    if (events.length > MAX_EVENTS) {
      events.length = MAX_EVENTS;
    }
  }

  if (rerender) {
    render();
  }
}

function pushPoint(target: number[], value: number) {
  target.push(Number.isFinite(value) ? value : 0);
  if (target.length > MAX_POINTS) {
    target.shift();
  }
}

function render() {
  if (!hasSeenSample) {
    statusLineEl.textContent = `Waiting for telemetry stream from ${window.location.origin}. Open ${window.location.origin}/ in another tab.`;
  }

  drawLineChart(fpsChart, fpsPoints, '#3fbc7a');
  drawLineChart(drawChart, drawPoints, '#ea8a2f');
  drawLineChart(memChart, memPoints, '#53a4ff');

  eventListEl.innerHTML = events
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');
}

function drawLineChart(canvas: HTMLCanvasElement, points: number[], strokeStyle: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d1829';
  ctx.fillRect(0, 0, width, height);

  if (points.length < 2) {
    return;
  }

  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const span = Math.max(1, max - min);

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const x = (i / (MAX_POINTS - 1)) * width;
    const normalized = (points[i] - min) / span;
    const y = height - normalized * (height - 8) - 4;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
