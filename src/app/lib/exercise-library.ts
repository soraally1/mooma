import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { calculateAngle, isAngleInRange, PoseLandmark } from './pose-utils';

export interface Exercise {
    id: string;
    name: string;
    description: string;
    instructions: string[];
    targetReps?: number;
    duration?: number; // in seconds, for timed exercises
    difficulty: 'easy' | 'medium' | 'hard';
    trimesterSafe: (1 | 2 | 3)[];
    validate: (landmarks: NormalizedLandmark[]) => ExerciseValidation;
    icon: string;
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

/**
 * Squat Exercise Validator
 */
function validateSquat(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Calculate knee angle (hip-knee-ankle)
    const leftKneeAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.LEFT_KNEE],
        landmarks[PoseLandmark.LEFT_ANKLE]
    );

    const rightKneeAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_HIP],
        landmarks[PoseLandmark.RIGHT_KNEE],
        landmarks[PoseLandmark.RIGHT_ANKLE]
    );

    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Target: knees bent to about 90-110 degrees at bottom of squat
    const kneeStatus = isAngleInRange(avgKneeAngle, 100, 20) ? 'correct' :
        isAngleInRange(avgKneeAngle, 100, 35) ? 'close' : 'incorrect';

    keyAngles.push({
        name: 'Lutut',
        current: avgKneeAngle,
        target: 100,
        status: kneeStatus,
    });

    // Check hip angle (shoulder-hip-knee)
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

    const hipStatus = isAngleInRange(avgHipAngle, 90, 25) ? 'correct' :
        isAngleInRange(avgHipAngle, 90, 40) ? 'close' : 'incorrect';

    keyAngles.push({
        name: 'Pinggul',
        current: avgHipAngle,
        target: 90,
        status: hipStatus,
    });

    // Feedback generation
    if (avgKneeAngle > 160) {
        feedback.push('Tekuk lutut lebih dalam');
    } else if (avgKneeAngle < 70) {
        feedback.push('⚠️ Jangan terlalu dalam, lindungi lutut');
    }

    if (avgHipAngle > 120) {
        feedback.push('Turunkan pinggul lebih rendah');
    }

    // Check if knees are tracking properly (not caving in)
    const kneeDistance = Math.abs(
        landmarks[PoseLandmark.LEFT_KNEE].x - landmarks[PoseLandmark.RIGHT_KNEE].x
    );
    const hipDistance = Math.abs(
        landmarks[PoseLandmark.LEFT_HIP].x - landmarks[PoseLandmark.RIGHT_HIP].x
    );

    if (kneeDistance < hipDistance * 0.7) {
        feedback.push('⚠️ Jaga lutut sejajar dengan kaki');
    }

    const isCorrect = kneeStatus === 'correct' && hipStatus === 'correct';

    if (isCorrect) {
        feedback.push('✅ Gerakan sempurna!');
    }

    return { isCorrect, feedback, keyAngles };
}

/**
 * Arm Raises Exercise Validator
 */
function validateArmRaises(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Calculate shoulder angle (hip-shoulder-elbow)
    const leftShoulderAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.LEFT_SHOULDER],
        landmarks[PoseLandmark.LEFT_ELBOW]
    );

    const rightShoulderAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_HIP],
        landmarks[PoseLandmark.RIGHT_SHOULDER],
        landmarks[PoseLandmark.RIGHT_ELBOW]
    );

    const avgShoulderAngle = (leftShoulderAngle + rightShoulderAngle) / 2;

    // Target: arms raised to about 90 degrees (shoulder level)
    const shoulderStatus = isAngleInRange(avgShoulderAngle, 90, 15) ? 'correct' :
        isAngleInRange(avgShoulderAngle, 90, 30) ? 'close' : 'incorrect';

    keyAngles.push({
        name: 'Bahu',
        current: avgShoulderAngle,
        target: 90,
        status: shoulderStatus,
    });

    // Check elbow angle (should be straight)
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

    const elbowStatus = avgElbowAngle > 160 ? 'correct' :
        avgElbowAngle > 140 ? 'close' : 'incorrect';

    keyAngles.push({
        name: 'Siku',
        current: avgElbowAngle,
        target: 180,
        status: elbowStatus,
    });

    // Feedback
    if (avgShoulderAngle < 70) {
        feedback.push('Angkat lengan lebih tinggi');
    } else if (avgShoulderAngle > 110) {
        feedback.push('Turunkan sedikit, sejajar bahu');
    }

    if (avgElbowAngle < 160) {
        feedback.push('Luruskan siku');
    }

    const isCorrect = shoulderStatus === 'correct' && elbowStatus === 'correct';

    if (isCorrect) {
        feedback.push('✅ Gerakan sempurna!');
    }

    return { isCorrect, feedback, keyAngles };
}

/**
 * Standing Exercise Validator (for balance/standing poses)
 */
function validateStanding(landmarks: NormalizedLandmark[]): ExerciseValidation {
    const feedback: string[] = [];
    const keyAngles: ExerciseValidation['keyAngles'] = [];

    // Check if person is standing upright
    const leftKneeAngle = calculateAngle(
        landmarks[PoseLandmark.LEFT_HIP],
        landmarks[PoseLandmark.LEFT_KNEE],
        landmarks[PoseLandmark.LEFT_ANKLE]
    );

    const rightKneeAngle = calculateAngle(
        landmarks[PoseLandmark.RIGHT_HIP],
        landmarks[PoseLandmark.RIGHT_KNEE],
        landmarks[PoseLandmark.RIGHT_ANKLE]
    );

    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const kneeStatus = avgKneeAngle > 160 ? 'correct' :
        avgKneeAngle > 140 ? 'close' : 'incorrect';

    keyAngles.push({
        name: 'Postur',
        current: avgKneeAngle,
        target: 180,
        status: kneeStatus,
    });

    if (avgKneeAngle < 160) {
        feedback.push('Berdiri lebih tegak');
    } else {
        feedback.push('✅ Postur bagus!');
    }

    return { isCorrect: kneeStatus === 'correct', feedback, keyAngles };
}

/**
 * Exercise Library
 */
export const exerciseLibrary: Exercise[] = [
    {
        id: 'squat',
        name: 'Squat Mooma',
        description: 'Squat ringan untuk menguatkan kaki dan panggul',
        instructions: [
            'Berdiri dengan kaki selebar bahu',
            'Turunkan tubuh seperti duduk di kursi',
            'Jaga lutut sejajar dengan kaki',
            'Kembali ke posisi awal',
        ],
        targetReps: 10,
        difficulty: 'medium',
        trimesterSafe: [1, 2, 3],
        validate: validateSquat,
        icon: '🏋️‍♀️',
    },
    {
        id: 'arm-raises',
        name: 'Angkat Lengan',
        description: 'Latihan untuk menguatkan bahu dan lengan',
        instructions: [
            'Berdiri tegak dengan kaki rapat',
            'Angkat kedua lengan ke samping',
            'Luruskan siku',
            'Tahan sejajar bahu, lalu turunkan',
        ],
        targetReps: 12,
        difficulty: 'easy',
        trimesterSafe: [1, 2, 3],
        validate: validateArmRaises,
        icon: '💪',
    },
    {
        id: 'standing-balance',
        name: 'Berdiri Tegak',
        description: 'Latihan keseimbangan dan postur',
        instructions: [
            'Berdiri tegak dengan kaki rapat',
            'Bahu rileks',
            'Pandangan lurus ke depan',
            'Tahan posisi ini',
        ],
        duration: 30,
        difficulty: 'easy',
        trimesterSafe: [1, 2, 3],
        validate: validateStanding,
        icon: '🧘‍♀️',
    },
];

/**
 * Get exercises safe for a specific trimester
 */
export function getExercisesForTrimester(trimester: 1 | 2 | 3): Exercise[] {
    return exerciseLibrary.filter(ex => ex.trimesterSafe.includes(trimester));
}

/**
 * Get exercise by ID
 */
export function getExerciseById(id: string): Exercise | undefined {
    return exerciseLibrary.find(ex => ex.id === id);
}
