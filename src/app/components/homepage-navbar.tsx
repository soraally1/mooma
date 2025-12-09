'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Utensils, Stethoscope, User, LogOut, MessageCircle, ChevronDown, BookOpen, Apple } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function HomepageNavbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moomasakOpen, setMoomasakOpen] = useState(false);
  const [mobileMoomasakOpen, setMobileMoomasakOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoomasakOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      toast.success('Logout berhasil!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Gagal logout');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
    setMoomasakOpen(false);
    setMobileMoomasakOpen(false);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:flex bg-[#FFF5E4] px-8 py-5 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/mooma.svg" alt="Mooma" className="h-10 w-auto" />
        </div>

        {/* Desktop Navigation */}
        <nav className="flex items-center gap-10">
          <button
            onClick={() => handleNavigation('/pages/homepage')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <Home className="w-5 h-5 group-hover:scale-125 transition-transform" />
            Beranda
          </button>

          {/* Moomasak Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMoomasakOpen(!moomasakOpen)}
              className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
            >
              <Utensils className="w-5 h-5 group-hover:scale-125 transition-transform" />
              Moomasak
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${moomasakOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {moomasakOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[160px] animate-fade-in z-50">
                <button
                  onClick={() => handleNavigation('/pages/resep')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-[#B13455] hover:bg-[#FFF5E4] hover:text-[#EE6983] font-medium transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  Resep
                </button>
                <button
                  onClick={() => handleNavigation('/pages/nutrition')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-[#B13455] hover:bg-[#FFF5E4] hover:text-[#EE6983] font-medium transition-all"
                >
                  <Apple className="w-4 h-4" />
                  Nutrisi
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => handleNavigation('/pages/moomasehat')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <Stethoscope className="w-5 h-5 group-hover:scale-125 transition-transform" />
            MoomaSehat
          </button>
          <button
            onClick={() => handleNavigation('/pages/ceritamooma')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
            CeritaMooma
          </button>
          <button
            onClick={() => handleNavigation('/pages/profile')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <User className="w-5 h-5 group-hover:scale-125 transition-transform" />
            Profil
          </button>
          <div className="h-8 w-1 bg-[#EE6983] rounded-full"></div>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 bg-[#EE6983] hover:bg-[#B13455] text-white px-5 py-2 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <LogOut className="w-5 h-5" />
            {loading ? 'Keluar...' : 'Keluar'}
          </button>
        </nav>
      </header>


      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#FFF5E4] flex justify-around items-center py-3 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => handleNavigation('/pages/homepage')}
          className="flex flex-col items-center gap-0.5 text-[#B13455] hover:text-[#EE6983] transition-all group"
        >
          <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold">Beranda</span>
        </button>

        {/* Mobile Moomasak Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMobileMoomasakOpen(!mobileMoomasakOpen)}
            className="flex flex-col items-center gap-0.5 text-[#B13455] hover:text-[#EE6983] transition-all group"
          >
            <Utensils className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold">Moomasak</span>
          </button>

          {/* Mobile Dropdown Menu - Opens Upward */}
          {mobileMoomasakOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[140px] animate-fade-in z-50">
              <button
                onClick={() => handleNavigation('/pages/resep')}
                className="flex items-center gap-3 w-full px-4 py-3 text-[#B13455] hover:bg-[#FFF5E4] hover:text-[#EE6983] font-medium transition-all"
              >
                <BookOpen className="w-4 h-4" />
                Resep
              </button>
              <button
                onClick={() => handleNavigation('/pages/nutrition')}
                className="flex items-center gap-3 w-full px-4 py-3 text-[#B13455] hover:bg-[#FFF5E4] hover:text-[#EE6983] font-medium transition-all"
              >
                <Apple className="w-4 h-4" />
                Nutrisi
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => handleNavigation('/pages/moomasehat')}
          className="flex flex-col items-center gap-0.5 text-[#B13455] hover:text-[#EE6983] transition-all group"
        >
          <Stethoscope className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold">Sehat</span>
        </button>
        <button
          onClick={() => handleNavigation('/pages/ceritamooma')}
          className="flex flex-col items-center gap-0.5 text-[#B13455] hover:text-[#EE6983] transition-all group"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold">Cerita</span>
        </button>
        <button
          onClick={() => handleNavigation('/pages/profile')}
          className="flex flex-col items-center gap-0.5 text-[#B13455] hover:text-[#EE6983] transition-all group"
        >
          <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </nav>

      {/* Overlay to close mobile dropdown when clicking outside */}
      {mobileMoomasakOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMobileMoomasakOpen(false)}
        />
      )}
    </>
  );
}
