// User-Agent Client Hints sir, per direct request — Chromium-only (Chrome/Edge/Opera), NOT
// supported in Firefox or Safari, so this always degrades to null there rather than throwing.
//
// Deliberately advisory-only: the backend's own User-Agent header parsing
// (Backend/utils/deviceFingerprint.js) remains the sole source of truth for the actual new-device
// SECURITY decision (alert or not) — this is genuinely spoofable client-reported data (anyone can
// override navigator.userAgentData in devtools before a request goes out), so it's only ever
// shown as a labeled "self-reported" extra detail in the alert email, never trusted for anything
// that gates access or triggers a security action.
export const getClientHints = async () => {
  if (!navigator.userAgentData) return null

  try {
    const brand = navigator.userAgentData.brands?.find((b) => !b.brand.includes('Not'))?.brand
      || navigator.userAgentData.brands?.[0]?.brand
      || null

    let model = null
    try {
      const highEntropy = await navigator.userAgentData.getHighEntropyValues(['model'])
      model = highEntropy?.model || null
    } catch {
      // getHighEntropyValues can reject sir (older Chromium, permission policy, etc.) — brand
      // alone is still useful, don't let a model-lookup failure drop the whole thing
    }

    return {
      brand,
      model: model || null,
      mobile: navigator.userAgentData.mobile ?? null,
      platform: navigator.userAgentData.platform || null,
    }
  } catch {
    return null
  }
}
