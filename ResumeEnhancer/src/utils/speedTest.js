import BASE_URL from './backendUrl'

// Measures rough download speed sir — used by TestConsent.jsx to gate starting a proctored test
// (per direct request: "if internet speed is lower than what we want, tell them to take the test
// later / find faster internet"). Downloads a known-size payload from the backend's
// /test-attempts/speed-probe endpoint (Auth + isUser + speedProbeLimiter, see
// controllers/Test.js's speedProbe) — NOT a plain fetch through apiConnector, since this needs
// real wall-clock download timing, not JSON parsing; a raw fetch with the Authorization header
// added directly is simpler and safer than adding a one-off responseType override to the shared
// apiConnector used by every other call in this app.
//
// This used to be a public static file on Vercel (public/speedtest-probe.bin) with zero gating —
// moved server-side so only an authenticated candidate can trigger it, and only a handful of
// times a minute (see speedProbeLimiter), instead of costing bandwidth on arbitrary internet
// traffic hitting a public URL.
//
// This is a rough estimate, not a lab-grade speed test — a single ~2MB download over HTTPS is
// good enough to catch "this connection genuinely can't handle live snapshot uploads during a
// proctored test", not to produce a precise Mbps figure. That's the right level of rigor for
// this gate.
const PROBE_URL = `${BASE_URL}/test-attempts/speed-probe`
const PROBE_SIZE_BITS = 2 * 1024 * 1024 * 8 // 2MB payload, in bits — matches SPEED_PROBE_SIZE server-side

// returns download speed in Mbps, or null if the probe fails (treated as "can't verify speed",
// NOT as "speed is 0" — see TestConsent.jsx for how a failure is handled differently from a
// genuinely slow reading)
export const measureDownloadMbps = async (token) => {
  try {
    const start = performance.now()
    const response = await fetch(`${PROBE_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
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
