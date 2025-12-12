'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronRight, Utensils } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { calculatePregnancyMetrics, PregnancyCalculations } from '@/lib/pregnancy-calculator';
import HomepageNavbar from '@/app/components/homepage-navbar';
import { recipeService, Recipe } from '@/services/recipeService';

interface PregnancyData {
  nama?: string;
  usia?: number;
  hariPertamaHaidTerakhir?: string;
  beratBadanSaatIni?: number;
  tekananDarah?: string;
  tinggiBadan?: number;
  beratBadanPraKehamilan?: number;
  golonganDarah?: string;
  kondisiKesehatanSaatIni?: string;
  mood?: string;
  keluhan?: string;
  gerakanJanin?: string;
  catatanTambahan?: string;
  [key: string]: any;
}

interface NutritionLog {
  id: string;
  foodName: string;
  calories: string;
  nutrition: {
    protein: string;
    carbs: string;
    fat: string;
    vitamins: string;
  };
  verdict: 'Safe' | 'Limit' | 'Avoid';
  createdAt: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>({});
  const [pregnancyMetrics, setPregnancyMetrics] = useState<PregnancyCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingNutrition, setLoadingNutrition] = useState(true);

  // Check authentication and load user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        router.push('/pages/login');
        return;
      }

      console.log('User authenticated:', user.uid);
      setIsAuthenticated(true);

      // Fetch pregnancy data
      try {
        setLoading(true);
        const docRef = doc(db, 'pregnancyData', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as PregnancyData;
          setPregnancyData(data);

          // Calculate pregnancy metrics
          if (data.hariPertamaHaidTerakhir) {
            try {
              const metrics = calculatePregnancyMetrics(data.hariPertamaHaidTerakhir);
              setPregnancyMetrics(metrics);
            } catch (calcError) {
              console.error('Error calculating pregnancy metrics:', calcError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pregnancy data:', error);
      } finally {
        setLoading(false);
      }

      // Fetch saved recipes
      try {
        setLoadingRecipes(true);
        const recipes = await recipeService.getSavedRecipes(user.uid);
        setSavedRecipes(recipes.slice(0, 4)); // Get latest 4 recipes
      } catch (error) {
        console.error('Error fetching saved recipes:', error);
      } finally {
        setLoadingRecipes(false);
      }

      // Fetch nutrition logs
      try {
        setLoadingNutrition(true);
        const nutritionRef = collection(db, 'nutritionLogs');
        const q = query(
          nutritionRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        const querySnapshot = await getDocs(q);
        const logs: NutritionLog[] = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as NutritionLog);
        });
        setNutritionLogs(logs);
      } catch (error) {
        console.error('Error fetching nutrition logs:', error);
      } finally {
        setLoadingNutrition(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Calculate nutrition totals from logs
  const nutritionTotals = nutritionLogs.reduce((acc, log) => {
    const protein = parseFloat(log.nutrition?.protein || '0') || 0;
    const carbs = parseFloat(log.nutrition?.carbs || '0') || 0;
    const fat = parseFloat(log.nutrition?.fat || '0') || 0;
    return {
      protein: acc.protein + protein,
      carbs: acc.carbs + carbs,
      fat: acc.fat + fat,
    };
  }, { protein: 0, carbs: 0, fat: 0 });

  // Recommended daily values for pregnant women
  const recommended = { protein: 75, carbs: 175, fat: 65 };
  const percentages = {
    protein: Math.min(100, Math.round((nutritionTotals.protein / recommended.protein) * 100)),
    carbs: Math.min(100, Math.round((nutritionTotals.carbs / recommended.carbs) * 100)),
    fat: Math.min(100, Math.round((nutritionTotals.fat / recommended.fat) * 100)),
  };
  const overallPercent = Math.round((percentages.protein + percentages.carbs + percentages.fat) / 3);

  // Show loading screen while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#EE6983]" />
          <p className="text-[#B13455] font-semibold">Memverifikasi akun Anda...</p>
        </div>
      </div>
    );
  }

  const weeks = pregnancyMetrics?.pregnancyWeek || 4;

  const createWeekArray = (currentWeek: number) => {
    const totalWeeks = 10;
    const beforeCurrent = Math.floor(totalWeeks / 2);
    let startWeek = Math.max(1, currentWeek - beforeCurrent);
    let endWeek = startWeek + totalWeeks - 1;
    if (endWeek > 40) {
      endWeek = 40;
      startWeek = Math.max(1, endWeek - totalWeeks + 1);
    }
    return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);
  };

  const weekArray = createWeekArray(weeks);

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Safe': return 'bg-green-100 text-green-600';
      case 'Limit': return 'bg-yellow-100 text-yellow-600';
      case 'Avoid': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
      <HomepageNavbar />

      {/* Hero Section with Pink Background */}
      <section className="px-4 lg:px-8 py-8 lg:py-12 relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-black text-white">Kalender Kehamilan</h1>
          </div>

          {/* Main Content Grid - Calendar and Image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-10">
            {/* Left Column - Calendar */}
            <div className="space-y-6">
              <div className="overflow-x-auto pb-4 scroll-smooth calendar-scroll">
                <style>{`
                  .calendar-scroll::-webkit-scrollbar {
                    height: 6px;
                  }
                  .calendar-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                  }
                  .calendar-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 10px;
                  }
                `}</style>
                <div className="flex gap-3 min-w-min">
                  {weekArray.map((week) => (
                    <div
                      key={week}
                      className={`rounded-2xl p-5 text-center font-bold transition-all transform shrink-0 w-24 ${week === weeks
                        ? 'bg-[#B13455] text-white'
                        : 'bg-[#FFF5E4] text-[#EE6983] hover:scale-95 shadow-lg'
                        }`}
                    >
                      <div className="text-3xl font-black">{week}</div>
                      <div className="text-xs mt-1 font-semibold">Minggu</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Week Info Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
                <p className="text-white/80 text-sm mb-2">Minggu ke</p>
                <p className="text-white text-5xl font-black mb-3">{weeks}</p>
                <p className="text-white/90 text-base">
                  {pregnancyMetrics?.gestationalAge || '-'}
                </p>
              </div>
            </div>

            {/* Right Column - Pregnancy Image */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl"></div>
                <img
                  src={(() => {
                    const week = pregnancyMetrics?.pregnancyWeek || 0;
                    const availableWeeks = [4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 25, 30, 35, 40];
                    const closestWeek = availableWeeks.reduce((prev, curr) =>
                      Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev
                    );
                    return `/size/${closestWeek}.webp`;
                  })()}
                  alt="Fetus"
                  className="w-80 h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl relative z-10 animate-bounce-slow"
                />
              </div>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-3xl p-6 text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-sm text-[#EE6983] font-bold mb-3">Berat badan</p>
              <p className="text-5xl font-black text-[#EE6983]">
                {pregnancyData.beratBadanSaatIni || '-'}
              </p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">kg</p>
            </div>
            <div className="rounded-3xl p-6 text-center text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-4 border-white" style={{ backgroundColor: '#EE6983' }}>
              <p className="text-sm font-bold mb-3">Tekanan darah</p>
              <p className="text-4xl font-black">{pregnancyData.tekananDarah || '-'}</p>
              <p className="text-sm font-bold mt-2">mmhg</p>
            </div>
            <div className="rounded-3xl p-6 text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-sm text-[#EE6983] font-bold mb-3">Usia Janin</p>
              <p className="text-5xl font-black text-[#EE6983]">
                {pregnancyMetrics?.pregnancyWeek || '-'}
              </p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">minggu</p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
          }
        `}</style>
      </section>

      {/* Mother's Information Section */}
      <section className="px-4 lg:px-8 py-8 lg:py-10" style={{ backgroundColor: '#EE6983' }}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black text-white mb-6">Informasi Ibu</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl p-5 shadow-lg" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-xs text-[#EE6983] font-bold mb-3">Nama</p>
              <p className="text-2xl font-black text-[#EE6983]">{pregnancyData.nama || '-'}</p>
            </div>
            <div className="rounded-3xl p-5 shadow-lg" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-xs text-[#EE6983] font-bold mb-3">Umur</p>
              <p className="text-2xl font-black text-[#EE6983]">{pregnancyData.usia || '-'}</p>
              <p className="text-xs text-[#EE6983] font-semibold mt-1">tahun</p>
            </div>
            <div className="rounded-3xl p-5 shadow-lg" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-xs text-[#EE6983] font-bold mb-3">Tinggi</p>
              <p className="text-2xl font-black text-[#EE6983]">{pregnancyData.tinggiBadan || '-'}</p>
              <p className="text-xs text-[#EE6983] font-semibold mt-1">cm</p>
            </div>
            <div className="rounded-3xl p-5 shadow-lg" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-xs text-[#EE6983] font-bold mb-3">Golongan Darah</p>
              <p className="text-2xl font-black text-[#EE6983]">{pregnancyData.golonganDarah || '-'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="px-4 py-6 space-y-6" style={{ backgroundColor: '#EE6983' }}>

        {/* Asupan Nutrisi - Based on nutritionLogs */}
        <div className="rounded-3xl p-7 shadow-xl" style={{ backgroundColor: '#FFF5E4' }}>
          <h3 className="text-[#EE6983] font-bold text-lg mb-6">Asupan Nutrisi Hari Ini</h3>
          {loadingNutrition ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-[#EE6983]" />
            </div>
          ) : nutritionLogs.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-4xl font-black text-[#EE6983]">{Math.round(nutritionTotals.protein)}g</p>
                <p className="text-sm text-[#EE6983] font-bold mt-2">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-[#EE6983]">{Math.round(nutritionTotals.carbs)}g</p>
                <p className="text-sm text-[#EE6983] font-bold mt-2">Karbohidrat</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-[#EE6983]">{Math.round(nutritionTotals.fat)}g</p>
                <p className="text-sm text-[#EE6983] font-bold mt-2">Lemak</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#EE6983] flex items-center justify-center mx-auto mb-2">
                  <p className="text-2xl font-black text-[#EE6983]">{overallPercent}%</p>
                </div>
                <p className="text-sm text-[#EE6983] font-bold">Terpenuhi</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[#EE6983]/60 mb-3">Belum ada data nutrisi hari ini</p>
              <button
                onClick={() => router.push('/pages/nutrition')}
                className="bg-[#EE6983] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#B13455] transition-all"
              >
                Analisis Makanan
              </button>
            </div>
          )}
        </div>

        {/* Kebutuhan Nutrisi Mooma */}
        <div className="rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#FFF5E4' }}>
          <h3 className="text-[#EE6983] font-bold text-lg mb-5">Kebutuhan Nutrisi Mooma</h3>
          <div className="space-y-5">
            {[
              { label: 'Protein', current: percentages.protein, total: nutritionTotals.protein, target: recommended.protein },
              { label: 'Karbohidrat', current: percentages.carbs, total: nutritionTotals.carbs, target: recommended.carbs },
              { label: 'Lemak', current: percentages.fat, total: nutritionTotals.fat, target: recommended.fat },
            ].map((nutrient, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-[#EE6983] font-bold">{nutrient.label}</p>
                  <p className="text-xs text-[#EE6983] font-bold">{Math.round(nutrient.total)}/{nutrient.target}g</p>
                </div>
                <div className="w-full bg-white rounded-full h-3 overflow-hidden border-2 border-[#FFB3D9] shadow-sm">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${nutrient.current}%`,
                      backgroundColor: '#EE6983',
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat Makanan - Based on nutritionLogs */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-lg">Riwayat Makanan</h3>
            <button
              onClick={() => router.push('/pages/nutrition')}
              className="text-white/80 text-sm font-semibold hover:text-white"
            >
              Lihat Semua →
            </button>
          </div>
          {loadingNutrition ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : nutritionLogs.length > 0 ? (
            <div className="space-y-3">
              {nutritionLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-3xl p-4 flex items-center gap-4 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                  style={{ backgroundColor: '#FFF5E4' }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-200 to-orange-300 shrink-0 flex items-center justify-center text-2xl shadow-md">
                    🍽️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[#EE6983] font-bold text-sm truncate">{log.foodName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getVerdictColor(log.verdict)}`}>
                        {log.verdict}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs flex-wrap">
                      <span className="text-[#EE6983]/70 font-semibold">{log.nutrition?.protein || '0'} Protein</span>
                      <span className="text-[#EE6983]/70 font-semibold">{log.nutrition?.carbs || '0'} Karbo</span>
                      <span className="text-[#EE6983]/70 font-semibold">{log.calories} kal</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#EE6983] shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-3xl" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-[#EE6983]/60 mb-3">Belum ada riwayat makanan</p>
              <button
                onClick={() => router.push('/pages/nutrition')}
                className="bg-[#EE6983] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#B13455] transition-all"
              >
                Analisis Makanan
              </button>
            </div>
          )}
        </div>

        {/* Resep Tersimpan - Based on recipeService */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-lg">Resep Tersimpan</h3>
            <button
              onClick={() => router.push('/pages/resep')}
              className="text-white/80 text-sm font-semibold hover:text-white"
            >
              Lihat Semua →
            </button>
          </div>
          {loadingRecipes ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : savedRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {savedRecipes.map((recipe, idx) => (
                <div
                  key={recipe.id || idx}
                  onClick={() => router.push('/pages/resep')}
                  className="rounded-2xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                  style={{ backgroundColor: '#FFF5E4' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EE6983] to-[#B13455] flex items-center justify-center text-lg mb-3 shadow">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-[#EE6983] font-bold text-sm line-clamp-2">{recipe.name}</p>
                  <p className="text-[#EE6983]/60 text-xs mt-1">{recipe.prepTime} • {recipe.servings}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-3xl" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-[#EE6983]/60 mb-3">Belum ada resep tersimpan</p>
              <button
                onClick={() => router.push('/pages/resep')}
                className="bg-[#EE6983] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#B13455] transition-all"
              >
                Cari Resep
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
