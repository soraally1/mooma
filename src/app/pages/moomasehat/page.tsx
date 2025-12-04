'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PoseLandmarker, FilesetResolver, DrawingUtils, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Play, Pause, RotateCcw, Trophy, Activity, Camera, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import HomepageNavbar from '@/app/components/homepage-navbar';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { exerciseLibrary, Exercise, ExerciseValidation } from '@/app/lib/exercise-library';
import { ValueSmoother } from '@/app/lib/pose-utils';
import toast from 'react-hot-toast';

export default function MoomaSehatPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Exercise state
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [isExercising, setIsExercising] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [currentValidation, setCurrentValidation] = useState<ExerciseValidation | null>(null);

    // Rep detection state
    const [isInPosition, setIsInPosition] = useState(false);
    const [lastRepTime, setLastRepTime] = useState(0);

    // User data
    const [userName, setUserName] = useState('Mooma');
    const [trimester, setTrimester] = useState<1 | 2 | 3>(2);

    // Smoothers for stable measurements
    const smootherRef = useRef(new ValueSmoother(5));

    // Load user data
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push('/pages/login');
                return;
            }

            try {
                const docRef = doc(db, 'pregnancyData', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserName(data.name || 'Mooma');

                    // Calculate trimester from pregnancy week
                    const week = data.pregnancyWeek || 20;
                    if (week <= 13) setTrimester(1);
                    else if (week <= 26) setTrimester(2);
                    else setTrimester(3);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        });

        return () => unsubscribe();
    }, [router]);

    // Initialize MediaPipe Pose Landmarker
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
                console.log('Pose Landmarker initialized');
            } catch (error) {
                console.error('Error initializing Pose Landmarker:', error);
                setCameraError('Gagal memuat model AI. Silakan refresh halaman.');
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
                setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
            }
        };

        if (!isModelLoading && poseLandmarker) {
            initializeCamera();
        }

        return () => {
            // Cleanup camera on unmount
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isModelLoading, poseLandmarker]);

    // Main pose detection loop
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
                // Set canvas size to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw video frame (mirrored for selfie view)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();

                // Detect pose
                const startTimeMs = performance.now();
                const results = poseLandmarker.detectForVideo(video, startTimeMs);

                // Draw pose landmarks
                if (results.landmarks && results.landmarks.length > 0) {
                    const landmarks = results.landmarks[0];

                    // Validate exercise if one is selected
                    if (selectedExercise && isExercising) {
                        const validation = selectedExercise.validate(landmarks);
                        setCurrentValidation(validation);

                        // Rep counting logic
                        detectRep(validation.isCorrect);
                    }

                    // Draw the pose
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
    }, [poseLandmarker, isCameraReady, selectedExercise, isExercising]);

    // Rep detection with state machine
    const detectRep = (isCorrectPosition: boolean) => {
        const now = Date.now();

        // Debounce: at least 800ms between reps
        if (now - lastRepTime < 800) return;

        if (isCorrectPosition && !isInPosition) {
            // Transitioning into correct position
            setIsInPosition(true);
            setRepCount(prev => prev + 1);
            setLastRepTime(now);
            toast.success('✅ Rep selesai!', { duration: 1000 });
        } else if (!isCorrectPosition && isInPosition) {
            // Transitioning out of correct position
            setIsInPosition(false);
        }
    };

    // Draw pose on canvas
    const drawPose = (
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmark[],
        width: number,
        height: number
    ) => {
        const drawingUtils = new DrawingUtils(ctx);

        // Draw connectors
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
            [11, 23], [12, 24], [23, 24], // Torso
            [23, 25], [25, 27], [24, 26], [26, 28], // Legs
        ];

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        for (const [start, end] of connections) {
            const startLandmark = landmarks[start];
            const endLandmark = landmarks[end];

            ctx.beginPath();
            ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
            ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
            ctx.strokeStyle = '#EE6983';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Draw landmarks
        for (let i = 11; i <= 28; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * width;
            const y = landmark.y * height;

            // Color based on validation status
            let color = '#EE6983'; // Default pink
            if (currentValidation && isExercising) {
                color = currentValidation.isCorrect ? '#4ade80' : '#ef4444'; // Green or red
            }

            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    };

    // Start exercise
    const startExercise = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setIsExercising(true);
        setRepCount(0);
        setSessionStartTime(Date.now());
        setIsInPosition(false);
        toast.success(`Mulai: ${exercise.name}`);
    };

    // Pause/Resume exercise
    const togglePauseExercise = () => {
        setIsExercising(!isExercising);
        toast(isExercising ? 'Jeda' : 'Lanjut');
    };

    // End exercise and save to Firebase
    const endExercise = async () => {
        if (!selectedExercise || !sessionStartTime) return;

        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        const accuracy = currentValidation?.isCorrect ? 100 : 80; // Simplified

        try {
            const user = auth.currentUser;
            if (user) {
                await addDoc(collection(db, 'pregnancyData', user.uid, 'exerciseHistory'), {
                    exerciseType: selectedExercise.name,
                    duration,
                    repsCompleted: repCount,
                    accuracy,
                    feedback: currentValidation?.feedback || [],
                    timestamp: serverTimestamp(),
                });
                toast.success('Sesi disimpan!');
            }
        } catch (error) {
            console.error('Error saving exercise:', error);
            toast.error('Gagal menyimpan sesi');
        }

        // Reset state
        setSelectedExercise(null);
        setIsExercising(false);
        setRepCount(0);
        setSessionStartTime(null);
        setCurrentValidation(null);
    };

    return (
        <div className="min-h-screen lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
            <HomepageNavbar />

            {/* Header */}
            <section className="px-4 lg:px-8 py-8 lg:py-12 relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => router.push('/pages/homepage')}
                        className="flex items-center gap-2 text-white hover:text-yellow-100 mb-6 transition-all duration-300 hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-semibold">Kembali</span>
                    </button>

                    <div className="text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-10 h-10 lg:w-12 lg:h-12" />
                            <h1 className="text-4xl lg:text-5xl font-black">MoomaSehat</h1>
                        </div>
                        <p className="text-lg lg:text-xl font-medium opacity-90">
                            Olahraga aman dengan panduan AI untuk Bunda {userName}
                        </p>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="px-4 lg:px-8 py-8 lg:py-12 max-w-7xl mx-auto">
                {isModelLoading && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#EE6983] mb-4"></div>
                        <p className="text-[#B13455] font-semibold text-lg">Memuat AI Model...</p>
                    </div>
                )}

                {cameraError && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center max-w-2xl mx-auto">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700 mb-2">Error Kamera</h3>
                        <p className="text-red-600">{cameraError}</p>
                    </div>
                )}

                {!isModelLoading && !cameraError && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Camera Feed */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative">
                                <div className="relative aspect-video bg-gray-900">
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        playsInline
                                        style={{ transform: 'scaleX(-1)' }}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full"
                                    />

                                    {/* Overlay UI */}
                                    {!isCameraReady && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="text-center text-white">
                                                <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                                                <p className="text-lg font-semibold">Mengaktifkan kamera...</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rep Counter */}
                                    {isExercising && selectedExercise && (
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-8 h-8 text-yellow-500" />
                                                <div>
                                                    <p className="text-sm text-gray-600 font-semibold">Repetisi</p>
                                                    <p className="text-3xl font-black text-[#EE6983]">{repCount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Feedback */}
                                    {isExercising && currentValidation && (
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                                                {currentValidation.feedback.map((fb, idx) => (
                                                    <p key={idx} className="text-sm font-semibold text-[#B13455] mb-1">
                                                        {fb}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                {selectedExercise && (
                                    <div className="p-6 bg-gradient-to-r from-[#EE6983] to-[#B13455] flex items-center justify-between">
                                        <div className="text-white">
                                            <p className="text-sm opacity-90">Sedang berlatih</p>
                                            <p className="text-xl font-bold">{selectedExercise.name}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={togglePauseExercise}
                                                className="bg-white text-[#EE6983] p-4 rounded-xl hover:bg-yellow-100 transition-all duration-300 transform hover:scale-110 shadow-lg"
                                            >
                                                {isExercising ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                            </button>
                                            <button
                                                onClick={() => setRepCount(0)}
                                                className="bg-white text-[#EE6983] p-4 rounded-xl hover:bg-yellow-100 transition-all duration-300 transform hover:scale-110 shadow-lg"
                                            >
                                                <RotateCcw className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={endExercise}
                                                className="bg-green-500 text-white px-6 py-4 rounded-xl hover:bg-green-600 transition-all duration-300 transform hover:scale-110 shadow-lg font-bold flex items-center gap-2"
                                            >
                                                <Check className="w-6 h-6" />
                                                Selesai
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Exercise Selection */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-[#B13455] flex items-center gap-2">
                                <Activity className="w-7 h-7" />
                                Pilih Latihan
                            </h2>

                            <div className="space-y-4">
                                {exerciseLibrary.map((exercise) => (
                                    <div
                                        key={exercise.id}
                                        className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-4 border-transparent hover:border-[#EE6983]/30"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="text-4xl">{exercise.icon}</div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-[#B13455] mb-1">
                                                    {exercise.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-3">
                                                    {exercise.description}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs mb-4">
                                                    <span className={`px-3 py-1 rounded-full font-semibold ${exercise.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                        exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {exercise.difficulty === 'easy' ? 'Mudah' :
                                                            exercise.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-semibold">
                                                        {exercise.targetReps ? `${exercise.targetReps} reps` : `${exercise.duration}s`}
                                                    </span>
                                                </div>

                                                {/* Fullscreen Session Button */}
                                                <button
                                                    onClick={() => router.push(`/pages/exercise-session?exercise=${exercise.id}`)}
                                                    className="w-full bg-gradient-to-r from-[#EE6983] to-[#B13455] text-white py-3 px-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2 mb-2"
                                                >
                                                    <Play className="w-5 h-5" />
                                                    Mulai Sesi Fullscreen
                                                </button>

                                                {/* Quick Start Button (existing functionality) */}
                                                <button
                                                    onClick={() => !isExercising && startExercise(exercise)}
                                                    className="w-full bg-white text-[#EE6983] py-2 px-4 rounded-xl font-semibold border-2 border-[#EE6983] hover:bg-[#EE6983] hover:text-white transition-all"
                                                >
                                                    Latihan Di Sini
                                                </button>
                                            </div>
                                        </div>

                                        {/* Instructions (shown when selected) */}
                                        {selectedExercise?.id === exercise.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <p className="text-sm font-bold text-[#B13455] mb-2">Instruksi:</p>
                                                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                                                    {exercise.instructions.map((instruction, idx) => (
                                                        <li key={idx}>{instruction}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
