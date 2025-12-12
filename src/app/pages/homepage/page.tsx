'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Apple, Stethoscope, Heart, Dumbbell, BookOpen, MessageCircle, Loader, Zap, Activity, UtensilsCrossed, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import HomepageNavbar from '@/app/components/homepage-navbar';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calculatePregnancyMetrics, PregnancyCalculations } from '@/lib/pregnancy-calculator';
import { getPregnancyDescription } from '@/lib/pregnancy-description';

interface PregnancyData {
  beratBadanSaatIni?: number;
  tekananDarah?: string;
  perkiraanTanggalPersalinan?: string;
  hariPertamaHaidTerakhir?: string;
  nama?: string;
  gravidaParityAbortus?: string;
  usiaKehamilan?: number;
  tinggiBadan?: number;
  beratBadanPraKehamilan?: number;
  golonganDarah?: string;
  alergiObat?: string;
  alergiMakanan?: string;
  riwayatKesehatan?: string;
  komplikasiKehamilanSebelumnya?: string;
  obatYangSedangDikonsumsi?: string;
  kondisiKesehatanSaatIni?: string;
  frekuensiOlahraga?: string | number;
  mood?: string;
  keluhan?: string;
  gerakanJanin?: string;
  catatanTambahan?: string;
}

export default function Homepage() {
  const router = useRouter();
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>({});
  const [pregnancyMetrics, setPregnancyMetrics] = useState<PregnancyCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Mooma');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check authentication and load user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // User not logged in - redirect to login
        console.log('User not authenticated, redirecting to login');
        router.push('/pages/login');
        return;
      }

      // User is logged in
      console.log('User authenticated:', user.uid);
      setIsAuthenticated(true);
      setCurrentUser(user);

      // Fetch pregnancy data
      try {
        setLoading(true);
        const docRef = doc(db, 'pregnancyData', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as PregnancyData;

          // Check if profile is completed
          // @ts-ignore - profileCompleted might not be in the interface yet but it's in the DB
          if (!data.profileCompleted) {
            console.log('Profile not completed, redirecting to setup...');
            router.push('/pages/moomacomplete');
            return;
          }

          setPregnancyData(data);
          setUserName(data.nama || user.displayName || 'Mooma');

          // Calculate pregnancy metrics using the service
          if (data.hariPertamaHaidTerakhir) {
            try {
              const metrics = calculatePregnancyMetrics(data.hariPertamaHaidTerakhir);
              setPregnancyMetrics(metrics);
              console.log('Pregnancy metrics calculated:', metrics);
            } catch (calcError) {
              console.error('Error calculating pregnancy metrics:', calcError);
            }
          }
        } else {
          // No pregnancy data found - redirect to setup
          console.log('No pregnancy data found, redirecting to setup...');
          router.push('/pages/moomacomplete');
          return;
        }
      } catch (error) {
        console.error('Error fetching pregnancy data:', error);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

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

  return (
    <div className="min-h-screen lg:bg-white pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
      <HomepageNavbar />

      {/* Hero Section */}
      <section className="px-4 lg:px-8 py-10 lg:py-20 text-center lg:text-left relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
          {/* Pregnancy Week Image */}
          <div className="flex flex-col items-center lg:items-start gap-6">
            {/* Image with enhanced size */}
            <div className={`transform hover:scale-105 transition-all duration-500 ${loading ? 'animate-pulse' : 'animate-bounce-slow'}`}>
              <img
                src={(() => {
                  const week = pregnancyMetrics?.pregnancyWeek || 0;
                  // Available weeks: 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 25, 30, 35, 40
                  const availableWeeks = [4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 25, 30, 35, 40];
                  const closestWeek = availableWeeks.reduce((prev, curr) =>
                    Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev
                  );
                  return `/size/${closestWeek}.webp`;
                })()}
                alt={`Pregnancy Week ${pregnancyMetrics?.pregnancyWeek || 0}`}
                className="w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 object-contain drop-shadow-2xl"
              />
            </div>

            {/* Enhanced Description Card */}
            {!loading && pregnancyMetrics && (
              <div className="p-5 lg:p-6 max-w-sm w-full">
                <div className="space-y-2">
                  {/* Size */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/70 text-base font-medium">Ukuran:</span>
                    <span className="text-white text-2xl font-bold">{getPregnancyDescription(pregnancyMetrics.pregnancyWeek).size}</span>
                  </div>

                  {/* Comparison */}
                  <div className="border-l-2 border-white/30 pl-3">
                    <p className="text-white/90 text-xl italic leading-relaxed">
                      {getPregnancyDescription(pregnancyMetrics.pregnancyWeek).comparison}
                    </p>
                  </div>

                  {/* Medical Note */}
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-white/75 text-sm leading-relaxed">
                      {getPregnancyDescription(pregnancyMetrics.pregnancyWeek).medicalNote}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Content */}
          <div className="text-white">
            <p className="text-sm lg:text-base font-semibold mb-2 opacity-90 animate-fade-in">Aku akan lahir</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-2 leading-tight animate-fade-in-delay-1">
              {loading ? (
                <span className="inline-block animate-pulse">...</span>
              ) : (
                <>
                  <span className="bg-linear-to-r from-white to-yellow-100 bg-clip-text text-transparent">
                    {pregnancyMetrics?.daysRemaining || 0}
                  </span>
                  <span className="text-2xl md:text-3xl lg:text-4xl ml-2">Hari lagi</span>
                </>
              )}
            </h2>
            <p className="text-xl lg:text-2xl font-semibold mb-8 animate-fade-in-delay-2 flex items-center gap-2">
              <span>Bunda {userName}</span>
            </p>

            {/* Health Metrics Cards */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
              {/* Berat Mooma Card */}
              <div className="bg-[#FFF5E4] rounded-xl md:rounded-2xl lg:rounded-3xl p-3 md:p-4 lg:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 animate-fade-in-delay-3">
                <p className="text-[#B13455] text-xs lg:text-sm font-semibold mb-2 lg:mb-3">Berat mooma</p>
                <p className="text-[#B13455] text-2xl md:text-3xl lg:text-4xl font-black">
                  {loading ? <Loader className="w-6 h-6 animate-spin" /> : pregnancyData.beratBadanSaatIni || '-'}
                  <span className="text-sm lg:text-lg ml-1 font-semibold">kg</span>
                </p>
              </div>

              {/* Status Kehamilan Card */}
              <div className="bg-[#FFF5E4] rounded-xl md:rounded-2xl lg:rounded-3xl p-3 md:p-4 lg:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 md:border-4 border-white animate-fade-in-delay-4">
                <p className="text-[#B13455] text-xs lg:text-sm font-semibold mb-2 lg:mb-3">Status Kehamilan</p>
                <div className="flex flex-col gap-1">
                  <p className="text-[#B13455] text-xl md:text-2xl lg:text-3xl font-black">
                    {loading ? <Loader className="w-6 h-6 animate-spin" /> : pregnancyData.gravidaParityAbortus || '-'}
                  </p>
                  {pregnancyData.usiaKehamilan}
                </div>
              </div>

              {/* Usia Janin Card */}
              <div className="bg-[#FFF5E4] rounded-xl md:rounded-2xl lg:rounded-3xl p-3 md:p-4 lg:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 animate-fade-in-delay-5">
                <p className="text-[#B13455] text-xs lg:text-sm font-semibold mb-2 lg:mb-3">Usia Janin</p>
                <div className="flex flex-col gap-1">
                  <p className="text-[#B13455] text-xl md:text-2xl lg:text-3xl font-black">
                    {loading ? (
                      <Loader className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        {pregnancyMetrics?.pregnancyWeek || 0}
                        <span className="text-sm lg:text-lg ml-1 font-semibold">minggu</span>
                      </>
                    )}
                  </p>
                  {pregnancyMetrics && (
                    <p className="text-[#B13455] text-xs lg:text-sm font-semibold">
                      {pregnancyMetrics.gestationalAge}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 lg:px-8 py-12 lg:py-20 relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-6 lg:mb-12">
            <Zap className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
            <h3 className="text-white font-black text-2xl lg:text-3xl">Fitur Unggulan</h3>
          </div>
          <div className="flex gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { icon: ChefHat, label: 'Resep Mooma', delay: 'delay-0' },
              { icon: Apple, label: 'Nutrisi Mooma', delay: 'delay-100' },
              { icon: Stethoscope, label: 'Cerita Mooma', delay: 'delay-200' },
              { icon: Heart, label: 'Mooma Sehat', delay: 'delay-300' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center gap-3 md:gap-4 cursor-pointer group animate-fade-in ${feature.delay} flex-shrink-0 w-28 md:w-auto`}
              >
                {/* Icon Box */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-2">
                  <feature.icon className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 text-[#EE6983] transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                </div>
                {/* Text Label */}
                <p className="text-white text-xs md:text-sm lg:text-base text-center font-bold leading-tight">
                  {feature.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Olahraga Section */}
      <section className="px-4 lg:px-8 py-12 lg:py-20 lg:bg-white relative overflow-hidden" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8 lg:mb-12">
            <Activity className="w-8 h-8 lg:w-10 lg:h-10 text-[#B13455]" />
            <h3 className="font-black text-2xl lg:text-3xl text-[#B13455]">Olahraga yuk mooma</h3>
          </div>
          <div className="relative">
            <div className="rounded-2xl md:rounded-3xl lg:rounded-[2rem] p-6 md:p-8 lg:p-12 pr-32 md:pr-40 lg:pr-52 text-white shadow-xl md:shadow-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ backgroundColor: '#EE6983' }}>
              <div className="max-w-xs">
                <p className="text-base md:text-lg lg:text-2xl font-bold mb-4 md:mb-6 lg:mb-8 leading-relaxed">Mulai olahraga untuk menjaga kesehatan Mooma dan bayi!</p>
                <button className="bg-white text-[#EE6983] font-black py-2.5 md:py-3 lg:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl hover:bg-yellow-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm md:text-base">
                  Mulai olahraga
                </button>
              </div>
            </div>

            {/* Overlapping Image - Aligned at bottom */}
            <div className="absolute -right-4 md:-right-8 lg:-right-12 bottom-0 w-40 h-40 md:w-56 md:h-56 lg:w-72 lg:h-72 pointer-events-none">
              <img src="/olahraga.svg" alt="Olahraga" className="w-full h-full object-contain " />
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Section */}
      <section className="px-4 lg:px-8 py-12 lg:py-20 lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 lg:mb-4">
            <UtensilsCrossed className="w-8 h-8 lg:w-10 lg:h-10 text-[#B13455]" />
            <h3 className="font-black text-2xl lg:text-3xl text-[#B13455]">Momma binggung apa mau masak apa?</h3>
          </div>
          <p className="text-[#B13455] text-sm lg:text-base mb-8 lg:mb-12 font-medium">Binggung mau masak apa hari ini? Yuk, cari resep sehat yang gizi.</p>
          <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            {[
              { icon: BookOpen, label: 'Buat resep', color: '#EE6983' },
              { icon: BookOpen, label: 'Cari resep', color: '#E26884' },
              { icon: BookOpen, label: 'Resep Terpopuler', color: '#D15570' },
            ].map((recipe, idx) => (
              <button
                key={idx}
                className="rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 text-white text-xs md:text-sm lg:text-base font-black shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center gap-2 md:gap-3 lg:gap-4 h-28 md:h-36 lg:h-44 justify-center transform hover:scale-105 hover:-translate-y-2 active:scale-95 group"
                style={{ backgroundColor: recipe.color }}
              >
                <recipe.icon className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" />
                <span>{recipe.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Doctor Consultation Section */}
      <section className="px-4 lg:px-8 py-12 lg:py-20 lg:bg-white relative overflow-hidden" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-48 h-48 bg-[#EE6983] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-8 lg:mb-12">
            <Stethoscope className="w-8 h-8 lg:w-10 lg:h-10 text-[#B13455]" />
            <h3 className="font-black text-2xl lg:text-3xl text-[#B13455]">Konsultasi dengan Dokter Kami</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Image */}
            <div className="rounded-3xl overflow-hidden shadow-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
              <img src="/image.svg" alt="Konsultasi Dokter" className="w-full h-56 lg:h-72 object-cover" />
            </div>

            {/* Right - Message */}
            <div className="flex flex-col justify-center">
              <div className="rounded-3xl p-8 lg:p-10 text-white shadow-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2" style={{ backgroundColor: '#EE6983' }}>
                <div className="flex gap-4 lg:gap-5">
                  <MessageCircle className="w-8 h-8 lg:w-10 lg:h-10 shrink-0 mt-1 animate-bounce" />
                  <div>
                    <p className="text-base lg:text-lg font-bold leading-relaxed mb-2">Hai Mooma!</p>
                    <p className="text-sm lg:text-base font-medium leading-relaxed mb-6">Apakah kamu siap untuk berbincang dengan dokter kita tentang perjalanan kehamilanmu? Kami siap membantu menjaga kesehatan Mooma dan bayi dengan konsultasi profesional.</p>
                    <button className="bg-white text-[#EE6983] font-black py-3 lg:py-4 px-8 rounded-2xl hover:bg-yellow-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95">
                      Mulai Konsultasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-3 sticky bottom-0" style={{ backgroundColor: 'var(--color-pink-normal)' }}></footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay-1 {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          20% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay-2 {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          40% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay-3 {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          60% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fade-in-delay-4 {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          70% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fade-in-delay-5 {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          80% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-fade-in-delay-1 {
          animation: fade-in-delay-1 0.8s ease-out forwards;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in-delay-2 0.8s ease-out forwards;
        }

        .animate-fade-in-delay-3 {
          animation: fade-in-delay-3 0.8s ease-out forwards;
        }

        .animate-fade-in-delay-4 {
          animation: fade-in-delay-4 0.8s ease-out forwards;
        }

        .animate-fade-in-delay-5 {
          animation: fade-in-delay-5 0.8s ease-out forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        .delay-0 {
          animation-delay: 0s;
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }

        .delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}
