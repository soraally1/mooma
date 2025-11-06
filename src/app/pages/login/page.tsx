import Navbar from "../../components/navbar";
import Link from "next/link";

export default function Login() {
  return (
    <div className="min-h-screen bg-[#FDF8F0] relative overflow-hidden font-sans">
      <Navbar />
      
      <main className="flex flex-col items-center justify-center px-8 py-16 md:py-24">
        <div className="w-full max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold text-[#E26884] text-center mb-4">
            Selamat Datang Kembali
          </h1>
          
          <p className="text-[#E26884] text-center mb-8 font-serif">
            Masuk untuk melanjutkan perjalananmu
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form className="space-y-6">
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-[#E26884]">
                  <input type="checkbox" className="mr-2 rounded" />
                  Ingat saya
                </label>
                <a href="#" className="text-[#E26884] hover:underline">
                  Lupa password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-[#E26884] hover:bg-[#D15570] text-white py-3 rounded-lg font-medium text-lg transition-colors shadow-lg"
              >
                Masuk
              </button>
            </form>

            <p className="text-center text-[#E26884] mt-6">
              Belum punya akun?{" "}
              <Link href="/pages/signup" className="font-semibold hover:underline">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </main>

  
    </div>
  );
}
