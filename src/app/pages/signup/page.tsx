import Navbar from "../../components/navbar";
import Link from "next/link";

export default function Signup() {
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
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#E26884] mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan nama lengkap kamu"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#E26884] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan email kamu"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#E26884] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="masukkan password kamu"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-[#E26884] mb-2">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  className="w-full px-4 py-3 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-[#E26884] focus:border-transparent"
                  placeholder="konfirmasi password kamu"
                />
              </div>

              <div className="flex items-start">
                <input type="checkbox" id="terms" className="mt-1 mr-2 rounded" />
                <label htmlFor="terms" className="text-sm text-[#E26884]">
                  Saya setuju dengan{" "}
                  <a href="#" className="font-semibold hover:underline">
                    syarat dan ketentuan
                  </a>{" "}
                  yang berlaku
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-[#E26884] hover:bg-[#D15570] text-white py-3 rounded-lg font-medium text-lg transition-colors shadow-lg"
              >
                Daftar Sekarang
              </button>
            </form>

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
