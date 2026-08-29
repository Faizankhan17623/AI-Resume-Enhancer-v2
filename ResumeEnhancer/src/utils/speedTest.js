// Measures rough download speed sir — used by TestConsent.jsx to gate starting a proctored test
// (per direct request: "if internet speed is lower than what we want, tell them to take the test
// later / find faster internet"). Downloads a known-size static file from THIS app's own domain
// (public/speedtest-probe.bin, served by Vercel) with a cache-busting query param, so repeat runs
// can't get a falsely-fast reading from the browser/service-worker cache.
//
// This is a rough estimate, not a lab-grade speed test — a single ~2MB download over HTTPS is
// good enough to catch "this connection genuinely can't handle live snapshot uploads during a
// proctored test", not to produce a precise Mbps figure. That's the right level of rigor for
// this gate.
const PROBE_URL = '/speedtest-probe.bin'
const PROBE_SIZE_BITS = 2 * 1024 * 1024 * 8 // 2MB file, in bits

// returns download speed in Mbps, or null if the probe fails (treated as "can't verify speed",
// NOT as "speed is 0" — see TestConsent.jsx for how a failure is handled differently from a
// genuinely slow reading)
export const measureDownloadMbps = async () => {
  try {
    const start = performance.now()
    const response = await fetch(`${PROBE_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return null
    await response.blob()
    const elapsedSeconds = (performance.now() - start) / 1000
    if (elapsedSeconds <= 0) return null

    return PROBE_SIZE_BITS / elapsedSeconds / 1_000_000
  } catch {
    return null
  }
}

// per direct request sir — 5 Mbps minimum
export const MIN_REQUIRED_MBPS = 5
