'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PoseLandmarker, FilesetResolver, DrawingUtils, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Play, Pause, RotateCcw, Trophy, X, Home, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getExerciseById, Exercise, ExerciseValidation } from '@/app/lib/exercise-library';
import toast from 'react-hot-toast';

type ScreenState = 'tutorial' | 'countdown' | 'exercise' | 'paused' | 'results';

export default function ExerciseSessionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const exerciseId = searchParams.get('exercise');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Exercise state
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [screenState, setScreenState] = useState<ScreenState>('tutorial');
    const [countdown, setCountdown] = useState(3);
    const [repCount, setRepCount] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [currentValidation, setCurrentValidation] = useState<ExerciseValidation | null>(null);
    const [isExercising, setIsExercising] = useState(false);
    const [showTutorial, setShowTutorial] = useState(true);

    // Rep detection state - improved for accuracy
    const [isInPosition, setIsInPosition] = useState(false);
    const [lastRepTime, setLastRepTime] = useState(0);
    const [validationStreak, setValidationStreak] = useState(0);
    const [hasCountedThisRep, setHasCountedThisRep] = useState(false);

    // User data
    const [userName, setUserName] = useState('Mooma');
    const [userId, setUserId] = useState<string | null>(null);

    // Session stats
    const [sessionDuration, setSessionDuration] = useState(0);
    const [accuracy, setAccuracy] = useState(0);

    // Load exercise and check tutorial status
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push('/pages/login');
                return;
            }

            setUserId(user.uid);

            try {
                const docRef = doc(db, 'pregnancyData', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserName(data.name || 'Mooma');
                }

                // Load exercise
                if (exerciseId) {
                    const ex = getExerciseById(exerciseId);
                    if (ex) {
                        setExercise(ex);

                        // Check if tutorial has been viewed
                        const tutorialRef = doc(db, 'pregnancyData', user.uid, 'exerciseTutorials', exerciseId);
                        const tutorialSnap = await getDoc(tutorialRef);

                        if (tutorialSnap.exists()) {
                            setShowTutorial(false);
                            setScreenState('countdown');
                        }
                    } else {
                        toast.error('Exercise not found');
                        router.push('/pages/moomasehat');
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        });

        return () => unsubscribe();
    }, [router, exerciseId]);

    // Initialize MediaPipe
    useEffect(() => {
        const initializePoseLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
                );

                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                setPoseLandmarker(landmarker);
                setIsModelLoading(false);
            } catch (error) {
                console.error('Error initializing Pose Landmarker:', error);
                toast.error('Gagal memuat AI model');
                setIsModelLoading(false);
            }
        };

        initializePoseLandmarker();
    }, []);

    // Initialize camera
    useEffect(() => {
        const initializeCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setIsCameraReady(true);
                    };
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                toast.error('Tidak dapat mengakses kamera');
            }
        };

        if (!isModelLoading && poseLandmarker) {
            initializeCamera();
        }

        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isModelLoading, poseLandmarker]);

    // Pose detection loop
    useEffect(() => {
        if (!poseLandmarker || !isCameraReady || !videoRef.current || !canvasRef.current) {
            return;
        }

        let animationFrameId: number;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const detectPose = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw video frame (mirrored)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();

                // Detect pose
                const startTimeMs = performance.now();
                const results = poseLandmarker.detectForVideo(video, startTimeMs);

                if (results.landmarks && results.landmarks.length > 0) {
                    const landmarks = results.landmarks[0];

                    // Validate exercise if active
                    if (exercise && isExercising && screenState === 'exercise') {
                        const validation = exercise.validate(landmarks);
                        setCurrentValidation(validation);
                        detectRep(validation.isCorrect);
                    }

                    // Draw pose
                    drawPose(ctx, landmarks, canvas.width, canvas.height);
                }
            }

            animationFrameId = requestAnimationFrame(detectPose);
        };

        detectPose();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [poseLandmarker, isCameraReady, exercise, isExercising, screenState]);

    // Improved rep detection with streak validation
    const detectRep = (isCorrectPosition: boolean) => {
        const now = Date.now();

        // Update validation streak
        if (isCorrectPosition) {
            setValidationStreak(prev => Math.min(prev + 1, 5));
        } else {
            setValidationStreak(0);
        }

        // Require at least 3 consecutive correct validations to count as "in position"
        const isStableCorrect = validationStreak >= 3;

        // State machine for rep counting
        if (isStableCorrect && !isInPosition) {
            // Entering correct position (bottom of squat)
            setIsInPosition(true);
            setHasCountedThisRep(false);
        } else if (!isCorrectPosition && isInPosition) {
            // Exiting correct position (standing up)
            setIsInPosition(false);

            // Count the rep when leaving the correct position
            if (!hasCountedThisRep && now - lastRepTime > 1200) {
                setRepCount(prev => prev + 1);
                setLastRepTime(now);
                setHasCountedThisRep(true);

                // Celebration effect
                const confetti = ['🎉', '✨', '💪', '🌟', '⭐'];
                toast.success(`${confetti[Math.floor(Math.random() * confetti.length)]} Rep ke-${repCount + 1}!`, {
                    duration: 1000,
                    icon: '🔥'
                });
            }
        }
    };

    // Draw pose
    const drawPose = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmark[],
        width: number,
        height: number
    ) => {
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24],
            [23, 25], [25, 27], [24, 26], [26, 28],
        ];

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        // Draw connectors with thicker lines
        for (const [start, end] of connections) {
            const startLandmark = landmarks[start];
            const endLandmark = landmarks[end];

            ctx.beginPath();
            ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
            ctx.lineTo(endLandmark.x * width, endLandmark.y * height);

            let color = '#EE6983';
            if (currentValidation && isExercising) {
                color = currentValidation.isCorrect ? '#4ade80' : '#ef4444';
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        // Draw landmarks with glow effect
        for (let i = 11; i <= 28; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * width;
            const y = landmark.y * height;

            let color = '#EE6983';
            if (currentValidation && isExercising) {
                color = currentValidation.isCorrect ? '#4ade80' : '#ef4444';
            }

            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;

            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.shadowBlur = 0;
        }

        ctx.restore();
    };

    // Countdown effect
    useEffect(() => {
        if (screenState === 'countdown' && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (screenState === 'countdown' && countdown === 0) {
            startExercise();
        }
    }, [screenState, countdown]);

    // Start exercise
    const startExercise = () => {
        setScreenState('exercise');
        setIsExercising(true);
        setSessionStartTime(Date.now());
        setRepCount(0);
        setIsInPosition(false);
        setValidationStreak(0);
        setHasCountedThisRep(false);

        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                toast.error('Fullscreen tidak didukung');
            });
        }
    };

    // Mark tutorial as viewed and start countdown
    const handleStartFromTutorial = async () => {
        if (userId && exerciseId) {
            try {
                await setDoc(doc(db, 'pregnancyData', userId, 'exerciseTutorials', exerciseId), {
                    viewed: true,
                    timestamp: serverTimestamp(),
                });
            } catch (error) {
                console.error('Error saving tutorial status:', error);
            }
        }

        setScreenState('countdown');
        setCountdown(3);
    };

    // Skip tutorial
    const handleSkipTutorial = async () => {
        if (userId && exerciseId) {
            try {
                await setDoc(doc(db, 'pregnancyData', userId, 'exerciseTutorials', exerciseId), {
                    viewed: true,
                    timestamp: serverTimestamp(),
                });
            } catch (error) {
                console.error('Error saving tutorial status:', error);
            }
        }

        setScreenState('countdown');
        setCountdown(3);
    };

    // Pause exercise
    const handlePause = () => {
        setIsExercising(false);
        setScreenState('paused');
    };

    // Resume exercise
    const handleResume = () => {
        setIsExercising(true);
        setScreenState('exercise');
    };

    // Restart exercise
    const handleRestart = () => {
        setRepCount(0);
        setSessionStartTime(Date.now());
        setIsInPosition(false);
        setCurrentValidation(null);
        setValidationStreak(0);
        setHasCountedThisRep(false);
        setIsExercising(true);
        setScreenState('exercise');
    };

    // Back to menu
    const handleBackToMenu = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        router.push('/pages/moomasehat');
    };

    // Finish exercise
    const handleFinish = async () => {
        if (!exercise || !sessionStartTime) return;

        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        const calculatedAccuracy = currentValidation?.isCorrect ? 95 : 75;

        setSessionDuration(duration);
        setAccuracy(calculatedAccuracy);
        setIsExercising(false);
        setScreenState('results');

        // Save to Firebase
        if (userId) {
            try {
                await addDoc(collection(db, 'pregnancyData', userId, 'exerciseHistory'), {
                    exerciseType: exercise.name,
                    duration,
                    repsCompleted: repCount,
                    accuracy: calculatedAccuracy,
                    feedback: currentValidation?.feedback || [],
                    timestamp: serverTimestamp(),
                });
            } catch (error) {
                console.error('Error saving exercise:', error);
            }
        }
    };

    // Exercise again
    const handleExerciseAgain = () => {
        setRepCount(0);
        setSessionStartTime(Date.now());
        setIsInPosition(false);
        setCurrentValidation(null);
        setValidationStreak(0);
        setHasCountedThisRep(false);
        setCountdown(3);
        setScreenState('countdown');
    };

    if (isModelLoading || !exercise) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600">
                <div className="text-center text-white">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
                    <p className="text-xl font-bold">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
            {/* Camera Feed Background */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                style={{ transform: 'scaleX(-1)', display: 'none' }}
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Tutorial Screen */}
            {screenState === 'tutorial' && showTutorial && (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/95 to-purple-600/95 backdrop-blur-xl flex items-center justify-center z-20 p-4">
                    <div className="max-w-3xl mx-auto p-8 text-white text-center">
                        <div className="text-8xl mb-6 animate-bounce drop-shadow-2xl">{exercise.icon}</div>
                        <h1 className="text-6xl font-black mb-4 drop-shadow-lg">{exercise.name}</h1>
                        <p className="text-2xl mb-10 opacity-90">{exercise.description}</p>

                        <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 mb-8 text-left shadow-2xl">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <Sparkles className="w-8 h-8" />
                                Cara Melakukan
                            </h2>
                            <ol className="space-y-4 text-xl">
                                {exercise.instructions.map((instruction, idx) => (
                                    <li key={idx} className="flex gap-4 items-start">
                                        <span className="flex-shrink-0 w-10 h-10 bg-white/30 rounded-full flex items-center justify-center font-bold text-lg">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 pt-1">{instruction}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="flex gap-4 justify-center flex-wrap">
                            <button
                                onClick={handleStartFromTutorial}
                                className="bg-white text-pink-600 px-10 py-5 rounded-2xl font-black text-2xl hover:scale-105 transition-transform shadow-2xl flex items-center gap-3"
                            >
                                <Play className="w-7 h-7" />
                                Ayo Mulai!
                            </button>
                            <button
                                onClick={handleSkipTutorial}
                                className="bg-white/20 text-white px-8 py-5 rounded-2xl font-semibold text-xl hover:bg-white/30 transition-all"
                            >
                                Lewati Tutorial
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Countdown Screen */}
            {screenState === 'countdown' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-20">
                    <div className="text-center">
                        <h2 className="text-white text-5xl font-bold mb-12 drop-shadow-lg">{exercise.name}</h2>
                        <div className="text-white text-[250px] font-black leading-none animate-pulse drop-shadow-2xl">
                            {countdown > 0 ? countdown : 'GO!'}
                        </div>
                        <p className="text-white text-3xl mt-12 opacity-75">Bersiaplah, Mama kuat! 💪</p>
                    </div>
                </div>
            )}

            {/* Exercise Screen */}
            {screenState === 'exercise' && (
                <>
                    {/* Pause Button */}
                    <button
                        onClick={handlePause}
                        className="absolute top-8 right-8 z-30 bg-white/95 backdrop-blur-md p-5 rounded-full hover:bg-white hover:scale-110 transition-all shadow-2xl"
                    >
                        <Pause className="w-7 h-7 text-pink-600" />
                    </button>

                    {/* Rep Counter */}
                    <div className="absolute top-8 left-8 z-30 bg-white/95 backdrop-blur-md rounded-3xl px-10 py-7 shadow-2xl">
                        <div className="flex items-center gap-5">
                            <Trophy className="w-12 h-12 text-yellow-500" />
                            <div>
                                <p className="text-sm text-gray-600 font-bold uppercase tracking-wide">Repetisi</p>
                                <p className="text-6xl font-black text-pink-600 leading-none">{repCount}</p>
                                {exercise.targetReps && (
                                    <p className="text-base text-gray-500 font-semibold">dari {exercise.targetReps}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {exercise.targetReps && (
                        <div className="absolute top-36 left-8 right-8 z-30">
                            <div className="bg-white/95 backdrop-blur-md rounded-full h-5 overflow-hidden shadow-xl">
                                <div
                                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min((repCount / exercise.targetReps) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/*Feedback */}
                    {currentValidation && currentValidation.feedback.length > 0 && (
                        <div className="absolute bottom-8 left-8 right-8 z-30">
                            <div className={`backdrop-blur-md rounded-3xl p-7 shadow-2xl ${currentValidation.isCorrect ? 'bg-green-500/95' : 'bg-red-500/95'
                                }`}>
                                {currentValidation.feedback.map((fb, idx) => (
                                    <p key={idx} className="text-white text-2xl font-bold mb-2">
                                        {fb}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Finish Button */}
                    <button
                        onClick={handleFinish}
                        className="absolute bottom-8 right-8 z-30 bg-green-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-green-600 hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-7 h-7" />
                        Selesai
                    </button>
                </>
            )}

            {/* Pause Menu */}
            {screenState === 'paused' && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-40">
                    <div className="bg-white rounded-3xl p-10 max-w-lg w-full mx-4 shadow-2xl">
                        <h2 className="text-4xl font-black text-gray-800 mb-8 text-center">Jeda</h2>
                        <div className="space-y-4">
                            <button
                                onClick={handleResume}
                                className="w-full bg-pink-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-pink-700 transition-all flex items-center justify-center gap-3"
                            >
                                <Play className="w-6 h-6" />
                                Lanjutkan
                            </button>
                            <button
                                onClick={handleRestart}
                                className="w-full bg-purple-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3"
                            >
                                <RotateCcw className="w-6 h-6" />
                                Mulai Ulang
                            </button>
                            <button
                                onClick={handleBackToMenu}
                                className="w-full bg-gray-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-gray-700 transition-all flex items-center justify-center gap-3"
                            >
                                <Home className="w-6 h-6" />
                                Kembali ke Menu
                            </button>
                            <button
                                onClick={() => document.fullscreenElement && document.exitFullscreen()}
                                className="w-full bg-gray-300 text-gray-700 py-5 rounded-2xl font-bold text-xl hover:bg-gray-400 transition-all flex items-center justify-center gap-3"
                            >
                                <X className="w-6 h-6" />
                                Keluar Fullscreen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Screen */}
            {screenState === 'results' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/95 to-teal-600/95 backdrop-blur-xl flex items-center justify-center z-40 p-4">
                    <div className="max-w-3xl mx-auto p-8 text-white text-center">
                        <div className="text-9xl mb-6 animate-bounce drop-shadow-2xl">🎉</div>
                        <h1 className="text-7xl font-black mb-6 drop-shadow-lg">Luar Biasa!</h1>
                        <p className="text-3xl mb-14 opacity-90">Kamu berhasil menyelesaikan latihan!</p>

                        <div className="grid grid-cols-3 gap-8 mb-14">
                            <div className="bg-white/25 backdrop-blur-md rounded-3xl p-8 shadow-xl">
                                <Trophy className="w-14 h-14 mx-auto mb-4 text-yellow-300" />
                                <p className="text-6xl font-black mb-3">{repCount}</p>
                                <p className="text-xl opacity-90 font-semibold">Repetisi</p>
                            </div>
                            <div className="bg-white/25 backdrop-blur-md rounded-3xl p-8 shadow-xl">
                                <Sparkles className="w-14 h-14 mx-auto mb-4 text-blue-300" />
                                <p className="text-6xl font-black mb-3">{sessionDuration}s</p>
                                <p className="text-xl opacity-90 font-semibold">Durasi</p>
                            </div>
                            <div className="bg-white/25 backdrop-blur-md rounded-3xl p-8 shadow-xl">
                                <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-300" />
                                <p className="text-6xl font-black mb-3">{accuracy}%</p>
                                <p className="text-xl opacity-90 font-semibold">Akurasi</p>
                            </div>
                        </div>

                        {/* Achievement Badges */}
                        {repCount >= (exercise.targetReps || 10) && (
                            <div className="bg-white/25 backdrop-blur-md rounded-3xl p-8 mb-10 shadow-xl">
                                <p className="text-3xl font-bold mb-3">🏆 Target Tercapai!</p>
                                <p className="text-xl opacity-90">Kamu menyelesaikan semua repetisi yang ditargetkan!</p>
                            </div>
                        )}

                        <div className="flex gap-5 justify-center flex-wrap">
                            <button
                                onClick={handleExerciseAgain}
                                className="bg-white text-green-600 px-10 py-5 rounded-2xl font-black text-2xl hover:scale-105 transition-transform shadow-2xl flex items-center gap-3"
                            >
                                <RotateCcw className="w-7 h-7" />
                                Latihan Lagi
                            </button>
                            <button
                                onClick={handleBackToMenu}
                                className="bg-white/25 text-white px-10 py-5 rounded-2xl font-bold text-2xl hover:bg-white/35 transition-all flex items-center gap-3"
                            >
                                <Home className="w-7 h-7" />
                                Kembali ke Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
