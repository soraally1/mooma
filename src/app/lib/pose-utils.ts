import { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Calculate the angle between three points (landmarks)
 * @param firstPoint - First landmark (e.g., shoulder)
 * @param midPoint - Middle landmark (e.g., elbow)
 * @param lastPoint - Last landmark (e.g., wrist)
 * @returns Angle in degrees
 */
export function calculateAngle(
    firstPoint: NormalizedLandmark,
    midPoint: NormalizedLandmark,
    lastPoint: NormalizedLandmark
): number {
    const radians =
        Math.atan2(lastPoint.y - midPoint.y, lastPoint.x - midPoint.x) -
        Math.atan2(firstPoint.y - midPoint.y, firstPoint.x - midPoint.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
}

/**
 * Calculate distance between two landmarks
 * @param point1 - First landmark
 * @param point2 - Second landmark
 * @returns Normalized distance
 */
export function calculateDistance(
    point1: NormalizedLandmark,
    point2: NormalizedLandmark
): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if an angle is within a target range
 * @param angle - Current angle
 * @param target - Target angle
 * @param tolerance - Acceptable deviation
 * @returns Whether angle is within acceptable range
 */
export function isAngleInRange(
    angle: number,
    target: number,
    tolerance: number = 15
): boolean {
    return Math.abs(angle - target) <= tolerance;
}

/**
 * Get feedback status based on angle accuracy
 * @param angle - Current angle
 * @param target - Target angle
 * @param tolerance - Acceptable deviation
 * @returns 'correct' | 'close' | 'incorrect'
 */
export function getAngleFeedback(
    angle: number,
    target: number,
    tolerance: number = 15
): 'correct' | 'close' | 'incorrect' {
    const diff = Math.abs(angle - target);

    if (diff <= tolerance) return 'correct';
    if (diff <= tolerance * 2) return 'close';
    return 'incorrect';
}

/**
 * Smooth values over time to reduce jitter
 */
export class ValueSmoother {
    private values: number[] = [];
    private maxSize: number;

    constructor(windowSize: number = 5) {
        this.maxSize = windowSize;
    }

    addValue(value: number): number {
        this.values.push(value);
        if (this.values.length > this.maxSize) {
            this.values.shift();
        }

        return this.getSmoothedValue();
    }

    getSmoothedValue(): number {
        if (this.values.length === 0) return 0;

        const sum = this.values.reduce((a, b) => a + b, 0);
        return sum / this.values.length;
    }

    reset(): void {
        this.values = [];
    }
}

/**
 * MediaPipe Pose Landmark indices
 */
export const PoseLandmark = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32,
} as const;
