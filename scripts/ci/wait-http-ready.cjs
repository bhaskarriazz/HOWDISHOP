async function main() {
  const [url, timeoutArg] = process.argv.slice(2);
  const timeoutMs = Number(timeoutArg || 120000);
  if (!url) throw new Error("Usage: wait-http-ready.cjs <url> [timeout-ms]");
  const started = Date.now();
  let last = "not attempted";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (response.ok) {
        console.log(`READY ${url} (${response.status}) after ${Date.now() - started}ms`);
        process.exit(0);
      }
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.error(`NOT READY ${url} after ${timeoutMs}ms: ${last}`);
  process.exit(1);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
