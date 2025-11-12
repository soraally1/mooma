'use client';

import Navbar from "@/app/components/navbar";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden font-sans" style={{ backgroundColor: 'var(--color-cream-light)' }}>
        <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-8 md:px-16 py-16 md:py-24 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold max-w-5xl leading-tight mb-8" style={{ color: 'var(--color-pink-normal)' }}>
          Teman digital ibu hamil yang peduli dan cerdas
        </h1>
        
        <p className="text-sm md:text-base max-w-2xl mb-12 leading-relaxed font-serif" style={{ color: 'var(--color-pink-normal)' }}>
          Haii bunda, yuk jaga perjalanan kehamilanmu dengan informasi terpercaya, tips kesehatan, dan dukungan yang kamu butuhkan. Mooma hadir untuk membantu setiap langkahmu menuju momen bahagia bersama buah hati.
        </p>

        <Link href="/pages/signup">
          <button className="text-white px-10 py-3 rounded-lg font-medium text-lg transition-colors shadow-lg" style={{ backgroundColor: 'var(--color-pink-normal)' }} onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--color-pink-normal-hover)'} onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--color-pink-normal)'}>
            Daftar Sekarang!
          </button>
        </Link>
      </main>

      {/* Wave Pattern */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <svg viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 150C240 50 480 100 720 150C960 200 1200 250 1440 150V400H0V150Z" 
            fill="var(--color-pink-normal)"
            style={{ fill: 'var(--color-pink-normal)' }}
          />
          <path 
            d="M0 200C240 300 480 250 720 200C960 150 1200 100 1440 200V400H0V200Z" 
            fill="var(--color-pink-normal-hover)"
            fillOpacity="0.8"
            style={{ fill: 'var(--color-pink-normal-hover)' }}
          />
        </svg>
      </div>
    </div>
  );
}