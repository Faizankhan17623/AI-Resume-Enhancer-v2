// Stub for '@mediapipe/face_detection' sir — aliased in vite.config.js.
//
// @tensorflow-models/face-detection statically imports { FaceDetection } from this package for
// its 'mediapipe' runtime option. We only ever use the 'tfjs' runtime (see
// Components/ProctoredTest/TestConsent.jsx and ProctoredTestRunner.jsx — 'runtime: "tfjs"" in
// both createDetector calls), so that import path is genuinely dead code for this app. It still
// breaks the production build though: @mediapipe/face_detection's real file is a legacy
// UMD/global-script bundle (attaches to globalThis via a minified `K("FaceDetection", ...)` call,
// not a real ESM `export`), which Rolldown's static analysis fails hard on as a MISSING_EXPORT
// error rather than the softer warning the same issue produces for @mediapipe/face_mesh. Aliasing
// to this empty stub keeps the import resolvable without ever needing the real mediapipe runtime.
export const FaceDetection = undefined
