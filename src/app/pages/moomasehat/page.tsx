'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Play, Activity, ArrowLeft, Sparkles, Clock, Zap, Baby, Heart,
    ChevronLeft, ChevronRight, Lightbulb, Wind, Dumbbell, StretchHorizontal
} from 'lucide-react';
import HomepageNavbar from '@/app/components/homepage-navbar';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { exerciseLibrary, Exercise } from '@/app/lib/exercise-library';

export default function MoomaSehatPage() {
    const router = useRouter();
    const [userName, setUserName] = useState('Mooma');
    const [userTrimester, setUserTrimester] = useState<1 | 2 | 3>(2);
    const [pregnancyWeek, setPregnancyWeek] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<1 | 2 | 3>(2);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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

                    const week = data.pregnancyWeek || 20;
                    setPregnancyWeek(week);

                    let trimester: 1 | 2 | 3 = 2;
                    if (week <= 13) trimester = 1;
                    else if (week <= 27) trimester = 2;
                    else trimester = 3;

                    setUserTrimester(trimester);
                    setActiveTab(trimester);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const trimester1Exercises = exerciseLibrary.filter(ex => ['diaphragmatic-breathing', 'seated-cat-cow', 'scapular-retraction'].includes(ex.id));
    const trimester2Exercises = exerciseLibrary.filter(ex => ['pelvic-tilt', 'seated-row', 'side-bend'].includes(ex.id));
    const trimester3Exercises = exerciseLibrary.filter(ex => ['labor-breathing', 'butterfly-sitting', 'arm-circles'].includes(ex.id));

    const getCurrentExercises = () => {
        switch (activeTab) {
            case 1: return trimester1Exercises;
            case 2: return trimester2Exercises;
            case 3: return trimester3Exercises;
        }
    };

    const getTrimesterInfo = () => {
        switch (activeTab) {
            case 1: return {
                title: 'Trimester 1',
                subtitle: '0-13 Minggu',
                desc: 'Fokus pada stabilisasi, teknik pernapasan, dan postur dasar.'
            };
            case 2: return {
                title: 'Trimester 2',
                subtitle: '14-27 Minggu',
                desc: 'Memperkuat otot punggung dan panggul untuk mendukung pertumbuhan bayi.'
            };
            case 3: return {
                title: 'Trimester 3',
                subtitle: '28+ Minggu',
                desc: 'Latihan relaksasi dan persiapan persalinan.'
            };
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 380;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const getDifficultyIcon = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return <Wind className="w-4 h-4" />;
            case 'medium': return <Dumbbell className="w-4 h-4" />;
            default: return <Zap className="w-4 h-4" />;
        }
    };

    const ExerciseCard = ({ exercise, index }: { exercise: Exercise; index: number }) => (
        <div
            className="group flex-shrink-0 w-[340px] lg:w-[360px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
        >
            {/* Card Header - Placeholder for mascot icon */}
            <div className={`relative h-28 flex items-center justify-center ${exercise.difficulty === 'easy' ? 'bg-gradient-to-br from-emerald-50 to-teal-100' :
                    exercise.difficulty === 'medium' ? 'bg-gradient-to-br from-amber-50 to-orange-100' :
                        'bg-gradient-to-br from-rose-50 to-pink-100'
                }`}>
                {/* Mascot placeholder - replace with your mascot image */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${exercise.difficulty === 'easy' ? 'bg-emerald-200/50 text-emerald-600' :
                        exercise.difficulty === 'medium' ? 'bg-amber-200/50 text-amber-600' :
                            'bg-rose-200/50 text-rose-600'
                    }`}>
                    <StretchHorizontal className="w-8 h-8" />
                </div>

                {/* Difficulty Badge */}
                <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${exercise.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-700' :
                        exercise.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-700' :
                            'bg-rose-500/10 text-rose-700'
                    }`}>
                    {getDifficultyIcon(exercise.difficulty)}
                    <span>{exercise.difficulty === 'easy' ? 'Mudah' : exercise.difficulty === 'medium' ? 'Sedang' : 'Sulit'}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-base font-bold text-gray-800 mb-1.5 group-hover:text-[#EE6983] transition-colors">
                    {exercise.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {exercise.description}
                </p>

                {/* Stats Row */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>{exercise.targetReps ? `${exercise.targetReps} Rep` : `${exercise.duration}s`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span>{Math.ceil((exercise.duration || (exercise.targetReps || 10) * 5) / 60)} menit</span>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => router.push(`/pages/exercise-session?exercise=${exercise.id}`)}
                    className="w-full bg-gradient-to-r from-[#EE6983] to-[#D1546A] text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Play className="h-4 w-4 fill-current" />
                    Mulai Latihan
                </button>
            </div>
        </div>
    );

    const trimesterInfo = getTrimesterInfo();

    return (
        <div className="min-h-screen bg-[#FDF8F3]">
            <HomepageNavbar />

            {/* Hero Section - Compact */}
            <section className="bg-gradient-to-r from-[#EE6983] to-[#D1546A] pt-6 pb-16 lg:pt-8 lg:pb-20">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/pages/homepage')}
                        className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Kembali</span>
                    </button>

                    {/* Header Content */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <h1 className="text-2xl lg:text-3xl font-bold">MoomaSehat</h1>
                            </div>
                            <p className="text-white/80 text-sm lg:text-base">
                                Halo <span className="font-semibold text-white">{userName}</span>, pilih latihan yang sesuai untuk kamu.
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-3">
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2.5 border border-white/10">
                                <Baby className="w-4 h-4 text-white/80" />
                                <div className="text-white">
                                    <p className="text-[10px] text-white/60 uppercase tracking-wide">Minggu</p>
                                    <p className="font-bold text-sm">{pregnancyWeek}</p>
                                </div>
                            </div>
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2.5 border border-white/10">
                                <Heart className="w-4 h-4 text-white/80" />
                                <div className="text-white">
                                    <p className="text-[10px] text-white/60 uppercase tracking-wide">Trimester</p>
                                    <p className="font-bold text-sm">{userTrimester}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="mx-auto max-w-7xl px-4 lg:px-8 -mt-8 relative z-10 pb-12">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#EE6983]/20 border-t-[#EE6983]"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
                        {/* Trimester Tabs */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                                {[1, 2, 3].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t as 1 | 2 | 3)}
                                        className={`relative px-4 lg:px-5 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === t
                                                ? 'bg-white text-gray-800 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {userTrimester === t && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full"></span>
                                        )}
                                        Trimester {t}
                                    </button>
                                ))}
                            </div>

                            {userTrimester === activeTab && (
                                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Rekomendasi untuk kamu
                                </div>
                            )}
                        </div>

                        {/* Section Info */}
                        <div className="mb-6">
                            <div className="flex items-baseline gap-2 mb-1">
                                <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                                    {trimesterInfo.title}
                                </h2>
                                <span className="text-sm text-gray-400">{trimesterInfo.subtitle}</span>
                            </div>
                            <p className="text-sm text-gray-500">{trimesterInfo.desc}</p>
                        </div>

                        {/* Exercise Cards - Horizontal Scroll */}
                        <div className="relative">
                            {/* Scroll Buttons */}
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-[#EE6983] transition-colors hidden lg:flex border border-gray-100"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-[#EE6983] transition-colors hidden lg:flex border border-gray-100"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Cards Container */}
                            <div
                                ref={scrollContainerRef}
                                className="flex gap-4 lg:gap-5 overflow-x-auto pb-2 scroll-smooth"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {getCurrentExercises().map((exercise, index) => (
                                    <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
                                ))}
                            </div>
                        </div>

                        {/* Tips Section */}
                        <div className="mt-8 bg-amber-50/50 rounded-xl p-5 border border-amber-100/50">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-900 mb-1.5">Tips Latihan Aman</h3>
                                    <ul className="text-amber-700 text-xs space-y-1">
                                        <li>Lakukan pemanasan ringan sebelum latihan</li>
                                        <li>Berhenti jika merasa tidak nyaman</li>
                                        <li>Tetap terhidrasi dengan minum air</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
