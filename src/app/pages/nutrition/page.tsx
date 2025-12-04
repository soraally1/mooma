'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, Camera, Upload, CheckCircle2, AlertTriangle, XCircle, ChevronLeft, Sparkles, Info, ScanLine } from 'lucide-react';
import HomepageNavbar from '@/app/components/homepage-navbar';
import { nutritionService, NutritionAnalysis } from '@/services/nutritionService';
import toast, { Toaster } from 'react-hot-toast';

export default function NutritionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                analyzeImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async (base64Image: string) => {
        setLoading(true);
        setAnalysis(null);
        try {
            const result = await nutritionService.analyzeFood(base64Image);
            setAnalysis(result);
        } catch (error) {
            toast.error('Gagal menganalisis makanan. Coba lagi ya, Mooma!');
            setImagePreview(null);
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setImagePreview(null);
        setAnalysis(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'Safe': return 'bg-green-100 text-green-700 border-green-200';
            case 'Limit': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Avoid': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getVerdictIcon = (verdict: string) => {
        switch (verdict) {
            case 'Safe': return <CheckCircle2 className="w-8 h-8" />;
            case 'Limit': return <Info className="w-8 h-8" />;
            case 'Avoid': return <XCircle className="w-8 h-8" />;
            default: return <Info className="w-8 h-8" />;
        }
    };

    return (
        <div className="min-h-screen lg:bg-white pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
            <Toaster position="top-center" />
            <HomepageNavbar />

            <div className="px-4 lg:px-8 py-8 lg:py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EE6983]/10 mb-4">
                            <ScanLine className="w-4 h-4 text-[#EE6983]" />
                            <span className="text-sm font-bold text-[#EE6983]">AI Food Scanner</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-[#B13455] mb-4">
                            Cek Nutrisi Makanan
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Foto makanan Mooma untuk mengetahui kandungan nutrisi dan keamanannya bagi kehamilan.
                        </p>
                    </div>

                    {/* Scanner Area */}
                    <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-[#FFE8F0] relative overflow-hidden animate-fade-in-delay-1">
                        {!imagePreview ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-[#EE6983]/30 rounded-[2rem] h-80 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FFF5E4] hover:border-[#EE6983] transition-all group"
                            >
                                <div className="w-24 h-24 bg-[#EE6983]/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Camera className="w-10 h-10 text-[#EE6983]" />
                                </div>
                                <h3 className="text-2xl font-bold text-[#B13455] mb-2">Ambil Foto atau Upload</h3>
                                <p className="text-gray-500">Tap di sini untuk mulai scan</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Food Preview"
                                    className="w-full h-80 object-cover rounded-[2rem] shadow-lg"
                                />
                                {!loading && (
                                    <button
                                        onClick={resetScanner}
                                        className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                )}

                                {loading && (
                                    <div className="absolute inset-0 bg-black/50 rounded-[2rem] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                        <Loader className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-bold text-xl animate-pulse">Sedang Menganalisis...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Analysis Result */}
                    {analysis && (
                        <div className="mt-8 space-y-6 animate-fade-in">
                            {/* Verdict Card */}
                            <div className={`rounded-[2.5rem] p-8 border-2 ${getVerdictColor(analysis.verdict)} flex flex-col md:flex-row items-center gap-6 shadow-lg`}>
                                <div className="shrink-0 p-4 bg-white rounded-full shadow-sm">
                                    {getVerdictIcon(analysis.verdict)}
                                </div>
                                <div className="text-center md:text-left flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <h2 className="text-3xl font-black">{analysis.foodName}</h2>
                                        <span className="px-3 py-1 rounded-full bg-white/50 text-sm font-bold border border-current w-fit mx-auto md:mx-0">
                                            {analysis.calories}
                                        </span>
                                    </div>
                                    <p className="text-lg font-medium opacity-90">{analysis.advice}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nutrition Facts */}
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-[#FFE8F0]">
                                    <h3 className="text-xl font-black text-[#B13455] mb-6 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" /> Kandungan Nutrisi
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(analysis.nutrition).map(([key, value]) => (
                                            <div key={key} className="bg-[#FFF5E4] p-4 rounded-2xl">
                                                <p className="text-sm text-gray-500 capitalize mb-1">{key}</p>
                                                <p className="text-lg font-bold text-[#B13455]">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Benefits & Risks */}
                                <div className="space-y-6">
                                    {analysis.benefits.length > 0 && (
                                        <div className="bg-green-50 rounded-[2.5rem] p-8 border border-green-100">
                                            <h3 className="text-xl font-black text-green-800 mb-4 flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" /> Manfaat
                                            </h3>
                                            <ul className="space-y-2">
                                                {analysis.benefits.map((benefit, idx) => (
                                                    <li key={idx} className="flex gap-2 text-green-700 font-medium">
                                                        <span>•</span> {benefit}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analysis.risks.length > 0 && (
                                        <div className="bg-red-50 rounded-[2.5rem] p-8 border border-red-100">
                                            <h3 className="text-xl font-black text-red-800 mb-4 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" /> Perhatikan
                                            </h3>
                                            <ul className="space-y-2">
                                                {analysis.risks.map((risk, idx) => (
                                                    <li key={idx} className="flex gap-2 text-red-700 font-medium">
                                                        <span>•</span> {risk}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-delay-1 {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-fade-in-delay-1 { animation: fade-in-delay-1 0.8s ease-out forwards; }
      `}</style>
        </div>
    );
}
