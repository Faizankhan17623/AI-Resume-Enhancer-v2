// Estimates head yaw (left/right turn) from MediaPipe FaceDetector keypoints sir — a cheap
// geometric heuristic, not a full 3D pose solve, but plenty for "is this candidate facing the
// screen or turned away" over a webcam feed.
//
// Switched from face-landmarks-detection's 468-point FaceMesh to face-detection's lighter 6-point
// model (per direct request, chasing camera startup time + per-frame lag): FaceMesh solves a much
// harder problem (a full 3D facial mesh) than this feature actually needs — all it ever used was
// 3 of those 468 points for a 2D ratio. FaceDetector gives the same 3 points directly (named, not
// indexed) from a much lighter bounding-box-plus-6-keypoints model, so this is a right-sizing of
// the tool, not an accuracy tradeoff — same geometric math as before, just fed by a cheaper
// detector. See ProctoredTestRunner.jsx for the model swap itself.
//
// Uses 3 named keypoints: 'noseTip', 'rightEye', 'leftEye' (as seen from the CAMERA's perspective
// on an unmirrored frame). When the face is centered, the nose sits roughly midway between the
// two eyes on the x axis. Turning the head shifts the nose toward one eye and away from the
// other — that ratio, not the absolute pixel distance, is what stays reasonably stable across
// face sizes and camera distances.

// returns a signed ratio roughly in [-1, 1] sir — 0 is centered, positive/negative is turned
// toward one side. Returns null if the expected keypoints aren't present.
export const estimateYawRatio = (keypoints) => {
    if (!keypoints?.length) return null

    const byName = (name) => keypoints.find((kp) => kp.name === name)
    const nose = byName('noseTip')
    const rightEye = byName('rightEye')
    const leftEye = byName('leftEye')
    if (!nose || !rightEye || !leftEye) return null

    const eyeSpan = leftEye.x - rightEye.x
    if (Math.abs(eyeSpan) < 1e-6) return null

    const noseFromCenter = nose.x - (rightEye.x + leftEye.x) / 2
    return noseFromCenter / eyeSpan
}

// beyond this ratio, the candidate is considered turned away sir — tuned loosely; a real
// deployment would want to calibrate this against a few sample sessions
export const YAW_AWAY_THRESHOLD = 0.18
