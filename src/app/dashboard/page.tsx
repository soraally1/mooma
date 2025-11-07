'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import Navbar from '../components/navbar';

export default function Dashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/pages/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center">
        <div className="text-[#E26884] text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] font-sans">
      <Navbar />
      
      <main className="container mx-auto px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h1 className="text-4xl font-bold text-[#E26884] mb-4">
              Selamat Datang, {userData?.name || user.displayName}! 🌸
            </h1>
            
            <p className="text-[#E26884] text-lg mb-6">
              Selamat datang di dashboard Mooma. Perjalanan kehamilan yang indah dimulai dari sini.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-pink-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[#E26884] mb-3">
                  Informasi Akun
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Provider:</strong> {userData?.provider || 'email'}</p>
                  <p><strong>Bergabung:</strong> {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('id-ID') : 'N/A'}</p>
                  <p><strong>Login Terakhir:</strong> {userData?.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleDateString('id-ID') : 'N/A'}</p>
                </div>
              </div>

              <div className="bg-pink-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[#E26884] mb-3">
                  Fitur Tersedia
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✨ Tracker Kehamilan</li>
                  <li>📚 Artikel & Tips</li>
                  <li>👶 Perkembangan Bayi</li>
                  <li>🏥 Jadwal Kontrol</li>
                  <li>💬 Komunitas Ibu</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button className="bg-[#E26884] hover:bg-[#D15570] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Mulai Tracker
              </button>
              <button className="bg-pink-100 hover:bg-pink-200 text-[#E26884] px-6 py-3 rounded-lg font-medium transition-colors">
                Baca Artikel
              </button>
              <button 
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#E26884] mb-4">
              Data Terenkripsi (Demo)
            </h2>
            <p className="text-gray-600 mb-4">
              Data sensitif Anda disimpan dengan enkripsi Base64 untuk keamanan:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto">
              <strong>Encrypted Data:</strong><br />
              {userData?.encryptedData ? (
                <span className="text-green-600 break-all">
                  {userData.encryptedData.substring(0, 100)}...
                </span>
              ) : (
                <span className="text-gray-500">No encrypted data available</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
