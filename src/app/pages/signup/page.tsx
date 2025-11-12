'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { AuthService } from "../../../lib/auth";
import toast from "react-hot-toast";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Nama lengkap harus diisi');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email harus diisi');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return false;
    }
    if (!formData.acceptTerms) {
      toast.error('Anda harus menyetujui syarat dan ketentuan');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUp(formData);
      toast.success('Akun berhasil dibuat!');
      
      // New user, redirect to moomainformasi to complete profile
      router.push('/pages/moomainformasi');
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat akun');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      toast.success('Akun berhasil dibuat!');
      
      // Check if this is a new user
      const userData = await AuthService.getCurrentUserData();
      if (userData && userData.profileCompleted) {
        // User already has profile, go to homepage
        router.push('/pages/homepage');
      } else {
        // New user, go to moomainformasi to complete profile
        router.push('/pages/moomainformasi');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal daftar dengan Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] relative overflow-hidden font-sans">
      <Navbar />
      
      <main className="flex flex-col items-center justify-center px-8 py-16 md:py-24">
        <div className="w-full max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold text-[#E26884] text-center mb-4">
            Bergabung dengan Mooma
          </h1>
          
          <p className="text-[#E26884] text-center mb-8 font-serif">
            Mulai perjalanan kehamilan yang indah bersama kami
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#E26884] mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan nama lengkap kamu"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#E26884] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan email kamu"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#E26884] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan password kamu"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#E26884] mb-2">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="konfirmasi password kamu"
                  required
                />
              </div>

              <div className="flex items-start">
                <input 
                  type="checkbox" 
                  id="acceptTerms" 
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleInputChange}
                  className="mt-1 mr-2 rounded" 
                  required
                />
                <label htmlFor="acceptTerms" className="text-sm text-[#E26884]">
                  Saya setuju dengan{" "}
                  <a href="#" className="font-semibold hover:underline">
                    syarat dan ketentuan
                  </a>{" "}
                  yang berlaku
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E26884] hover:bg-[#D15570] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium text-lg transition-colors shadow-lg"
              >
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-pink-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-[#E26884]">atau</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-pink-200 rounded-lg shadow-sm bg-white text-[#E26884] hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Mendaftar...' : 'Daftar dengan Google'}
              </button>
            </div>

            <p className="text-center text-[#E26884] mt-6">
              Sudah punya akun?{" "}
              <Link href="/pages/login" className="font-semibold hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </main>


    </div>
  );
}
