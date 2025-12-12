import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { calculateAngle, isAngleInRange, getAngleFeedback, calculateDistance, PoseLandmark } from './pose-utils';

export interface Exercise {
    id: string;
    name: string;
    description: string;
    instructions: string[];
    targetReps?: number;
    duration?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    trimesterSafe: (1 | 2 | 3)[];
    validate: (landmarks: NormalizedLandmark[]) => ExerciseValidation;
    icon: string;
    category: 'breathing' | 'flexibility' | 'strength' | 'relaxation';
}

export interface ExerciseValidation {
    isCorrect: boolean;
    feedback: string[];
    keyAngles: {
        name: string;
        current: number;
        target: number;
        status: 'correct' | 'close' | 'incorrect';
    }[];
}

// ============================================
// HELPER FUNCTIONS FOR ACCURATE POSE DETECTION
// ============================================

/**
 * Get midpoint between two landmarks
 */
function getMidpoint(p1: NormalizedLandmark, p2: NormalizedLandmark): { x: number; y: number; z: number } {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
    };
}

/**
 * Calculate spine angle from vertical (0 = perfectly upright)
 */
function getSpineAngle(landmarks: NormalizedLandmark[]): number {
    const midShoulder = getMidpoint(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_SHOULDER]
    );
    const midHip = getMidpoint(
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.RIGHT_HIP]
    );

    // Angle from vertical (y-axis)
    const dx = midShoulder.x - midHip.x;
    const dy = midShoulder.y - midHip.y;

    // atan2 gives angle from x-axis, we want from y-axis
    // Vertical up would be atan2(-1, 0) = -90 deg
    const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * 180 / Math.PI);
    return angleFromVertical;
}

/**
 * Check if shoulders are level (not tilted)
 */
function getShoulderTiltAngle(landmarks: NormalizedLandmark[]): number {
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

    const dy = leftShoulder.y - rightShoulder.y;
    const dx = leftShoulder.x - rightShoulder.x;

    return Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
}

/**
 * Check if shoulders are elevated (tensed up towards ears)
 */
function getShoulderElevation(landmarks: NormalizedLandmark[]): number {
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const leftEar = landmarks[PoseLandmark.LEFT_EAR];

    // Distance from ear to shoulder (smaller = more elevated/tensed)
    return Math.abs(leftShoulder.y - leftEar.y);
}

/**
 * Check hip alignment (are hips level?)
 */
function getHipTiltAngle(landmarks: NormalizedLandmark[]): number {
    const leftHip = landmarks[PoseLandmark.LEFT_HIP];
    const rightHip = landmarks[PoseLandmark.RIGHT_HIP];

    const dy = leftHip.y - rightHip.y;
    const dx = leftHip.x - rightHip.x;

    return Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
}

// ============================================
// TRIMESTER 1 EXERCISES
// ============================================

/**
 * Diaphragmatic Breathing + Pelvic Floor Coordination
 * - Seated upright position
 * - Relaxed shoulders
 * - Spine vertical
 */
function validateDiaphragmaticBreathing(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];
    let correctCount = 0;
    const totalChecks = 3;

    // 1. Spine verticality (should be < 10 degrees from vertical)
    const spineAngle = getSpineAngle(landmarks);
    const spineStatus = getAngleFeedback(spineAngle, 0, 10);
    keyAngles.push({
        name: 'Postur Tegak',
        current: Math.round(spineAngle),
        target: 0,
        status: spineStatus
    });

    if (spineStatus === 'correct') {
        correctCount++;
        feedback.push('✅ Postur tegak sempurna');
    } else if (spineAngle > 20) {
        feedback.push('⚠️ Tegakkan punggung, jangan membungkuk');
    } else if (spineAngle > 10) {
        feedback.push('↑ Sedikit lagi, tegakkan punggung');
    }

    // 2. Shoulder relaxation (not elevated towards ears)
    const shoulderElevation = getShoulderElevation(landmarks);
    const isRelaxed = shoulderElevation > 0.12; // Normalized distance
    keyAngles.push({
        name: 'Relaksasi Bahu',
        current: Math.round(shoulderElevation * 100),
        target: 15,
        status: isRelaxed ? 'correct' : 'incorrect'
    });

    if (isRelaxed) {
        correctCount++;
    } else {
        feedback.push('⚠️ Turunkan bahu, jangan tegang');
    }

    // 3. Shoulder level (not tilted)
    const shoulderTilt = getShoulderTiltAngle(landmarks);
    const isShouldersLevel = Math.abs(shoulderTilt) < 8 || Math.abs(shoulderTilt - 180) < 8;
    keyAngles.push({
        name: 'Keseimbangan Bahu',
        current: Math.round(shoulderTilt),
        target: 0,
        status: isShouldersLevel ? 'correct' : 'close'
    });

    if (isShouldersLevel) {
        correctCount++;
    } else {
        feedback.push('↔️ Sejajarkan kedua bahu');
    }

    const isCorrect = correctCount >= 2;
    if (isCorrect && feedback.length === 1) {
        feedback.push('🌬️ Tarik napas dalam... buang perlahan');
    }

    return { isCorrect, feedback, keyAngles };
}

/**
 * Arm Raises (Angkat Tangan ke Atas)
 * - Arms go from sides to overhead
 * - Easy to detect with front camera
 */
function validateCatCow(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];
    const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
    const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];

    // Check arm height: wrist Y relative to shoulder Y
    // Negative = wrist above shoulder (arms raised)
    const leftArmHeight = (leftWrist.y - leftShoulder.y) * 100;
    const rightArmHeight = (rightWrist.y - rightShoulder.y) * 100;
    const avgArmHeight = (leftArmHeight + rightArmHeight) / 2;

    // Determine position
    let armStatus: 'correct' | 'close' | 'incorrect' = 'incorrect';
    if (avgArmHeight < -20) {
        armStatus = 'correct'; // Arms up high
        feedback.push('✅ Tangan terangkat tinggi! Bagus!');
    } else if (avgArmHeight > 15) {
        armStatus = 'close'; // Arms at sides
        feedback.push('⬆️ Angkat tangan ke atas');
    } else {
        armStatus = 'close'; // Transitioning
        feedback.push('↑ Terus angkat tangan lebih tinggi');
    }

    keyAngles.push({
        name: 'Tinggi Tangan',
        current: Math.round(-avgArmHeight), // Invert for display
        target: 30,
        status: armStatus
    });

    // Check arm symmetry
    const armDiff = Math.abs(leftArmHeight - rightArmHeight);
    const isSymmetric = armDiff < 15;
    keyAngles.push({
        name: 'Keseimbangan',
        current: Math.round(armDiff),
        target: 0,
        status: isSymmetric ? 'correct' : 'close'
    });

    if (!isSymmetric) {
        feedback.push('↔️ Angkat kedua tangan secara seimbang');
    }

    return {
        isCorrect: armStatus === 'correct' || armStatus === 'close',
        feedback,
        keyAngles
    };
}

/**
 * Chest Fly (Buka-Tutup Tangan)
 * - Arms open to sides then close in front (like hugging)
 * - Detection via elbow angle
 */
function validateScapularRetraction(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Calculate elbow angles
    const leftElbowAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.LEFT_ELBOW],
        landmarks[PoseLandmark.LEFT_WRIST]
    );
    const rightElbowAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_ELBOW],
        landmarks[PoseLandmark.RIGHT_WRIST]
    );
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Determine position
    let status: 'correct' | 'close' | 'incorrect' = 'incorrect';
    if (avgElbowAngle < 90) {
        status = 'correct'; // Arms closed (hugging position)
        feedback.push('✅ Tangan tertutup sempurna!');
    } else if (avgElbowAngle > 130) {
        status = 'close'; // Arms open
        feedback.push('🤗 Tutup tangan ke depan dada');
    } else {
        status = 'close'; // Transitioning
        feedback.push('→ Tutup lebih rapat');
    }

    keyAngles.push({
        name: 'Posisi Tangan',
        current: Math.round(avgElbowAngle),
        target: 70,
        status: status
    });

    // Check symmetry
    const diff = Math.abs(leftElbowAngle - rightElbowAngle);
    const isSymmetric = diff < 20;
    keyAngles.push({
        name: 'Keseimbangan',
        current: Math.round(diff),
        target: 0,
        status: isSymmetric ? 'correct' : 'close'
    });

    if (!isSymmetric) {
        feedback.push('↔️ Gerakkan kedua tangan secara seimbang');
    }

    return {
        isCorrect: status === 'correct' || status === 'close',
        feedback,
        keyAngles
    };
}

// ============================================
// TRIMESTER 2 EXERCISES
// ============================================

/**
 * Seated Pelvic Tilt Training
 * - Micro-range hip movement
 * - Stable upper body
 * - No excessive lumbar arch
 */
function validatePelvicTilt(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Hip angle (shoulder-hip-knee)
    const leftHipAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.LEFT_KNEE]
    );
    const rightHipAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_HIP],
        landmarks[PoseLandmark.RIGHT_KNEE]
    );
    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

    // For pelvic tilt, we want small controlled movements around 90 degrees
    const hipStatus = getAngleFeedback(avgHipAngle, 90, 15);
    keyAngles.push({
        name: 'Sudut Panggul',
        current: Math.round(avgHipAngle),
        target: 90,
        status: hipStatus
    });

    // Check for excessive lumbar arch (spine angle)
    const spineAngle = getSpineAngle(landmarks);
    const isStable = spineAngle < 20;
    keyAngles.push({
        name: 'Stabilitas Punggung',
        current: Math.round(spineAngle),
        target: 0,
        status: isStable ? 'correct' : 'incorrect'
    });

    if (avgHipAngle < 75) {
        feedback.push('⬆️ Terlalu membungkuk, tegakkan sedikit');
    } else if (avgHipAngle > 105) {
        feedback.push('⬇️ Terlalu melengkung, netralkan pinggang');
    } else {
        feedback.push('✅ Range gerak bagus!');
    }

    if (!isStable) {
        feedback.push('⚠️ Jaga punggung atas tetap stabil');
    }

    // Hip symmetry
    const hipDiff = Math.abs(leftHipAngle - rightHipAngle);
    if (hipDiff > 15) {
        feedback.push('↔️ Seimbangkan kedua sisi panggul');
    }

    return {
        isCorrect: hipStatus !== 'incorrect' && isStable,
        feedback,
        keyAngles
    };
}

/**
 * Seated Resistance Band Row
 * - Elbows pulling back
 * - Shoulders down
 * - Back engagement
 */
function validateRow(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];
    let correctCount = 0;

    // 1. Elbow angle (shoulder-elbow-wrist) - should bend when rowing
    const leftElbowAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.LEFT_ELBOW],
        landmarks[PoseLandmark.LEFT_WRIST]
    );
    const rightElbowAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_ELBOW],
        landmarks[PoseLandmark.RIGHT_WRIST]
    );
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Target: 70-110 degrees at peak contraction
    const elbowStatus = getAngleFeedback(avgElbowAngle, 90, 25);
    keyAngles.push({
        name: 'Sudut Siku',
        current: Math.round(avgElbowAngle),
        target: 90,
        status: elbowStatus
    });

    if (elbowStatus === 'correct') {
        correctCount++;
        feedback.push('✅ Tarikan bagus!');
    } else if (avgElbowAngle > 140) {
        feedback.push('← Tarik siku lebih ke belakang');
    } else if (avgElbowAngle < 50) {
        feedback.push('→ Jangan terlalu menekuk, kendurkan sedikit');
    }

    // 2. Elbow position relative to body (should stay close)
    const leftElbow = landmarks[PoseLandmark.LEFT_ELBOW];
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const elbowFlare = Math.abs(leftElbow.x - leftShoulder.x);

    const isElbowClose = elbowFlare < 0.15;
    keyAngles.push({
        name: 'Posisi Siku',
        current: Math.round(elbowFlare * 100),
        target: 10,
        status: isElbowClose ? 'correct' : 'close'
    });

    if (!isElbowClose) {
        feedback.push('⬅️➡️ Jaga siku dekat tubuh');
    } else {
        correctCount++;
    }

    // 3. Spine stability
    const spineAngle = getSpineAngle(landmarks);
    const isStable = spineAngle < 15;
    keyAngles.push({
        name: 'Stabilitas',
        current: Math.round(spineAngle),
        target: 0,
        status: isStable ? 'correct' : 'incorrect'
    });

    if (!isStable) {
        feedback.push('↕️ Jaga punggung tetap tegak');
    } else {
        correctCount++;
    }

    return {
        isCorrect: correctCount >= 2,
        feedback,
        keyAngles
    };
}

/**
 * Modified Side Bend
 * - Controlled lateral deviation < 15 degrees
 * - Stable hips
 */
function validateSideBend(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Calculate lateral tilt of spine
    const midShoulder = getMidpoint(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_SHOULDER]
    );
    const midHip = getMidpoint(
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.RIGHT_HIP]
    );

    // Lateral deviation from center
    const lateralDeviation = (midShoulder.x - midHip.x) * 100; // Positive = right, Negative = left
    const absDeviation = Math.abs(lateralDeviation);

    // Safe range: 5-15 degrees of lateral bend
    let status: 'correct' | 'close' | 'incorrect';
    if (absDeviation >= 5 && absDeviation <= 15) {
        status = 'correct';
        feedback.push('✅ Kemiringan sempurna!');
    } else if (absDeviation < 5) {
        status = 'close';
        feedback.push('↔️ Miringkan sedikit ke samping');
    } else if (absDeviation > 15 && absDeviation <= 25) {
        status = 'close';
        feedback.push('⚠️ Sedikit terlalu jauh, kurangi kemiringan');
    } else {
        status = 'incorrect';
        feedback.push('⚠️ Terlalu miring! Kembali ke posisi aman');
    }

    keyAngles.push({
        name: 'Kemiringan Lateral',
        current: Math.round(absDeviation),
        target: 10,
        status: status
    });

    // Check hip stability (hips should stay level)
    const hipTilt = getHipTiltAngle(landmarks);
    const isHipStable = Math.abs(hipTilt) < 10 || Math.abs(hipTilt - 180) < 10;
    keyAngles.push({
        name: 'Stabilitas Panggul',
        current: Math.round(Math.min(hipTilt, 180 - hipTilt)),
        target: 0,
        status: isHipStable ? 'correct' : 'incorrect'
    });

    if (!isHipStable) {
        feedback.push('⚖️ Jaga panggul tetap stabil');
    }

    // Direction indicator
    if (lateralDeviation > 3) {
        feedback.push('→ Miring ke kanan');
    } else if (lateralDeviation < -3) {
        feedback.push('← Miring ke kiri');
    }

    return {
        isCorrect: status !== 'incorrect' && isHipStable,
        feedback,
        keyAngles
    };
}

// ============================================
// TRIMESTER 3 EXERCISES
// ============================================

/**
 * Labor-Breathing Pattern (4-6-8 Rhythm)
 * - Relaxed posture
 * - Minimal chest lift
 * - Calm state
 */
function validateBreathingPattern(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];
    let correctCount = 0;

    // 1. Upright posture
    const spineAngle = getSpineAngle(landmarks);
    const isUpright = spineAngle < 12;
    keyAngles.push({
        name: 'Postur',
        current: Math.round(spineAngle),
        target: 0,
        status: isUpright ? 'correct' : 'close'
    });

    if (isUpright) {
        correctCount++;
    } else {
        feedback.push('↑ Tegakkan punggung dengan nyaman');
    }

    // 2. Shoulder relaxation
    const shoulderElevation = getShoulderElevation(landmarks);
    const isRelaxed = shoulderElevation > 0.11;
    keyAngles.push({
        name: 'Relaksasi',
        current: Math.round(shoulderElevation * 100),
        target: 15,
        status: isRelaxed ? 'correct' : 'incorrect'
    });

    if (isRelaxed) {
        correctCount++;
        feedback.push('✅ Bahu rileks');
    } else {
        feedback.push('⬇️ Lepaskan ketegangan di bahu');
    }

    // 3. Shoulders symmetrical
    const shoulderTilt = getShoulderTiltAngle(landmarks);
    const isBalanced = Math.abs(shoulderTilt) < 8 || Math.abs(shoulderTilt - 180) < 8;
    if (isBalanced) correctCount++;

    // Breathing guidance
    if (correctCount >= 2) {
        feedback.push('🌬️ Tarik napas 4 hitungan...');
        feedback.push('⏸️ Tahan sebentar...');
        feedback.push('💨 Buang napas 8 hitungan...');
    }

    return {
        isCorrect: correctCount >= 2,
        feedback,
        keyAngles
    };
}

/**
 * Butterfly Sitting (Passive Hip Opening)
 * - Knee height symmetry
 * - Spine vertical
 * - No forcing
 */
function validateButterfly(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];
    let correctCount = 0;

    // 1. Knee symmetry (left and right knee should be at similar height)
    const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmark.RIGHT_KNEE];
    const kneeDiff = Math.abs(leftKnee.y - rightKnee.y);
    const isKneeSymmetric = kneeDiff < 0.08;

    keyAngles.push({
        name: 'Simetri Lutut',
        current: Math.round(kneeDiff * 100),
        target: 0,
        status: isKneeSymmetric ? 'correct' : 'close'
    });

    if (isKneeSymmetric) {
        correctCount++;
        feedback.push('✅ Lutut seimbang');
    } else {
        if (leftKnee.y > rightKnee.y) {
            feedback.push('⬆️ Angkat lutut kiri sedikit');
        } else {
            feedback.push('⬆️ Angkat lutut kanan sedikit');
        }
    }

    // 2. Spine verticality
    const spineAngle = getSpineAngle(landmarks);
    const isSpineUpright = spineAngle < 12;
    keyAngles.push({
        name: 'Postur Tegak',
        current: Math.round(spineAngle),
        target: 0,
        status: isSpineUpright ? 'correct' : 'incorrect'
    });

    if (isSpineUpright) {
        correctCount++;
        feedback.push('✅ Punggung tegak');
    } else {
        feedback.push('↑ Tegakkan punggung, jangan membungkuk');
    }

    // 3. Hip openness (knee spread)
    const kneeSpread = Math.abs(leftKnee.x - rightKnee.x);
    const isOpen = kneeSpread > 0.25;
    keyAngles.push({
        name: 'Bukaan Panggul',
        current: Math.round(kneeSpread * 100),
        target: 30,
        status: isOpen ? 'correct' : 'close'
    });

    if (isOpen) {
        correctCount++;
    } else {
        feedback.push('🦋 Biarkan lutut turun perlahan');
    }

    if (correctCount >= 2) {
        feedback.push('💫 Tahan posisi, bernapas dalam');
    }

    return {
        isCorrect: correctCount >= 2,
        feedback,
        keyAngles
    };
}

/**
 * Seated Arm Circles
 * - Controlled circular motion
 * - Shoulder ROM < 45 degrees above horizontal
 * - Smooth movement
 */
function validateArmCircles(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];
    let correctCount = 0;

    // 1. Arm height check (wrist relative to shoulder)
    const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
    const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

    // Warning if arms go too high (above shoulder level significantly)
    const leftArmHeight = leftShoulder.y - leftWrist.y;
    const rightArmHeight = rightShoulder.y - rightWrist.y;
    const maxArmHeight = Math.max(leftArmHeight, rightArmHeight);

    let armHeightStatus: 'correct' | 'close' | 'incorrect';
    if (maxArmHeight < 0.15) {
        armHeightStatus = 'correct';
        correctCount++;
    } else if (maxArmHeight < 0.25) {
        armHeightStatus = 'close';
        feedback.push('⚠️ Tangan hampir terlalu tinggi');
    } else {
        armHeightStatus = 'incorrect';
        feedback.push('⚠️ Turunkan tangan, jangan terlalu tinggi');
    }

    keyAngles.push({
        name: 'Ketinggian Lengan',
        current: Math.round(maxArmHeight * 100),
        target: 10,
        status: armHeightStatus
    });

    // 2. Arm extension (elbows should be relatively straight)
    const leftElbowAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.LEFT_ELBOW],
        landmarks[PoseLandmark.LEFT_WRIST]
    );
    const rightElbowAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_ELBOW],
        landmarks[PoseLandmark.RIGHT_WRIST]
    );
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    const elbowStatus = avgElbowAngle > 140 ? 'correct' : avgElbowAngle > 110 ? 'close' : 'incorrect';
    keyAngles.push({
        name: 'Ekstensi Lengan',
        current: Math.round(avgElbowAngle),
        target: 170,
        status: elbowStatus
    });

    if (elbowStatus === 'correct') {
        correctCount++;
        feedback.push('✅ Lengan lurus dengan baik');
    } else if (elbowStatus === 'close') {
        feedback.push('↔️ Luruskan siku sedikit lagi');
    } else {
        feedback.push('↔️ Luruskan lengan');
    }

    // 3. Symmetry check
    const armDiff = Math.abs(leftArmHeight - rightArmHeight);
    const isSymmetric = armDiff < 0.1;
    keyAngles.push({
        name: 'Simetri',
        current: Math.round(armDiff * 100),
        target: 0,
        status: isSymmetric ? 'correct' : 'close'
    });

    if (isSymmetric) {
        correctCount++;
    } else {
        feedback.push('↔️ Seimbangkan kedua lengan');
    }

    if (correctCount >= 2 && armHeightStatus !== 'incorrect') {
        feedback.push('🔄 Putar perlahan dan terkontrol');
    }

    return {
        isCorrect: correctCount >= 2 && armHeightStatus !== 'incorrect',
        feedback,
        keyAngles
    };
}

// ============================================
// EXERCISE LIBRARY
// ============================================

export const exerciseLibrary: Exercise[] = [
    // Trimester 1
    {
        id: 'diaphragmatic-breathing',
        name: 'Pernapasan Diafragma',
        description: 'Latihan napas untuk relaksasi panggul dan sirkulasi darah',
        instructions: [
            'Duduk tegak dengan nyaman di kursi',
            'Letakkan tangan di perut',
            'Tarik napas dalam (perut mengembang)',
            'Buang napas perlahan (kontraksi panggul ringan 30-40%)',
            'Jaga bahu tetap rileks'
        ],
        duration: 60,
        difficulty: 'easy',
        trimesterSafe: [1, 2, 3],
        validate: validateDiaphragmaticBreathing,
        icon: '🌬️',
        category: 'breathing'
    },
    {
        id: 'seated-cat-cow',
        name: 'Angkat Tangan ke Atas',
        description: 'Peregangan lengan untuk melancarkan sirkulasi',
        instructions: [
            'Duduk tegak dengan tangan di samping',
            'Angkat kedua tangan perlahan ke atas',
            'Tangan melewati kepala, jari menunjuk ke langit',
            'Turunkan perlahan kembali ke samping',
            'Ulangi gerakan dengan napas teratur'
        ],
        targetReps: 10,
        difficulty: 'easy',
        trimesterSafe: [1, 2],
        validate: validateCatCow,
        icon: '🙌',
        category: 'flexibility'
    },
    {
        id: 'scapular-retraction',
        name: 'Chest Fly (Buka-Tutup Tangan)',
        description: 'Melatih otot dada dengan gerakan membuka dan menutup tangan',
        instructions: [
            'Duduk tegak, rentangkan tangan ke samping',
            'Siku sedikit ditekuk',
            'Tutup tangan ke depan dada (seperti memeluk)',
            'Buka kembali ke samping',
            'Ulangi gerakan dengan teratur'
        ],
        targetReps: 12,
        difficulty: 'easy',
        trimesterSafe: [1, 2, 3],
        validate: validateScapularRetraction,
        icon: '🤗',
        category: 'strength'
    },

    // Trimester 2
    {
        id: 'pelvic-tilt',
        name: 'Pelvic Tilt Duduk',
        description: 'Menguatkan otot panggul dan punggung bawah',
        instructions: [
            'Duduk di kursi dengan kaki menapak rata',
            'Gerakkan panggul ke depan (tulang ekor ke belakang)',
            'Kembali ke posisi netral',
            'Gerakan kecil dan halus (micro-range)',
            'Jaga punggung atas tetap stabil'
        ],
        targetReps: 15,
        difficulty: 'medium',
        trimesterSafe: [2, 3],
        validate: validatePelvicTilt,
        icon: '⚖️',
        category: 'strength'
    },
    {
        id: 'seated-row',
        name: 'Seated Row (Tanpa Alat)',
        description: 'Melatih kekuatan punggung atas',
        instructions: [
            'Duduk tegak, luruskan tangan ke depan',
            'Tarik siku ke belakang (seperti menarik tali)',
            'Jaga siku dekat tubuh',
            'Rasakan kontraksi di punggung',
            'Kembali perlahan ke posisi awal'
        ],
        targetReps: 12,
        difficulty: 'medium',
        trimesterSafe: [2],
        validate: validateRow,
        icon: '🚣‍♀️',
        category: 'strength'
    },
    {
        id: 'side-bend',
        name: 'Angkat Tangan Bergantian',
        description: 'Peregangan samping dengan mengangkat tangan bergantian',
        instructions: [
            'Duduk tegak, kedua tangan di samping',
            'Angkat tangan kiri tinggi ke atas',
            'Turunkan, lalu angkat tangan kanan',
            'Rasakan peregangan di sisi tubuh',
            'Ulangi bergantian dengan teratur'
        ],
        targetReps: 10,
        difficulty: 'medium',
        trimesterSafe: [2],
        validate: validateSideBend,
        icon: '🙋‍♀️',
        category: 'flexibility'
    },

    // Trimester 3
    {
        id: 'labor-breathing',
        name: 'Pola Napas Persalinan',
        description: 'Persiapan napas 4-6-8 untuk persalinan',
        instructions: [
            'Duduk atau berbaring nyaman',
            'Tarik napas dalam 4 hitungan',
            'Tahan 6 hitungan (jika nyaman)',
            'Buang napas perlahan 8 hitungan',
            'Fokus pada ketenangan dan rileksasi'
        ],
        duration: 120,
        difficulty: 'easy',
        trimesterSafe: [3],
        validate: validateBreathingPattern,
        icon: '👶',
        category: 'relaxation'
    },
    {
        id: 'butterfly-sitting',
        name: 'Duduk Kupu-Kupu',
        description: 'Membuka panggul secara pasif dan lembut',
        instructions: [
            'Duduk di lantai, temukan kedua telapak kaki',
            'Biarkan lutut turun perlahan ke samping',
            'Jangan dipaksa tekan ke bawah',
            'Tegakkan punggung',
            'Lakukan gerakan pulse kecil (naik-turun)'
        ],
        duration: 60,
        difficulty: 'easy',
        trimesterSafe: [3],
        validate: validateButterfly,
        icon: '🦋',
        category: 'flexibility'
    },
    {
        id: 'arm-circles',
        name: 'Putaran Lengan',
        description: 'Melancarkan sirkulasi darah dan mobilitas bahu',
        instructions: [
            'Duduk atau berdiri tegak',
            'Rentangkan tangan ke samping',
            'Buat putaran kecil dengan lengan',
            'Jaga putaran tetap halus dan terkontrol',
            'Jangan angkat tangan di atas bahu'
        ],
        targetReps: 20,
        difficulty: 'easy',
        trimesterSafe: [3],
        validate: validateArmCircles,
        icon: '🔄',
        category: 'strength'
    }
];

export function getExercisesForTrimester(trimester: 1 | 2 | 3): Exercise[] {
    return exerciseLibrary.filter(ex => ex.trimesterSafe.includes(trimester));
}

export function getExerciseById(id: string): Exercise | undefined {
    return exerciseLibrary.find(ex => ex.id === id);
}
