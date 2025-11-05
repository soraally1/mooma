import Image from "next/image";
import Navbar from "@/components/navbar";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDF8F0] relative overflow-hidden font-sans">
        <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-8 md:px-16 py-16 md:py-24 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#E26884] max-w-5xl leading-tight mb-8">
          Teman digital ibu hamil yang peduli dan cerdas
        </h1>
        
        <p className="text-[#E26884] text-sm md:text-base max-w-2xl mb-12 leading-relaxed font-serif">
          Haii bunda, yuk jaga perjalanan kehamilanmu dengan informasi terpercaya, tips kesehatan, dan dukungan yang kamu butuhkan. Mooma hadir untuk membantu setiap langkahmu menuju momen bahagia bersama buah hati.
        </p>

        <Link href="/signup">
          <button className="bg-[#E26884] hover:bg-[#D15570] text-white px-10 py-3 rounded-lg font-medium text-lg transition-colors shadow-lg">
            Daftar Sekarang!
          </button>
        </Link>
      </main>

      {/* Wave Pattern */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <svg viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 150C240 50 480 100 720 150C960 200 1200 250 1440 150V400H0V150Z" 
            fill="#E26884"
          />
          <path 
            d="M0 200C240 300 480 250 720 200C960 150 1200 100 1440 200V400H0V200Z" 
            fill="#D15570"
            fillOpacity="0.8"
          />
        </svg>
      </div>
    </div>
  );
}