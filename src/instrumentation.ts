export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.INLINE_WORKER === "true") {
    const { startInlineWorker } = await import("./lib/queue");
    startInlineWorker();
  }
}
