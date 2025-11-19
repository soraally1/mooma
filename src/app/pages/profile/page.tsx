'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronRight } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calculatePregnancyMetrics, PregnancyCalculations } from '@/lib/pregnancy-calculator';
import HomepageNavbar from '@/app/components/homepage-navbar';

interface PregnancyData {
  name?: string;
  lastMenstrualPeriod?: string;
  currentBodyWeight?: number;
  bloodPressure?: string;
  height?: number;
  prePregnancyWeight?: number;
  bloodType?: string;
  currentHealthConditions?: string;
  mood?: string;
  complaints?: string;
  babyMovement?: string;
  additionalNotes?: string;
  [key: string]: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>({});
  const [pregnancyMetrics, setPregnancyMetrics] = useState<PregnancyCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
          if (data.lastMenstrualPeriod) {
            try {
              const metrics = calculatePregnancyMetrics(data.lastMenstrualPeriod);
              setPregnancyMetrics(metrics);
              console.log('Pregnancy metrics calculated:', metrics);
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
    });

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

  const weeks = pregnancyMetrics?.pregnancyWeek || 0;
  const weekArray = Array.from({ length: 9 }, (_, i) => weeks - 4 + i).filter(w => w > 0);

  return (
    <div className="min-h-screen pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
      <HomepageNavbar />

      {/* Hero Section with Pink Background */}
      <section className="px-4 lg:px-8 py-8 lg:py-12 relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-black text-white">Kalender Kehamilan</h1>
          </div>

          {/* Pregnancy Calendar - Horizontal Scrollable */}
          <div className="mb-10 overflow-x-auto pb-10 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
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
              .calendar-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.8);
              }
            `}</style>
            <div className="flex gap-5 min-w-min calendar-scroll">
              {weekArray.map((week) => (
                <div
                  key={week}
                  className={`rounded-2xl p-4 text-center font-bold transition-all transform shrink-0 w-25 ${
                    week === weeks
                      ? 'bg-[#B13455] text-white scale-100 shadow-lg'
                      : 'bg-[#FFF5E4] text-[#EE6983] hover:scale-90'
                  }`}
                >
                  <div className="text-2xl font-black">{week}</div>
                  <div className="text-xs mt-1">Minggu</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fetus Illustration with SVG */}
          <div className="flex justify-center py-6 lg:py-8">
            <div className="relative w-56 h-56 lg:w-64 lg:h-64">
              <img
                src="/trimester4.svg"
                alt="Fetus"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Berat Badan */}
            <div className="rounded-3xl p-5 text-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-sm text-[#EE6983] font-bold mb-3">Berat badan</p>
              <p className="text-4xl font-black text-[#EE6983]">
                {pregnancyData.currentBodyWeight || '-'}
              </p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">kg</p>
            </div>

            {/* Tekanan Darah */}
            <div className="rounded-3xl p-5 text-center text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border-3 border-white" style={{ backgroundColor: '#EE6983' }}>
              <p className="text-sm font-bold mb-3">Tekanan darah</p>
              <p className="text-3xl font-black">{pregnancyData.bloodPressure || '-'}</p>
              <p className="text-sm font-bold mt-2">mmhg</p>
            </div>

            {/* Usia Janin */}
            <div className="rounded-3xl p-5 text-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105" style={{ backgroundColor: '#FFF5E4' }}>
              <p className="text-sm text-[#EE6983] font-bold mb-3">Usia Janin</p>
              <p className="text-4xl font-black text-[#EE6983]">
                {pregnancyMetrics?.pregnancyWeek || '-'}
              </p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">hari</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="px-4 py-6 space-y-6" style={{ backgroundColor: '#EE6983' }}>

        {/* Asupan Nutrisi */}
        <div className="rounded-3xl p-7 shadow-xl" style={{ backgroundColor: '#FFF5E4' }}>
          <h3 className="text-[#EE6983] font-bold text-lg mb-6">Asupan Nutrisi</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-4xl font-black text-[#EE6983]">60g</p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-[#EE6983]">24g</p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">Zat Besi</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-[#EE6983]">70g</p>
              <p className="text-sm text-[#EE6983] font-bold mt-2">Asam Folat</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-[#EE6983] flex items-center justify-center mx-auto mb-2">
                <p className="text-2xl font-black text-[#EE6983]">78%</p>
              </div>
              <p className="text-sm text-[#EE6983] font-bold">Terpenuhi</p>
            </div>
          </div>
        </div>

        {/* Kebutuhan Nutrisi Mooma */}
        <div className="rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#FFE8F0' }}>
          <h3 className="text-[#EE6983] font-bold text-lg mb-5">Kebutuhan nutrisi mooma</h3>
          <div className="space-y-5">
            {[
              { label: 'Protein', current: '15%', target: '125/700g' },
              { label: 'Zat Besi', current: '15%', target: '125/700g' },
              { label: 'Asam Folat', current: '15%', target: '125/700g' },
            ].map((nutrient, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-[#EE6983] font-bold">{nutrient.label}</p>
                  <p className="text-xs text-[#EE6983] font-bold">{nutrient.target}</p>
                </div>
                <div className="w-full bg-white rounded-full h-3 overflow-hidden border-2 border-[#FFB3D9] shadow-sm">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: nutrient.current,
                      backgroundColor: '#EE6983',
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat Makanan */}
        <div>
          <h3 className="text-[#EE6983] font-bold text-lg mb-4">Riwayat Makanan</h3>
          <div className="space-y-3">
            {[
              { name: 'Ayam Bakar Madu', protein: '85g', zat_besi: '70g', asam_folat: '50g' },
              { name: 'Ikan Bakar Taliwang', protein: '90g', zat_besi: '75g', asam_folat: '55g' },
              { name: 'Sate Ayam', protein: '80g', zat_besi: '65g', asam_folat: '48g' },
              { name: 'Ayam Bakar Madu', protein: '85g', zat_besi: '70g', asam_folat: '50g' },
            ].map((food, idx) => (
              <div
                key={idx}
                className="rounded-3xl p-4 flex items-center gap-4 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                style={{ backgroundColor: '#FFE8F0' }}
              >
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-300 to-orange-400 shrink-0 flex items-center justify-center text-2xl shadow-md">
                  🍗
                </div>
                <div className="flex-1">
                  <p className="text-[#EE6983] font-bold text-sm">{food.name}</p>
                  <div className="flex gap-3 mt-2 text-xs flex-wrap">
                    <span className="text-[#EE6983] font-bold">{food.protein} Protein</span>
                    <span className="text-[#EE6983] font-bold">{food.zat_besi} Zat Besi</span>
                    <span className="text-[#EE6983] font-bold">{food.asam_folat} Asam Folat</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#EE6983] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
