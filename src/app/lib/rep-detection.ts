import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { calculateAngle, PoseLandmark } from './pose-utils';

// ============================================
// POSE METRICS - Raw measurements from pose
// ============================================

export interface PoseMetrics {
    // Spine metrics
    spineAngle: number;           // Forward/backward lean (degrees from vertical)

    // Shoulder metrics
    shoulderWidth: number;        // Normalized distance between shoulders

    // Arm metrics
    leftElbowAngle: number;
    rightElbowAngle: number;
    avgElbowAngle: number;
    leftArmY: number;             // Left wrist Y relative to shoulder (positive = below)
    rightArmY: number;            // Right wrist Y relative to shoulder
    leftArmX: number;             // Left wrist X relative to shoulder
    rightArmX: number;

    // Body lean
    bodyLeanX: number;            // Side lean (positive = right, negative = left)

    // Knee metrics  
    kneeSpread: number;           // Distance between knees (normalized)

    // Confidence
    confidence: number;
}

// ============================================
// SIMPLE MOVING AVERAGE SMOOTHER
// ============================================

export class MetricsSmoother {
    private history: PoseMetrics[] = [];
    private readonly windowSize: number;

    constructor(windowSize: number = 3, _emaAlpha?: number) {
        this.windowSize = windowSize;
    }

    smooth(metrics: PoseMetrics): PoseMetrics {
        this.history.push(metrics);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        if (this.history.length === 1) {
            return metrics;
        }

        // Simple average
        const len = this.history.length;
        const avg = (key: keyof PoseMetrics) =>
            this.history.reduce((sum, m) => sum + (m[key] as number), 0) / len;

        return {
            spineAngle: avg('spineAngle'),
            shoulderWidth: avg('shoulderWidth'),
            leftElbowAngle: avg('leftElbowAngle'),
            rightElbowAngle: avg('rightElbowAngle'),
            avgElbowAngle: avg('avgElbowAngle'),
            leftArmY: avg('leftArmY'),
            rightArmY: avg('rightArmY'),
            leftArmX: avg('leftArmX'),
            rightArmX: avg('rightArmX'),
            bodyLeanX: avg('bodyLeanX'),
            kneeSpread: avg('kneeSpread'),
            confidence: avg('confidence'),
        };
    }

    reset(): void {
        this.history = [];
    }
}

// ============================================
// PHASE DETECTION
// ============================================

export type PhaseName = 'neutral' | 'phase1' | 'phase2' | 'phase3';

export interface PhaseCondition {
    name: PhaseName;
    displayName: string;
    check: (metrics: PoseMetrics) => boolean;
}

export interface RepConfig {
    type: 'phase' | 'breathing' | 'hold';
    phases: PhaseCondition[];
    minPhaseDurationMs: number;
    cooldownMs: number;
    stableFramesRequired: number;
    breatheInDuration?: number;
    holdDuration?: number;
    breatheOutDuration?: number;
}

export interface RepDetectionResult {
    repCompleted: boolean;
    currentPhase: PhaseName;
    phaseName: string;
    phaseProgress: number;
    feedback: string;
    confidence: number;
    debugInfo?: string;
}

export interface BreathingState {
    phase: 'breatheIn' | 'hold' | 'breatheOut';
    countdown: number;
    totalDuration: number;
}

// ============================================
// SIMPLIFIED REP DETECTOR
// ============================================

export class RepDetector {
    private config: RepConfig;
    private currentPhaseIndex: number = 0;
    private phaseStartTime: number = 0;
    private lastRepTime: number = 0;
    private stableFrameCount: number = 0;
    private totalReps: number = 0;
    private smoother: MetricsSmoother;
    private debugMetrics: PoseMetrics | null = null;

    constructor(config: RepConfig) {
        this.config = config;
        this.smoother = new MetricsSmoother(3);
        this.reset();
    }

    reset(): void {
        this.currentPhaseIndex = 0;
        this.phaseStartTime = Date.now();
        this.lastRepTime = 0;
        this.stableFrameCount = 0;
        this.totalReps = 0;
        this.smoother.reset();
    }

    update(rawMetrics: PoseMetrics): RepDetectionResult {
        const now = Date.now();
        const phases = this.config.phases;

        // Apply smoothing
        const metrics = this.smoother.smooth(rawMetrics);
        this.debugMetrics = metrics;

        // Low confidence handling
        if (metrics.confidence < 0.4) {
            return {
                repCompleted: false,
                currentPhase: phases[this.currentPhaseIndex]?.name || 'neutral',
                phaseName: '📸 Pastikan tubuh terlihat',
                phaseProgress: this.currentPhaseIndex / Math.max(1, phases.length),
                feedback: 'Posisi tidak terdeteksi',
                confidence: metrics.confidence,
            };
        }

        if (phases.length === 0) {
            return {
                repCompleted: false,
                currentPhase: 'neutral',
                phaseName: 'Menunggu...',
                phaseProgress: 0,
                feedback: '',
                confidence: metrics.confidence,
            };
        }

        const currentPhase = phases[this.currentPhaseIndex];
        const nextPhaseIndex = (this.currentPhaseIndex + 1) % phases.length;
        const nextPhase = phases[nextPhaseIndex];

        // Simple check: are we in the next phase?
        const isInNextPhase = nextPhase.check(metrics);
        const isInCurrentPhase = currentPhase.check(metrics);

        // Debug info
        const debugInfo = `Phase ${this.currentPhaseIndex}: curr=${isInCurrentPhase}, next=${isInNextPhase}, stable=${this.stableFrameCount}`;

        if (isInNextPhase) {
            this.stableFrameCount++;

            // Need stable frames before transitioning
            if (this.stableFrameCount >= this.config.stableFramesRequired) {
                const phaseDuration = now - this.phaseStartTime;

                // Check minimum phase duration
                if (phaseDuration >= this.config.minPhaseDurationMs) {
                    // Check if this completes a rep (going back to phase 0)
                    const completesRep = nextPhaseIndex === 0 && this.currentPhaseIndex > 0;
                    const cooldownOk = now - this.lastRepTime >= this.config.cooldownMs;

                    // Transition!
                    this.currentPhaseIndex = nextPhaseIndex;
                    this.phaseStartTime = now;
                    this.stableFrameCount = 0;

                    if (completesRep && cooldownOk) {
                        this.lastRepTime = now;
                        this.totalReps++;
                        return {
                            repCompleted: true,
                            currentPhase: nextPhase.name,
                            phaseName: '✅ ' + nextPhase.displayName,
                            phaseProgress: 1,
                            feedback: 'Gerakan sempurna!',
                            confidence: metrics.confidence,
                            debugInfo,
                        };
                    }

                    // Phase transition but not complete rep
                    return {
                        repCompleted: false,
                        currentPhase: nextPhase.name,
                        phaseName: nextPhase.displayName,
                        phaseProgress: nextPhaseIndex / phases.length,
                        feedback: `Bagus! Lanjut ke fase berikutnya`,
                        confidence: metrics.confidence,
                        debugInfo,
                    };
                }
            }
        } else {
            // Decay stable count slowly
            this.stableFrameCount = Math.max(0, this.stableFrameCount - 1);
        }

        // Calculate progress
        const progress = this.currentPhaseIndex / phases.length;

        // Generate feedback
        let feedback = '';
        if (isInCurrentPhase) {
            feedback = `✅ ${currentPhase.displayName}`;
        } else {
            feedback = `🎯 Menuju: ${nextPhase.displayName}`;
        }

        return {
            repCompleted: false,
            currentPhase: currentPhase.name,
            phaseName: currentPhase.displayName,
            phaseProgress: progress,
            feedback,
            confidence: metrics.confidence,
            debugInfo,
        };
    }

    getTotalReps(): number {
        return this.totalReps;
    }

    getDebugMetrics(): PoseMetrics | null {
        return this.debugMetrics;
    }
}

// ============================================
// BREATHING GUIDE
// ============================================

export class BreathingGuide {
    private breatheInDuration: number;
    private holdDuration: number;
    private breatheOutDuration: number;
    private cycleStartTime: number = 0;
    private repCount: number = 0;
    private isRunning: boolean = false;
    private lastPhase: 'breatheIn' | 'hold' | 'breatheOut' = 'breatheIn';

    constructor(breatheIn: number = 4, hold: number = 2, breatheOut: number = 4) {
        this.breatheInDuration = breatheIn;
        this.holdDuration = hold;
        this.breatheOutDuration = breatheOut;
    }

    start(): void {
        this.cycleStartTime = Date.now();
        this.isRunning = true;
        this.repCount = 0;
        this.lastPhase = 'breatheIn';
    }

    stop(): void {
        this.isRunning = false;
    }

    getState(): BreathingState & { repCompleted: boolean; totalReps: number; phaseChanged: boolean } {
        if (!this.isRunning) {
            return {
                phase: 'breatheIn',
                countdown: this.breatheInDuration,
                totalDuration: this.breatheInDuration,
                repCompleted: false,
                totalReps: this.repCount,
                phaseChanged: false,
            };
        }

        const now = Date.now();
        const cycleLength = (this.breatheInDuration + this.holdDuration + this.breatheOutDuration) * 1000;
        const elapsed = (now - this.cycleStartTime) % cycleLength;
        const elapsedSeconds = elapsed / 1000;

        const currentCycle = Math.floor((now - this.cycleStartTime) / cycleLength);
        let repCompleted = false;
        if (currentCycle > this.repCount) {
            this.repCount = currentCycle;
            repCompleted = true;
        }

        let phase: 'breatheIn' | 'hold' | 'breatheOut';
        let countdown: number;
        let totalDuration: number;

        if (elapsedSeconds < this.breatheInDuration) {
            phase = 'breatheIn';
            countdown = Math.ceil(this.breatheInDuration - elapsedSeconds);
            totalDuration = this.breatheInDuration;
        } else if (elapsedSeconds < this.breatheInDuration + this.holdDuration) {
            phase = 'hold';
            countdown = Math.ceil(this.breatheInDuration + this.holdDuration - elapsedSeconds);
            totalDuration = this.holdDuration;
        } else {
            phase = 'breatheOut';
            countdown = Math.ceil(cycleLength / 1000 - elapsedSeconds);
            totalDuration = this.breatheOutDuration;
        }

        const phaseChanged = phase !== this.lastPhase;
        this.lastPhase = phase;

        return {
            phase,
            countdown,
            totalDuration,
            repCompleted,
            totalReps: this.repCount,
            phaseChanged,
        };
    }
}

// ============================================
// POSE METRICS EXTRACTION (SIMPLIFIED)
// ============================================

export function extractPoseMetrics(landmarks: NormalizedLandmark[]): PoseMetrics {
    // Get key landmarks
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmark.LEFT_HIP];
    const rightHip = landmarks[PoseLandmark.RIGHT_HIP];
    const leftElbow = landmarks[PoseLandmark.LEFT_ELBOW];
    const rightElbow = landmarks[PoseLandmark.RIGHT_ELBOW];
    const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
    const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];
    const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmark.RIGHT_KNEE];

    // Calculate confidence from visibility
    const getVis = (l: NormalizedLandmark) => l.visibility ?? 0.5;
    const keyLandmarks = [leftShoulder, rightShoulder, leftHip, rightHip, leftElbow, rightElbow, leftWrist, rightWrist];
    const confidence = keyLandmarks.reduce((sum, l) => sum + getVis(l), 0) / keyLandmarks.length;

    // Midpoints
    const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const midHipX = (leftHip.x + rightHip.x) / 2;
    const midHipY = (leftHip.y + rightHip.y) / 2;

    // Spine angle (forward/backward lean)
    // Positive = leaning forward (shoulders in front of hips in screen coords)
    // In screen coords, smaller Y = higher on screen
    const spineAngle = Math.atan2(midShoulderX - midHipX, midHipY - midShoulderY) * 180 / Math.PI;

    // Body lean X (side lean)
    // Positive = leaning right (shoulders right of hips)
    const bodyLeanX = (midShoulderX - midHipX) * 100;

    // Shoulder width (normalized by hip width for consistency)
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) / Math.max(0.01, hipWidth);

    // Elbow angles
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Arm positions relative to shoulders (normalized)
    // Y: positive = wrist below shoulder, negative = wrist above shoulder
    const leftArmY = (leftWrist.y - leftShoulder.y) * 100;
    const rightArmY = (rightWrist.y - rightShoulder.y) * 100;

    // X: positive = wrist to the outside, negative = wrist to the inside
    const leftArmX = (leftShoulder.x - leftWrist.x) * 100; // Left wrist is to the left of left shoulder = positive
    const rightArmX = (rightWrist.x - rightShoulder.x) * 100; // Right wrist is to the right = positive

    // Knee spread (normalized)
    const kneeSpread = Math.abs(leftKnee.x - rightKnee.x) / Math.max(0.01, hipWidth);

    return {
        spineAngle,
        shoulderWidth,
        leftElbowAngle,
        rightElbowAngle,
        avgElbowAngle,
        leftArmY,
        rightArmY,
        leftArmX,
        rightArmX,
        bodyLeanX,
        kneeSpread,
        confidence,
    };
}

// ============================================
// REP CONFIGS - SIMPLIFIED AND TESTED
// ============================================

export const repConfigs: Record<string, RepConfig> = {
    // ========== BREATHING EXERCISES ==========

    'diaphragmatic-breathing': {
        type: 'breathing',
        phases: [],
        minPhaseDurationMs: 0,
        cooldownMs: 0,
        stableFramesRequired: 1,
        breatheInDuration: 4,
        holdDuration: 2,
        breatheOutDuration: 4
    },

    'labor-breathing': {
        type: 'breathing',
        phases: [],
        minPhaseDurationMs: 0,
        cooldownMs: 0,
        stableFramesRequired: 1,
        breatheInDuration: 4,
        holdDuration: 6,
        breatheOutDuration: 8
    },

    // ========== ANGKAT TANGAN KE ATAS (was Cat-Cow) ==========
    // Arms at sides -> Arms overhead -> Arms down
    // leftArmY/rightArmY: positive = wrist below shoulder, negative = wrist above

    'seated-cat-cow': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Tangan di Samping',
                check: (m) => m.leftArmY > 10 && m.rightArmY > 10, // Wrists below shoulders
            },
            {
                name: 'phase1',
                displayName: 'Angkat ke Atas',
                check: (m) => m.leftArmY < -15 || m.rightArmY < -15, // Wrists above shoulders
            }
        ],
        minPhaseDurationMs: 300,
        cooldownMs: 500,
        stableFramesRequired: 3,
    },

    // ========== CHEST FLY (was Scapular Retraction) ==========
    // Arms open to sides -> Arms closed in front (like hugging)
    // Uses elbow angle: extended = open, bent = closed

    'scapular-retraction': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Buka ke Samping',
                check: (m) => m.avgElbowAngle > 130, // Arms extended/open
            },
            {
                name: 'phase1',
                displayName: 'Tutup ke Depan',
                check: (m) => m.avgElbowAngle < 90, // Arms closed/hugging
            }
        ],
        minPhaseDurationMs: 300,
        cooldownMs: 500,
        stableFramesRequired: 3,
    },

    // ========== PELVIC TILT ==========

    'pelvic-tilt': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Posisi Netral',
                check: (m) => m.spineAngle > -8 && m.spineAngle < 8,
            },
            {
                name: 'phase1',
                displayName: 'Tilt Panggul',
                check: (m) => m.spineAngle >= 12 || m.spineAngle <= -12,
            }
        ],
        minPhaseDurationMs: 400,
        cooldownMs: 500,
        stableFramesRequired: 3,
    },

    // ========== SEATED ROW ==========
    // Arms extended (elbows straight) -> Arms pulled back (elbows bent)

    'seated-row': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Tangan Lurus',
                check: (m) => m.avgElbowAngle > 140, // Arms extended
            },
            {
                name: 'phase1',
                displayName: 'Tarik ke Belakang',
                check: (m) => m.avgElbowAngle < 100, // Elbows bent
            }
        ],
        minPhaseDurationMs: 300,
        cooldownMs: 500,
        stableFramesRequired: 3,
    },

    // ========== SIDE BEND ==========
    // Use arm height difference: raise one arm, then the other
    // Much more detectable than body lean

    'side-bend': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Kedua Tangan Turun',
                check: (m) => m.leftArmY > 5 && m.rightArmY > 5, // Both arms down
            },
            {
                name: 'phase1',
                displayName: 'Angkat Tangan Kiri',
                check: (m) => m.leftArmY < -10 && m.rightArmY > 0, // Left up, right down
            },
            {
                name: 'phase2',
                displayName: 'Turunkan',
                check: (m) => m.leftArmY > 5 && m.rightArmY > 5, // Both down again
            },
            {
                name: 'phase3',
                displayName: 'Angkat Tangan Kanan',
                check: (m) => m.rightArmY < -10 && m.leftArmY > 0, // Right up, left down
            }
        ],
        minPhaseDurationMs: 200,
        cooldownMs: 400,
        stableFramesRequired: 2,
    },

    // ========== BUTTERFLY SITTING ==========
    // Knees together -> Knees apart

    'butterfly-sitting': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Lutut Rapat',
                check: (m) => m.kneeSpread < 1.5,
            },
            {
                name: 'phase1',
                displayName: 'Buka Lutut',
                check: (m) => m.kneeSpread >= 2.0, // Knees wide apart
            }
        ],
        minPhaseDurationMs: 500,
        cooldownMs: 800,
        stableFramesRequired: 4,
    },

    // ========== ARM CIRCLES / PUTARAN LENGAN ==========
    // Simplified: arms at sides -> arms up high -> arms down low
    // Using both arms must go up together

    'arm-circles': {
        type: 'phase',
        phases: [
            {
                name: 'neutral',
                displayName: 'Tangan di Samping',
                check: (m) => {
                    // Both wrists at roughly shoulder height (within 15 units)
                    return Math.abs(m.leftArmY) < 20 && Math.abs(m.rightArmY) < 20;
                },
            },
            {
                name: 'phase1',
                displayName: 'Angkat Tinggi',
                check: (m) => m.leftArmY < -20 && m.rightArmY < -20, // Both arms up high
            },
            {
                name: 'phase2',
                displayName: 'Turunkan',
                check: (m) => m.leftArmY > 25 && m.rightArmY > 25, // Both arms down low
            }
        ],
        minPhaseDurationMs: 200,
        cooldownMs: 400,
        stableFramesRequired: 2,
    }
};

// Helper to get rep config by exercise ID
export function getRepConfig(exerciseId: string): RepConfig {
    return repConfigs[exerciseId] || {
        type: 'phase',
        phases: [],
        minPhaseDurationMs: 300,
        cooldownMs: 500,
        stableFramesRequired: 3,
    };
}

// Helper to create a rep detector
export function createRepDetector(exerciseId: string): RepDetector {
    const config = getRepConfig(exerciseId);
    return new RepDetector(config);
}
