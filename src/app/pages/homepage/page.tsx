'use client';

import React from 'react';
import { ChefHat, Apple, Stethoscope, Heart, Dumbbell, BookOpen, MessageCircle } from 'lucide-react';
import HomepageNavbar from '@/app/components/homepage-navbar';

export default function Homepage() {
  return (
    <div className="min-h-screen lg:bg-[#FFF5E4] pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
      <HomepageNavbar />

      {/* Hero Section */}
      <section className="px-4 lg:px-8 py-10 lg:py-20 text-center lg:text-left relative overflow-hidden" style={{backgroundColor: '#EE6983' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left - Image */}
          <div className="flex justify-center lg:justify-start">
            <img src="/trimester4.svg" alt="Trimester 4" className="w-48 h-48 lg:w-64 lg:h-64 object-contain" />
          </div>

          {/* Right - Content */}
          <div className="text-white">
            <p className="text-sm lg:text-base font-semibold mb-2 opacity-90">Aku akan lahir</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-2">250 Hari lagi</h2>
            <p className="text-xl lg:text-2xl font-semibold mb-8">Moomaa 💕</p>
            
            <div className="bg-[#FFF5E4] rounded-2xl p-6 shadow-lg">
              <p className="text-[#B13455] text-sm lg:text-base font-semibold mb-4">Progress Kehamilan</p>
              <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-[#B13455] rounded-full transition-all duration-500"></div>
              </div>
              <p className="text-gray-600 text-xs lg:text-sm mt-3">Trimester 3 - Minggu 30</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 lg:px-8 py-8 lg:py-16" style={{ backgroundColor: '#EE6983' }}>
        <div className="max-w-7xl mx-auto">
          <h3 className="text-white font-bold text-lg lg:text-2xl mb-6 lg:mb-12">Fitur unggulan</h3>
          <div className="grid grid-cols-4 lg:grid-cols-4 gap-3 lg:gap-6">
            <div className="bg-[#FFF5E4] rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center h-28 lg:h-40 shadow-md transition transform hover:scale-105 cursor-pointer">
              <ChefHat className="w-8 h-8 lg:w-12 lg:h-12 text-[#EE6983] mb-2 lg:mb-3" />
              <p className="text-[#EE6983] text-xs lg:text-sm text-center font-semibold">Resep Mooma</p>
            </div>
            <div className="bg-[#FFF5E4] rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center h-28 lg:h-40 shadow-md transition transform hover:scale-105 cursor-pointer">
              <Apple className="w-8 h-8 lg:w-12 lg:h-12 text-[#EE6983] mb-2 lg:mb-3" />
              <p className="text-[#EE6983] text-xs lg:text-sm text-center font-semibold">Nutrisi Mooma</p>
            </div>
            <div className="bg-[#FFF5E4] rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center h-28 lg:h-40 shadow-md transition transform hover:scale-105 cursor-pointer">
              <Stethoscope className="w-8 h-8 lg:w-12 lg:h-12 text-[#EE6983] mb-2 lg:mb-3" />
              <p className="text-[#EE6983] text-xs lg:text-sm text-center font-semibold">Konsultasi</p>
            </div>
            <div className="bg-[#FFF5E4] rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center h-28 lg:h-40 shadow-md transition transform hover:scale-105 cursor-pointer">
              <Heart className="w-8 h-8 lg:w-12 lg:h-12 text-[#EE6983] mb-2 lg:mb-3" />
              <p className="text-[#EE6983] text-xs lg:text-sm text-center font-semibold">Mooma Care</p>
            </div>
          </div>
        </div>
      </section>

      {/* Olahraga Section */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="max-w-7xl mx-auto">
          <h3 className="font-bold text-lg lg:text-2xl mb-4 lg:mb-8 text-[#EE6983]">Olahraga yuk mooma</h3>
          <div className="relative">
            <div className="rounded-3xl p-6 lg:p-12 text-white shadow-lg lg:shadow-xl" style={{ backgroundColor: '#EE6983', paddingRight: '14rem' }}>
              <div className="max-w-xs">
                <p className="text-base lg:text-xl font-semibold mb-6 lg:mb-8 leading-relaxed">Mulai olahraga untuk menjaga kesehatan Mooma dan bayi!</p>
                <button className="bg-white text-pink-500 font-bold py-3 lg:py-4 px-8 rounded-2xl hover:bg-gray-100 transition shadow-md">
                  Mulai olahraga
                </button>
              </div>
            </div>
            
            {/* Overlapping Image - Aligned at bottom */}
            <div className="absolute -right-4 bottom-0 lg:-right-12 w-60 h-60 lg:w-80 lg:h-80 pointer-events-none">
              <img src="/olahraga.svg" alt="Olahraga" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Section */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="max-w-7xl mx-auto">
          <h3 className="font-bold text-lg lg:text-2xl mb-2 lg:mb-4 text-[#EE6983]">Momma binggung apa mau masak apa?</h3>
          <p className="text-[#EE6983] text-sm lg:text-base mb-6 lg:mb-10">Binggung mau masak apa hari ini? Yuk, cari resep sehat yang gizi.</p>
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-6">
            <button className="bg-[#EE6983] rounded-xl p-4 lg:p-8 text-white text-sm lg:text-base font-bold shadow-md transition flex flex-col items-center gap-2 lg:gap-3 h-32 lg:h-40 justify-center">
              <BookOpen className="w-6 h-6 lg:w-8 lg:h-8" />
              Buat resep
            </button>
            <button className="bg-[#EE6983] rounded-xl p-4 lg:p-8 text-white text-sm lg:text-base font-bold shadow-md transition flex flex-col items-center gap-2 lg:gap-3 h-32 lg:h-40 justify-center">
              <BookOpen className="w-6 h-6 lg:w-8 lg:h-8" />
              Cari resep
            </button>
            <button className="bg-[#EE6983] rounded-xl p-4 lg:p-8 text-white text-sm lg:text-base font-bold shadow-md transition flex flex-col items-center gap-2 lg:gap-3 h-32 lg:h-40 justify-center">
              <BookOpen className="w-6 h-6 lg:w-8 lg:h-8" />
              Resep Terpopuler
            </button>
          </div>
        </div>
      </section>

      {/* Doctor Consultation Section */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="max-w-7xl mx-auto">
          <h3 className="font-bold text-lg lg:text-2xl mb-6 lg:mb-10 text-[#EE6983]">Momma mau ngobrol sama dengan ai kami?</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Left - Image */}
            <div className="rounded-2xl overflow-hidden shadow-lg lg:shadow-xl">
              <img src="/image.svg" alt="Konsultasi Dokter" className="w-full h-48 lg:h-64 object-cover" />
            </div>

            {/* Right - Message */}
            <div className="flex flex-col justify-center">
              <div className="rounded-2xl p-6 lg:p-8 text-white shadow-md lg:shadow-lg" style={{ backgroundColor: '#EE6983' }}>
                <div className="flex gap-3 lg:gap-4">
                  <MessageCircle className="w-6 h-6 lg:w-8 lg:h-8 shrink-0 mt-1" />
                  <div>
                    <p className="text-sm lg:text-base font-semibold leading-relaxed">Hai Mooma, apakah kamu siap untuk berbincang dengan Smartmi tentang perjalanan kehamilanmu?</p>
                    <button className="mt-4 bg-white text-pink-500 font-bold py-2 lg:py-3 px-6 rounded-lg hover:bg-gray-100 transition">
                      Mulai Konsultasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
