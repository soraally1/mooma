'use client';

import React from 'react';
import { Home, Utensils, Stethoscope, Heart, LogOut } from 'lucide-react';

export default function HomepageNavbar() {

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:flex bg-[#FFF5E4] px-8 py-4 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/mooma.svg" alt="Mooma" className="h-10 w-auto" />
        </div>

        {/* Desktop Navigation */}
        <nav className="flex items-center gap-8">
          <a href="#" className="text-[#B13455] hover:text-pink-500 font-medium transition">Beranda</a>
          <a href="#" className="text-[#B13455] hover:text-pink-500 font-medium transition">Fitur</a>
          <a href="#" className="text-[#B13455] hover:text-pink-500 font-medium transition">Konsultasi</a>
          <a href="#" className="text-[#B13455] hover:text-pink-500 font-medium transition">Tentang</a>
          <button className="flex items-center gap-2 bg-[#B13455] text-white px-4 py-2 rounded-lg transition">
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </nav>
      </header>


      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#FFF5E4] border-pink-200 flex justify-around items-center py-3 z-50">
        <a href="#" className="flex flex-col items-center gap-1 text-gray-700 hover:text-pink-500 transition">
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Beranda</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 text-gray-700 hover:text-pink-500 transition">
          <Utensils className="w-6 h-6" />
          <span className="text-xs font-medium">Resep</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 text-gray-700 hover:text-pink-500 transition">
          <Stethoscope className="w-6 h-6" />
          <span className="text-xs font-medium">Konsultasi</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 text-gray-700 hover:text-pink-500 transition">
          <Heart className="w-6 h-6" />
          <span className="text-xs font-medium">Profil</span>
        </a>
      </nav>
    </>
  );
}
