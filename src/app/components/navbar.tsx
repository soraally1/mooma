import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="bg-transparent">
            <div className="flex justify-between items-center h-16 px-8 md:px-16 py-6">
                <Link href="/">
                    <Image
                        src="/mooma.svg"
                        alt="Mooma"
                        width={120}
                        height={40}
                        priority
                        className="h-10 w-auto cursor-pointer"
                    />
                </Link>
                <Link href="/pages/login">
                    <button className="bg-pink-100 hover:bg-pink-200 text-[#E26884] px-6 py-2 rounded-lg font-medium transition-colors">
                        Login
                    </button>
                </Link>
            </div>
        </nav>
    );
}