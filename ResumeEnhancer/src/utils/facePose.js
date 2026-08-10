// Estimates head yaw (left/right turn) from MediaPipe FaceMesh keypoints sir — a cheap
// geometric heuristic, not a full 3D pose solve, but plenty for "is this candidate facing the
// screen or turned away" over a webcam feed.
//
// Uses 3 fixed FaceMesh landmark indices: the nose tip (1) and the two outer eye corners
// (33 = right eye outer, 263 = left eye outer, as seen from the CAMERA's perspective on an
// unmirrored frame). When the face is centered, the nose sits roughly midway between the two
// eyes on the x axis. Turning the head shifts the nose toward one eye and away from the other —
// that ratio, not the absolute pixel distance, is what stays reasonably stable across face
// sizes and camera distances.
const NOSE_TIP = 1
const RIGHT_EYE_OUTER = 33
const LEFT_EYE_OUTER = 263

// returns a signed ratio roughly in [-1, 1] sir — 0 is centered, positive/negative is turned
// toward one side. Returns null if the expected keypoints aren't present.
export const estimateYawRatio = (keypoints) => {
    if (!keypoints || keypoints.length <= LEFT_EYE_OUTER) return null

    const nose = keypoints[NOSE_TIP]
    const rightEye = keypoints[RIGHT_EYE_OUTER]
    const leftEye = keypoints[LEFT_EYE_OUTER]
    if (!nose || !rightEye || !leftEye) return null

    const eyeSpan = leftEye.x - rightEye.x
    if (Math.abs(eyeSpan) < 1e-6) return null

    const noseFromCenter = nose.x - (rightEye.x + leftEye.x) / 2
    return noseFromCenter / eyeSpan
}

// beyond this ratio, the candidate is considered turned away sir — tuned loosely; a real
// deployment would want to calibrate this against a few sample sessions
export const YAW_AWAY_THRESHOLD = 0.18
