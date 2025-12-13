'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PoseLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Play, Pause, RotateCcw, Trophy, X, Home, Sparkles, CheckCircle2, Timer, Wind, PauseCircle, AirVent, Activity, AlertCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getExerciseById, Exercise, ExerciseValidation } from '@/app/lib/exercise-library';
import { RepDetector, BreathingGuide, extractPoseMetrics, getRepConfig, MetricsSmoother } from '@/app/lib/rep-detection';
import toast from 'react-hot-toast';

type ScreenState = 'tutorial' | 'countdown' | 'exercise' | 'paused' | 'results';

function ExerciseSessionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const exerciseId = searchParams.get('exercise');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
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

    // New Rep Detection System
    const repDetectorRef = useRef<RepDetector | null>(null);
    const breathingGuideRef = useRef<BreathingGuide | null>(null);
    const metricsSmootherRef = useRef<MetricsSmoother>(new MetricsSmoother(5, 0.4));
    const [currentPhase, setCurrentPhase] = useState<string>('Bersiap...');
    const [phaseProgress, setPhaseProgress] = useState(0);
    const [detectionConfidence, setDetectionConfidence] = useState(0);
    const [phaseFeedback, setPhaseFeedback] = useState<string>('');

    // Breathing state
    const [breathingPhase, setBreathingPhase] = useState<'breatheIn' | 'hold' | 'breatheOut'>('breatheIn');
    const [breathingCountdown, setBreathingCountdown] = useState(4);

    // Timer state
    const [exerciseTimer, setExerciseTimer] = useState(0);
    const [totalExerciseDuration, setTotalExerciseDuration] = useState(60);

    // User data
    const [userName, setUserName] = useState('Mooma');
    const [userId, setUserId] = useState<string | null>(null);

    // Session stats
    const [sessionDuration, setSessionDuration] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [correctFrames, setCorrectFrames] = useState(0);
    const [totalFrames, setTotalFrames] = useState(0);

    // Stop camera function
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

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

                        // Set exercise duration
                        const duration = ex.duration || (ex.targetReps ? ex.targetReps * 5 : 60);
                        setTotalExerciseDuration(duration);
                        setExerciseTimer(duration);

                        // Initialize rep detector
                        const repConfig = getRepConfig(exerciseId);
                        repDetectorRef.current = new RepDetector(repConfig);

                        // Initialize breathing guide for breathing exercises
                        if (repConfig.type === 'breathing') {
                            breathingGuideRef.current = new BreathingGuide(
                                repConfig.breatheInDuration || 4,
                                repConfig.holdDuration || 2,
                                repConfig.breatheOutDuration || 4
                            );
                        }

                        // Check if tutorial has been viewed
                        // Check if tutorial has been viewed - BUT DON'T SKIP IT
                        // We just want to know if we should show "Start" or "Start Again" maybe?
                        // For now, we ALWAYS show tutorial as per user request.
                        const tutorialRef = doc(db, 'pregnancyData', user.uid, 'exerciseTutorials', exerciseId);
                        const tutorialSnap = await getDoc(tutorialRef);

                        // if (tutorialSnap.exists()) {
                        //     setShowTutorial(false);
                        //     setScreenState('countdown');
                        // }
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

                streamRef.current = stream;

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
            stopCamera();
        };
    }, [isModelLoading, poseLandmarker, stopCamera]);

    // Exercise timer
    useEffect(() => {
        if (!isExercising || screenState !== 'exercise') return;

        const timerInterval = setInterval(() => {
            setExerciseTimer(prev => {
                if (prev <= 1) {
                    // Time's up - finish exercise
                    handleFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [isExercising, screenState]);

    // Breathing guide update
    useEffect(() => {
        if (!isExercising || screenState !== 'exercise' || !breathingGuideRef.current) return;

        const breathingInterval = setInterval(() => {
            const state = breathingGuideRef.current?.getState();
            if (state) {
                setBreathingPhase(state.phase);
                setBreathingCountdown(state.countdown);

                if (state.repCompleted) {
                    setRepCount(state.totalReps);
                    toast.success('Siklus napas selesai!', {
                        duration: 1000
                    });
                }
            }
        }, 100);

        return () => clearInterval(breathingInterval);
    }, [isExercising, screenState]);

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

                        // Update accuracy tracking
                        setTotalFrames(prev => prev + 1);
                        if (validation.isCorrect) {
                            setCorrectFrames(prev => prev + 1);
                        }

                        // Use new rep detection system (for non-breathing exercises)
                        if (repDetectorRef.current && !breathingGuideRef.current) {
                            const rawMetrics = extractPoseMetrics(landmarks);
                            const result = repDetectorRef.current.update(rawMetrics);

                            setCurrentPhase(result.phaseName);
                            setPhaseProgress(result.phaseProgress);
                            setDetectionConfidence(result.confidence);
                            setPhaseFeedback(result.feedback);

                            if (result.repCompleted) {
                                setRepCount(prev => {
                                    const newCount = prev + 1;
                                    toast.success(`Rep ke-${newCount}! Gerakan sempurna!`, {
                                        duration: 1500
                                    });
                                    return newCount;
                                });
                            }
                        }
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
    }, [poseLandmarker, isCameraReady, exercise, isExercising, screenState, repCount]);

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

            let color = '#EE6983'; // Default pink
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
        setCorrectFrames(0);
        setTotalFrames(0);

        // Reset rep detector
        repDetectorRef.current?.reset();

        // Start breathing guide if applicable
        breathingGuideRef.current?.start();

        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                // Fullscreen not supported, continue anyway
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
        breathingGuideRef.current?.stop();
    };

    // Resume exercise
    const handleResume = () => {
        setIsExercising(true);
        setScreenState('exercise');
        breathingGuideRef.current?.start();
    };

    // Restart exercise
    const handleRestart = () => {
        setRepCount(0);
        setSessionStartTime(Date.now());
        setCurrentValidation(null);
        setCorrectFrames(0);
        setTotalFrames(0);
        setExerciseTimer(totalExerciseDuration);

        repDetectorRef.current?.reset();
        breathingGuideRef.current?.start();

        setIsExercising(true);
        setScreenState('exercise');
    };

    // Back to menu with camera cleanup
    const handleBackToMenu = () => {
        stopCamera();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        router.push('/pages/moomasehat');
    };

    // Finish exercise
    const handleFinish = async () => {
        if (!exercise || !sessionStartTime) return;

        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        const calculatedAccuracy = totalFrames > 0 ? Math.round((correctFrames / totalFrames) * 100) : 75;

        setSessionDuration(duration);
        setAccuracy(calculatedAccuracy);
        setIsExercising(false);
        setScreenState('results');

        // Stop breathing guide
        breathingGuideRef.current?.stop();

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
        setCurrentValidation(null);
        setCorrectFrames(0);
        setTotalFrames(0);
        setExerciseTimer(totalExerciseDuration);

        repDetectorRef.current?.reset();

        setCountdown(3);
        setScreenState('countdown');
    };

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get breathing phase display
    const getBreathingDisplay = () => {
        switch (breathingPhase) {
            case 'breatheIn':
                return { text: 'Tarik Napas...', icon: Wind, color: 'from-blue-500 to-cyan-500' };
            case 'hold':
                return { text: 'Tahan...', icon: PauseCircle, color: 'from-purple-500 to-pink-500' };
            case 'breatheOut':
                return { text: 'Buang Napas...', icon: AirVent, color: 'from-green-500 to-teal-500' };
        }
    };

    if (isModelLoading || !exercise) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#EE6983] mb-4"></div>
                    <p className="text-xl font-bold text-[#B13455]">Memuat...</p>
                </div>
            </div>
        );
    }

    const repConfig = getRepConfig(exerciseId || '');
    const isBreathingExercise = repConfig.type === 'breathing';
    const BreathingIcon = getBreathingDisplay()?.icon;

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
                <div className="absolute inset-0 bg-[#EE6983]/95 backdrop-blur-xl flex items-center justify-center z-20 p-4 overflow-y-auto">
                    <div className="max-w-3xl w-full mx-auto p-4 md:p-8 text-white text-center my-auto">
                        <h1 className="text-4xl md:text-6xl font-black mb-2 md:mb-4 drop-shadow-lg">{exercise.name}</h1>
                        <p className="text-lg md:text-2xl mb-6 md:mb-10 opacity-90">{exercise.description}</p>

                        <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 md:p-8 mb-6 md:mb-8 text-left shadow-2xl">
                            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center gap-3">
                                <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                                Cara Melakukan
                            </h2>
                            <ol className="space-y-3 md:space-y-4 text-base md:text-xl">
                                {exercise.instructions.map((instruction, idx) => (
                                    <li key={idx} className="flex gap-3 md:gap-4 items-start">
                                        <span className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-white/30 rounded-full flex items-center justify-center font-bold text-base md:text-lg">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 pt-1">{instruction}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Duration info */}
                        <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-2 md:px-6 md:py-3 mb-6 md:mb-8 inline-flex items-center gap-2 md:gap-3">
                            <Timer className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="text-lg md:text-xl font-semibold">Durasi: {formatTime(totalExerciseDuration)}</span>
                        </div>

                        <div className="flex gap-3 md:gap-4 justify-center flex-wrap">
                            <button
                                onClick={handleStartFromTutorial}
                                className="bg-white text-[#EE6983] px-6 py-3 md:px-10 md:py-5 rounded-2xl font-black text-lg md:text-2xl hover:scale-105 transition-transform shadow-2xl flex items-center gap-2 md:gap-3"
                            >
                                <Play className="w-5 h-5 md:w-7 md:h-7" />
                                Ayo Mulai!
                            </button>
                            <button
                                onClick={handleSkipTutorial}
                                className="bg-white/20 text-white px-5 py-3 md:px-8 md:py-5 rounded-2xl font-semibold text-base md:text-xl hover:bg-white/30 transition-all"
                            >
                                Lewati Tutorial
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Countdown Screen */}
            {screenState === 'countdown' && (
                <div className="absolute inset-0 bg-[#EE6983]/90 backdrop-blur-xl flex items-center justify-center z-20">
                    <div className="text-center">
                        <h2 className="text-white text-3xl md:text-5xl font-bold mb-8 md:mb-12 drop-shadow-lg px-4">{exercise.name}</h2>
                        <div className="text-white text-[150px] md:text-[250px] font-black leading-none animate-pulse drop-shadow-2xl">
                            {countdown > 0 ? countdown : 'GO!'}
                        </div>
                        <p className="text-white text-xl md:text-3xl mt-8 md:mt-12 opacity-75">Bersiaplah, Mama kuat!</p>
                    </div>
                </div>
            )}

            {/* Exercise Screen */}
            {screenState === 'exercise' && (
                <>
                    {/* Pause Button */}
                    <button
                        onClick={handlePause}
                        className="absolute top-4 right-4 md:top-8 md:right-8 z-30 bg-white/20 backdrop-blur-sm p-2 md:p-4 rounded-full hover:bg-white/40 transition-all shadow-sm border border-white/30"
                    >
                        <Pause className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </button>

                    {/* Timer Display - Minimal, no card */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-8 z-30 w-full flex justify-center pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-3 drop-shadow-md bg-black/10 backdrop-blur-[2px] px-3 py-1 rounded-full md:bg-transparent md:backdrop-blur-none md:p-0">
                            <Timer className="w-5 h-5 md:w-8 md:h-8 text-white" />
                            <span className="text-2xl md:text-5xl font-black text-white tracking-wider">{formatTime(exerciseTimer)}</span>
                        </div>
                    </div>

                    {/* Rep Counter - Minimal, no card */}
                    <div className="absolute top-4 left-4 md:top-8 md:left-8 z-30 pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-4 drop-shadow-md">
                            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-white" />
                            <div>
                                <p className="text-[10px] md:text-sm text-white/90 font-bold uppercase tracking-wide leading-tight">
                                    {isBreathingExercise ? 'Siklus' : 'Repetisi'}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl md:text-6xl font-black text-white leading-none">{repCount}</p>
                                    {exercise.targetReps && (
                                        <p className="text-xs md:text-lg text-white/80 font-semibold">/ {exercise.targetReps}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar - Minimal, fixed width/padding */}
                    {exercise.targetReps && (
                        <div className="absolute top-20 left-0 right-0 md:top-32 z-30 px-4 md:px-12 flex justify-center pointer-events-none">
                            <div className="w-full max-w-3xl bg-white/20 backdrop-blur-sm rounded-full h-1.5 md:h-3 overflow-hidden">
                                <div
                                    className="h-full bg-[#EE6983] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(238,105,131,0.5)]"
                                    style={{ width: `${Math.min((repCount / exercise.targetReps) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Breathing Guide Overlay - Minimalist */}
                    {isBreathingExercise && BreathingIcon && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none">
                            <div className="bg-[#EE6983]/90 backdrop-blur-sm rounded-full w-48 h-48 md:w-64 md:h-64 flex flex-col items-center justify-center shadow-2xl animate-pulse border-4 border-white/20">
                                <BreathingIcon className="w-12 h-12 md:w-20 md:h-20 text-white mb-1 md:mb-2" />
                                <span className="text-white text-lg md:text-2xl font-bold">{getBreathingDisplay()?.text}</span>
                                <span className="text-white text-6xl md:text-8xl font-black">{breathingCountdown}</span>
                            </div>
                        </div>
                    )}

                    {/* Phase Display - Minimal */}
                    {!isBreathingExercise && (
                        <div className="absolute top-28 md:top-44 left-1/2 -translate-x-1/2 z-30 w-full px-4 md:w-auto md:px-0 flex justify-center pointer-events-none">
                            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2 md:px-6 md:py-3 min-w-[180px] md:min-w-[300px] border border-white/10">
                                {/* Confidence indicator - Thinner */}
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${detectionConfidence > 0.7 ? 'bg-[#4ade80]' :
                                                detectionConfidence > 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${detectionConfidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-white/80 font-medium">
                                        {Math.round(detectionConfidence * 100)}%
                                    </span>
                                </div>

                                {/* Phase name */}
                                <p className="text-base md:text-xl font-bold text-white text-center drop-shadow-sm">{currentPhase}</p>

                                {/* Feedback */}
                                {phaseFeedback && (
                                    <p className="text-[10px] md:text-sm text-white/90 text-center mt-1 flex items-center justify-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        {phaseFeedback}
                                    </p>
                                )}

                                {/* Phase progress dots */}
                                <div className="flex justify-center gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                                    {[0, 1, 2, 3].slice(0, Math.ceil(1 / Math.max(0.25, phaseProgress || 0.25))).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${idx <= Math.floor(phaseProgress * 4) ? 'bg-[#EE6983]' : 'bg-white/30'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feedback - Minimal */}
                    {currentValidation && currentValidation.feedback.length > 0 && (
                        <div className="absolute bottom-20 md:bottom-32 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
                            <div className={`backdrop-blur-md rounded-xl p-3 md:p-6 shadow-lg max-w-lg w-full border border-white/20 ${currentValidation.isCorrect ? 'bg-green-500/80' : 'bg-red-500/80'
                                }`}>
                                {currentValidation.feedback.slice(0, 2).map((fb, idx) => (
                                    <div key={idx} className="flex items-center gap-2 md:gap-3 mb-1 last:mb-0">
                                        <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-white shrink-0" />
                                        <p className="text-white text-sm md:text-xl font-bold">
                                            {fb.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]|[\u{2190}-\u{21FF}]/gu, '').trim()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Finish Button - Minimal */}
                    <button
                        onClick={handleFinish}
                        className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-30 bg-[#EE6983] text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-lg hover:bg-[#D64D6B] hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                        Selesai
                    </button>
                </>
            )}

            {/* Pause Menu */}
            {screenState === 'paused' && (
                <div className="absolute inset-0 bg-[#FFF5E4]/95 backdrop-blur-xl flex items-center justify-center z-40 p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-10 max-w-lg w-full mx-auto shadow-2xl border border-[#EE6983]/20">
                        <h2 className="text-3xl md:text-4xl font-black text-[#B13455] mb-6 md:mb-8 text-center">Jeda</h2>
                        <div className="space-y-3 md:space-y-4">
                            <button
                                onClick={handleResume}
                                className="w-full bg-[#EE6983] text-white py-3 md:py-5 rounded-2xl font-bold text-lg md:text-xl hover:bg-[#D64D6B] transition-all flex items-center justify-center gap-2 md:gap-3 shadow-lg"
                            >
                                <Play className="w-5 h-5 md:w-6 md:h-6" />
                                Lanjutkan
                            </button>
                            <button
                                onClick={handleRestart}
                                className="w-full bg-[#B13455] text-white py-3 md:py-5 rounded-2xl font-bold text-lg md:text-xl hover:bg-[#962D48] transition-all flex items-center justify-center gap-2 md:gap-3 shadow-lg"
                            >
                                <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                                Mulai Ulang
                            </button>
                            <button
                                onClick={handleBackToMenu}
                                className="w-full bg-gray-100 text-gray-600 py-3 md:py-5 rounded-2xl font-bold text-lg md:text-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 md:gap-3"
                            >
                                <Home className="w-5 h-5 md:w-6 md:h-6" />
                                Kembali ke Menu
                            </button>
                            <button
                                onClick={() => document.fullscreenElement && document.exitFullscreen()}
                                className="w-full bg-transparent text-gray-400 py-2 md:py-3 rounded-2xl font-semibold text-base md:text-lg hover:text-gray-600 transition-all flex items-center justify-center gap-2 md:gap-3"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                                Keluar Fullscreen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Screen */}
            {screenState === 'results' && (
                <div className="absolute inset-0 bg-[#EE6983]/95 backdrop-blur-xl flex items-center justify-center z-40 p-4 overflow-y-auto">
                    <div className="max-w-3xl w-full mx-auto p-4 md:p-8 text-white text-center my-auto">
                        <div className="flex justify-center mb-4 md:mb-6 animate-bounce drop-shadow-2xl">
                            <Sparkles className="w-20 h-20 md:w-32 md:h-32 text-yellow-300" />
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black mb-4 md:mb-6 drop-shadow-lg">Luar Biasa!</h1>
                        <p className="text-lg md:text-3xl mb-8 md:mb-14 opacity-90">Kamu berhasil menyelesaikan latihan!</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-14">
                            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-xl border border-white/30 flex flex-col items-center">
                                <Trophy className="w-10 h-10 md:w-14 md:h-14 mx-auto mb-2 md:mb-4 text-yellow-300" />
                                <p className="text-4xl md:text-6xl font-black mb-2 md:mb-3">{repCount}</p>
                                <p className="text-base md:text-xl opacity-90 font-semibold">
                                    {isBreathingExercise ? 'Siklus' : 'Repetisi'}
                                </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-xl border border-white/30 flex flex-col items-center">
                                <Timer className="w-10 h-10 md:w-14 md:h-14 mx-auto mb-2 md:mb-4 text-blue-200" />
                                <p className="text-4xl md:text-6xl font-black mb-2 md:mb-3">{formatTime(sessionDuration)}</p>
                                <p className="text-base md:text-xl opacity-90 font-semibold">Durasi</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-xl border border-white/30 flex flex-col items-center">
                                <CheckCircle2 className="w-10 h-10 md:w-14 md:h-14 mx-auto mb-2 md:mb-4 text-green-300" />
                                <p className="text-4xl md:text-6xl font-black mb-2 md:mb-3">{accuracy}%</p>
                                <p className="text-base md:text-xl opacity-90 font-semibold">Akurasi</p>
                            </div>
                        </div>

                        {/* Achievement Badges */}
                        {repCount >= (exercise.targetReps || 10) && (
                            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 md:p-8 mb-8 md:mb-10 shadow-xl border border-white/30">
                                <p className="text-xl md:text-3xl font-bold mb-2 md:mb-3 flex items-center justify-center gap-3">
                                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-300" />
                                    Target Tercapai!
                                </p>
                                <p className="text-base md:text-xl opacity-90">Kamu menyelesaikan semua repetisi yang ditargetkan!</p>
                            </div>
                        )}

                        <div className="flex gap-3 md:gap-5 justify-center flex-wrap">
                            <button
                                onClick={handleExerciseAgain}
                                className="bg-white text-[#EE6983] px-6 py-3 md:px-10 md:py-5 rounded-2xl font-black text-lg md:text-2xl hover:scale-105 transition-transform shadow-2xl flex items-center gap-2 md:gap-3"
                            >
                                <RotateCcw className="w-5 h-5 md:w-7 md:h-7" />
                                Latihan Lagi
                            </button>
                            <button
                                onClick={handleBackToMenu}
                                className="bg-white/20 text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl font-bold text-lg md:text-2xl hover:bg-white/30 transition-all flex items-center gap-2 md:gap-3 border border-white/30"
                            >
                                <Home className="w-5 h-5 md:w-7 md:h-7" />
                                Kembali ke Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExerciseSessionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#EE6983] mb-4"></div>
                    <p className="text-xl font-bold text-[#B13455]">Memuat...</p>
                </div>
            </div>
        }>
            <ExerciseSessionContent />
        </Suspense>
    );
}
