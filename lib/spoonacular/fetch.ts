const MAX_CONCURRENT_REQUESTS = Number(process.env.SPOONACULAR_CONCURRENCY ?? 2);
const MIN_INTERVAL_MS = Number(process.env.SPOONACULAR_MIN_INTERVAL_MS ?? 1000);

const pendingQueue: Array<() => void> = [];
let activeRequests = 0;
let lastRequestTime = 0;

export async function spoonacularFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  await acquireSlot();
  try {
    return await fetch(input, init);
  } finally {
    releaseSlot();
  }
}

async function acquireSlot() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS && pendingQueue.length === 0) {
    activeRequests += 1;
    await ensureMinInterval();
    return;
  }

  await new Promise<void>((resolve) => {
    pendingQueue.push(async () => {
      await ensureMinInterval();
      activeRequests += 1;
      resolve();
    });
  });
}

function releaseSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
  processQueue();
}

function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;
  const next = pendingQueue.shift();
  if (!next) return;
  void next();
}

async function ensureMinInterval() {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + MIN_INTERVAL_MS - now);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();
}
