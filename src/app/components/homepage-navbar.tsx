'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Utensils, Stethoscope, User, LogOut, Menu, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function HomepageNavbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <button 
            onClick={() => handleNavigation('/pages/resep')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <Utensils className="w-5 h-5 group-hover:scale-125 transition-transform" />
            Resep
          </button>
          <button 
            onClick={() => handleNavigation('/pages/homepage')}
            className="flex items-center gap-2 text-[#B13455] hover:text-[#EE6983] font-semibold transition-all duration-300 hover:scale-110 group"
          >
            <Stethoscope className="w-5 h-5 group-hover:scale-125 transition-transform" />
            Konsultasi
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#FFF5E4] flex justify-around items-center py-4 z-50">
        <button 
          onClick={() => handleNavigation('/pages/homepage')}
          className="flex flex-col items-center gap-1 text-[#B13455] hover:text-[#EE6983] transition-all duration-300 transform hover:scale-110 group"
        >
          <Home className="w-6 h-6 group-hover:scale-125 transition-transform" />
          <span className="text-xs font-bold">Beranda</span>
        </button>
        <button 
          onClick={() => handleNavigation('/pages/resep')}
          className="flex flex-col items-center gap-1 text-[#B13455] hover:text-[#EE6983] transition-all duration-300 transform hover:scale-110 group"
        >
          <Utensils className="w-6 h-6 group-hover:scale-125 transition-transform" />
          <span className="text-xs font-bold">Resep</span>
        </button>
        <button 
          onClick={() => handleNavigation('/pages/homepage')}
          className="flex flex-col items-center gap-1 text-[#B13455] hover:text-[#EE6983] transition-all duration-300 transform hover:scale-110 group"
        >
          <Stethoscope className="w-6 h-6 group-hover:scale-125 transition-transform" />
          <span className="text-xs font-bold">Konsultasi</span>
        </button>
        <button 
          onClick={() => handleNavigation('/pages/profile')}
          className="flex flex-col items-center gap-1 text-[#B13455] hover:text-[#EE6983] transition-all duration-300 transform hover:scale-110 group"
        >
          <User className="w-6 h-6 group-hover:scale-125 transition-transform" />
          <span className="text-xs font-bold">Profil</span>
        </button>
      </nav>
    </>
  );
}
