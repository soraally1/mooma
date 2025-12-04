'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronRight, ChevronLeft, Clock, Users, ChefHat, Heart, AlertCircle, CheckCircle2, Sparkles, UtensilsCrossed, BookOpen, Trash2, Bookmark } from 'lucide-react';
import { auth } from '@/lib/firebase';
import HomepageNavbar from '@/app/components/homepage-navbar';
import toast, { Toaster } from 'react-hot-toast';

interface RecipeQuestion {
  id: string;
  question: string;
  placeholder: string;
  type: 'text' | 'textarea';
  icon?: React.ReactNode;
  suggestions?: string[];
}

import { recipeService, Recipe, RecipeResponse } from '@/services/recipeService';

const questions: RecipeQuestion[] = [
  {
    id: 'allergies',
    question: 'Apakah Mooma memiliki alergi makanan?',
    placeholder: 'Contoh: Kacang, Telur, Seafood, Susu Sapi...',
    type: 'textarea',
    suggestions: ['Tidak ada', 'Kacang', 'Seafood', 'Telur', 'Susu Sapi', 'Gluten'],
  },
  {
    id: 'preferences',
    question: 'Makanan apa yang Mooma sukai?',
    placeholder: 'Contoh: Masakan Indonesia, Sup, Tumisan, Pedas...',
    type: 'textarea',
    suggestions: ['Masakan Indonesia', 'Western', 'Chinese Food', 'Sup & Kuah', 'Tumisan', 'Pedas'],
  },
  {
    id: 'bodyCondition',
    question: 'Bagaimana kondisi tubuh Mooma saat ini?',
    placeholder: 'Contoh: Sering mual pagi hari, cepat lelah, pusing...',
    type: 'textarea',
    suggestions: ['Sehat bugar', 'Mual (Morning Sickness)', 'Cepat lelah', 'Pusing', 'Kaki bengkak', 'Sembelit'],
  },
  {
    id: 'nutritionNeeds',
    question: 'Apa kebutuhan nutrisi prioritas Mooma?',
    placeholder: 'Contoh: Tambah zat besi, kalsium, protein tinggi...',
    type: 'textarea',
    suggestions: ['Zat Besi (Cegah Anemia)', 'Kalsium (Tulang)', 'Protein Tinggi', 'Asam Folat', 'Serat Tinggi'],
  },
  {
    id: 'dietaryRestrictions',
    question: 'Apakah ada pantangan makanan lainnya?',
    placeholder: 'Contoh: Kurangi gula, rendah garam, tidak makan daging merah...',
    type: 'textarea',
    suggestions: ['Tidak ada', 'Rendah Gula', 'Rendah Garam', 'Vegetarian', 'Halal'],
  },
];

export default function ResepPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recipes, setRecipes] = useState<RecipeResponse | null>(null);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [user, setUser] = useState<any>(null);
  const [viewingSavedRecipe, setViewingSavedRecipe] = useState<Recipe | null>(null);

  // Check authentication and fetch saved recipes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/pages/login');
        return;
      }
      setIsAuthenticated(true);
      setUser(currentUser);
      fetchSavedRecipes(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchSavedRecipes = async (userId: string) => {
    try {
      const fetchedRecipes = await recipeService.getSavedRecipes(userId);
      setSavedRecipes(fetchedRecipes);
    } catch (error) {
      toast.error('Gagal memuat resep tersimpan');
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) return;
    try {
      await recipeService.saveRecipe(user.uid, recipe);
      toast.success('Resep berhasil disimpan ke Jurnal!');
      fetchSavedRecipes(user.uid); // Refresh list
    } catch (error) {
      toast.error('Gagal menyimpan resep');
    }
  };

  const handleDeleteRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the recipe
    if (!confirm('Apakah Mooma yakin ingin menghapus resep ini dari jurnal?')) return;

    try {
      await recipeService.deleteRecipe(recipeId);
      toast.success('Resep dihapus dari Jurnal');
      setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
      if (viewingSavedRecipe?.id === recipeId) {
        setViewingSavedRecipe(null);
        setShowRecipes(false);
      }
    } catch (error) {
      toast.error('Gagal menghapus resep');
    }
  };

  const handleAnswerChange = (value: string) => {
    const questionId = questions[currentQuestion].id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSuggestionClick = (suggestion: string) => {
    const questionId = questions[currentQuestion].id;
    const currentVal = answers[questionId] || '';

    if (suggestion === 'Tidak ada' || currentVal === 'Tidak ada') {
      handleAnswerChange(suggestion);
      return;
    }

    if (!currentVal.includes(suggestion)) {
      const newValue = currentVal ? `${currentVal}, ${suggestion}` : suggestion;
      handleAnswerChange(newValue);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleGenerateRecipes = async () => {
    try {
      setLoading(true);
      const data = await recipeService.generateRecipes(answers);
      setRecipes(data);
      setShowRecipes(true);
      setCurrentRecipeIndex(0);
      setViewingSavedRecipe(null);
    } catch (error) {
      toast.error('Gagal membuat resep. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const openSavedRecipe = (recipe: Recipe) => {
    setViewingSavedRecipe(recipe);
    // Construct a fake response object to reuse the view
    setRecipes({
      recipes: [recipe],
      summary: 'Resep dari Jurnal Mooma',
      warnings: ''
    });
    setCurrentRecipeIndex(0);
    setShowRecipes(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#EE6983]" />
          <p className="text-[#B13455] font-semibold">Memverifikasi akun Mooma...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-[#EE6983] border-t-transparent animate-spin"></div>
            <ChefHat className="w-12 h-12 text-[#EE6983] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce-slow" />
          </div>
          <div className="animate-fade-in">
            <h3 className="text-3xl font-black text-[#EE6983] mb-3">Meracik Resep Spesial</h3>
            <p className="text-[#B13455] text-lg">
              Sedang menyusun menu sehat berdasarkan preferensi dan kebutuhan nutrisi Mooma...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!showQuestions && !showRecipes) {
    return (
      <div className="min-h-screen lg:bg-white pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
        <Toaster position="top-center" />
        <HomepageNavbar />

        {/* Hero Section */}
        <section className="px-4 lg:px-8 py-10 lg:py-20 text-center lg:text-left relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div className="text-white order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6 animate-fade-in">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">AI Powered Nutritionist</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight animate-fade-in-delay-1">
                Resep Sehat untuk <br />
                <span className="text-yellow-100">Mooma & Si Kecil</span>
              </h1>

              <p className="text-xl lg:text-2xl font-medium mb-10 opacity-90 animate-fade-in-delay-2 leading-relaxed">
                Dapatkan rekomendasi menu harian yang dipersonalisasi sesuai dengan kondisi kehamilan, alergi, dan selera makan Mooma.
              </p>

              <button
                onClick={() => setShowQuestions(true)}
                className="bg-white text-[#EE6983] font-black py-4 px-8 rounded-2xl hover:bg-yellow-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 animate-fade-in-delay-3 flex items-center gap-3 mx-auto lg:mx-0"
              >
                <span className="text-lg">Mulai Konsultasi Rasa</span>
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex justify-center lg:justify-end order-1 lg:order-2 animate-fade-in-delay-2">
              <div className="relative w-72 h-72 lg:w-96 lg:h-96 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm animate-bounce-slow">
                <ChefHat className="w-40 h-40 lg:w-52 lg:h-52 text-white opacity-90" />
                <div className="absolute -top-4 -right-4 bg-white p-4 rounded-2xl shadow-xl transform rotate-12">
                  <UtensilsCrossed className="w-8 h-8 text-[#EE6983]" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-2xl shadow-xl transform -rotate-12">
                  <Heart className="w-8 h-8 text-[#EE6983]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Saved Recipes Journal Section */}
        {savedRecipes.length > 0 && (
          <section className="px-4 lg:px-8 py-12 lg:py-20" style={{ backgroundColor: '#FFF5E4' }}>
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-8 justify-center">
                <BookOpen className="w-8 h-8 text-[#B13455]" />
                <h3 className="font-black text-3xl text-[#B13455]">Jurnal Resep Mooma</h3>
              </div>

              {/* Journal/Notebook Style Container */}
              <div className="bg-white rounded-[20px] shadow-2xl overflow-hidden relative min-h-[400px] transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Notebook Binding Effect */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#333] z-20 flex flex-col items-center py-6 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-full bg-gray-600 shadow-inner border border-gray-500"></div>
                  ))}
                </div>
                <div className="absolute left-10 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-300 to-white z-10"></div>

                {/* Paper Content */}
                <div className="pl-20 pr-8 py-10 bg-[#fffdf0] min-h-full relative">
                  {/* Lined Paper Effect */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(#e5e5e5 1px, transparent 1px)',
                      backgroundSize: '100% 2rem',
                      marginTop: '4rem'
                    }}>
                  </div>

                  {/* Red Margin Line */}
                  <div className="absolute left-24 top-0 bottom-0 w-0.5 bg-red-200/50 z-0"></div>

                  <h4 className="font-schoolbell text-4xl text-[#EE6983] mb-8 relative z-10 transform -rotate-2">
                    Koleksi Resep Favoritku
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 relative z-10">
                    {savedRecipes.map((recipe, idx) => (
                      <div
                        key={recipe.id}
                        onClick={() => openSavedRecipe(recipe)}
                        className="group cursor-pointer relative pl-6"
                      >
                        {/* Bullet Point */}
                        <div className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-[#B13455] group-hover:bg-[#B13455] transition-colors"></div>

                        <div className="border-b border-dashed border-[#B13455]/30 pb-2 group-hover:border-[#B13455] transition-colors flex justify-between items-start">
                          <div>
                            <h5 className="font-schoolbell text-2xl text-[#2c2c2c] group-hover:text-[#EE6983] transition-colors leading-tight">
                              {recipe.name}
                            </h5>
                            <div className="flex gap-3 mt-1 text-sm font-urbanist text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {recipe.cookTime} mnt
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {recipe.servings}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleDeleteRecipe(recipe.id!, e)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                            title="Hapus dari jurnal"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Grid */}
        <section className="px-4 lg:px-8 py-12 lg:py-20 lg:bg-white" style={{ backgroundColor: '#FFF5E4' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8 lg:mb-12">
              <BookOpen className="w-8 h-8 lg:w-10 lg:h-10 text-[#B13455]" />
              <h3 className="font-black text-2xl lg:text-3xl text-[#B13455]">Kenapa Resep Mooma?</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Heart, title: "Personal", desc: "Disesuaikan dengan kondisi tubuh", color: '#EE6983', delay: 'delay-0' },
                { icon: ChefHat, title: "Lezat", desc: "Tetap enak dan menggugah selera", color: '#E26884', delay: 'delay-100' },
                { icon: CheckCircle2, title: "Aman", desc: "Bahan aman untuk ibu hamil", color: '#D15570', delay: 'delay-200' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-3xl p-8 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-fade-in ${item.delay}`}
                  style={{ backgroundColor: item.color }}
                >
                  <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-black text-2xl mb-3">{item.title}</h3>
                  <p className="text-white/90 font-medium text-lg leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delay-1 {
            0% { opacity: 0; transform: translateY(20px); }
            20% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delay-2 {
            0% { opacity: 0; transform: translateY(20px); }
            40% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delay-3 {
            0% { opacity: 0; transform: translateY(20px) scale(0.9); }
            60% { opacity: 0; transform: translateY(20px) scale(0.9); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
          .animate-fade-in-delay-1 { animation: fade-in-delay-1 0.8s ease-out forwards; }
          .animate-fade-in-delay-2 { animation: fade-in-delay-2 0.8s ease-out forwards; }
          .animate-fade-in-delay-3 { animation: fade-in-delay-3 0.8s ease-out forwards; }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
          .delay-0 { animation-delay: 0s; }
          .delay-100 { animation-delay: 0.1s; }
          .delay-200 { animation-delay: 0.2s; }
        `}</style>
      </div>
    );
  }

  if (showRecipes && recipes) {
    const currentRecipe = recipes.recipes[currentRecipeIndex];
    const isSaved = viewingSavedRecipe || savedRecipes.some(r => r.name === currentRecipe.name && r.description === currentRecipe.description);

    return (
      <div className="min-h-screen lg:bg-white pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
        <Toaster position="top-center" />
        <HomepageNavbar />

        <div className="px-4 lg:px-8 py-8 lg:py-12">
          <div className="max-w-6xl mx-auto">
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8 animate-fade-in">
              <button
                onClick={() => {
                  setShowRecipes(false);
                  if (!viewingSavedRecipe) {
                    setShowQuestions(true);
                  } else {
                    setViewingSavedRecipe(null);
                  }
                }}
                className="flex items-center gap-2 text-[#B13455] font-bold hover:text-[#EE6983] transition-colors bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md"
              >
                <ChevronLeft className="w-5 h-5" />
                {viewingSavedRecipe ? 'Kembali ke Jurnal' : 'Ubah Preferensi'}
              </button>

              {!viewingSavedRecipe && (
                <div className="text-sm font-bold text-white bg-[#EE6983] px-4 py-2 rounded-full shadow-lg">
                  Resep {currentRecipeIndex + 1} dari {recipes.recipes.length}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Recipe Details */}
              <div className="lg:col-span-8 space-y-6 animate-fade-in-delay-1">
                {/* Title Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-[#FFE8F0] relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <h1 className="text-3xl lg:text-5xl font-black text-[#B13455] leading-tight flex-1 pr-4">
                      {currentRecipe.name}
                    </h1>

                    {!viewingSavedRecipe && (
                      <button
                        onClick={() => !isSaved && handleSaveRecipe(currentRecipe)}
                        disabled={!!isSaved}
                        className={`p-3 rounded-full transition-all transform hover:scale-110 shadow-md ${isSaved
                          ? 'bg-[#FFE8F0] text-[#EE6983] cursor-default'
                          : 'bg-[#EE6983] text-white hover:bg-[#D64D6B]'
                          }`}
                        title={isSaved ? "Sudah tersimpan" : "Simpan ke Jurnal"}
                      >
                        {isSaved ? <CheckCircle2 className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
                      </button>
                    )}
                  </div>

                  <p className="text-gray-600 text-lg leading-relaxed mb-8 font-medium">{currentRecipe.description}</p>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 bg-[#FFF5E4] px-5 py-3 rounded-2xl transform hover:scale-105 transition-transform">
                      <Users className="w-6 h-6 text-[#EE6983]" />
                      <span className="text-[#B13455] font-bold text-lg">{currentRecipe.servings} Porsi</span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FFF5E4] px-5 py-3 rounded-2xl transform hover:scale-105 transition-transform">
                      <Clock className="w-6 h-6 text-[#EE6983]" />
                      <span className="text-[#B13455] font-bold text-lg">
                        {currentRecipe.prepTime} mnt
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FFF5E4] px-5 py-3 rounded-2xl transform hover:scale-105 transition-transform">
                      <ChefHat className="w-6 h-6 text-[#EE6983]" />
                      <span className="text-[#B13455] font-bold text-lg">
                        {currentRecipe.cookTime} mnt
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ingredients & Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ingredients */}
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-[#FFE8F0] h-full">
                    <h2 className="text-2xl font-black text-[#EE6983] mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FFE8F0] flex items-center justify-center">
                        <span className="text-lg">🥕</span>
                      </div>
                      Bahan-bahan
                    </h2>
                    <ul className="space-y-4">
                      {currentRecipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start justify-between pb-4 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 p-2 rounded-xl transition-colors">
                          <div>
                            <span className="font-bold text-gray-700 text-lg">{ing.item}</span>
                            {ing.nutrition && (
                              <p className="text-xs text-[#EE6983] mt-1 font-bold bg-[#FFE8F0] px-2 py-0.5 rounded-md inline-block">{ing.nutrition}</p>
                            )}
                          </div>
                          <span className="font-bold text-[#B13455] bg-[#FFF5E4] px-3 py-1 rounded-xl text-base whitespace-nowrap ml-2">
                            {ing.amount} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-[#FFE8F0] h-full">
                    <h2 className="text-2xl font-black text-[#EE6983] mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FFE8F0] flex items-center justify-center">
                        <span className="text-lg">🍳</span>
                      </div>
                      Cara Membuat
                    </h2>
                    <div className="space-y-6">
                      {currentRecipe.instructions.map((step, idx) => (
                        <div key={idx} className="flex gap-4 group">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-[#EE6983] text-white flex items-center justify-center text-sm font-bold mt-1 shadow-md group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </div>
                          <p className="text-gray-600 text-base leading-relaxed font-medium">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Benefits & Tips */}
              <div className="lg:col-span-4 space-y-6 animate-fade-in-delay-2">
                {/* Nutrition Benefits */}
                <div className="bg-[#EE6983] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

                  <h2 className="text-2xl font-black mb-6 flex items-center gap-3 relative z-10">
                    <Sparkles className="w-6 h-6" />
                    Manfaat Nutrisi
                  </h2>
                  <ul className="space-y-4 relative z-10">
                    {currentRecipe.nutritionBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex gap-3 items-start bg-white/10 p-4 rounded-2xl backdrop-blur-sm hover:bg-white/20 transition-colors">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="text-base font-bold">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tips */}
                <div className="bg-[#FFF5E4] rounded-[2.5rem] p-8 border-2 border-[#FFE8F0] shadow-lg hover:shadow-xl transition-all duration-300">
                  <h2 className="text-2xl font-black text-[#B13455] mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                      💡
                    </div>
                    Tips Koki
                  </h2>
                  <p className="text-[#B13455] text-lg leading-relaxed italic font-medium">
                    "{currentRecipe.tips}"
                  </p>
                </div>

                {/* Navigation Buttons */}
                {!viewingSavedRecipe && (
                  <div className="flex flex-col gap-4 pt-4">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCurrentRecipeIndex(Math.max(0, currentRecipeIndex - 1))}
                        disabled={currentRecipeIndex === 0}
                        className="flex-1 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-[#B13455] border-2 border-[#B13455] hover:bg-[#FFF5E4] hover:-translate-y-1 shadow-md"
                      >
                        Sebelumnya
                      </button>
                      <button
                        onClick={() => setCurrentRecipeIndex(Math.min(recipes.recipes.length - 1, currentRecipeIndex + 1))}
                        disabled={currentRecipeIndex === recipes.recipes.length - 1}
                        className="flex-1 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#B13455] text-white hover:bg-[#9A2D49] hover:-translate-y-1 shadow-lg"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Styles */}
        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delay-1 {
            0% { opacity: 0; transform: translateY(20px); }
            20% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delay-2 {
            0% { opacity: 0; transform: translateY(20px); }
            40% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
          .animate-fade-in-delay-1 { animation: fade-in-delay-1 0.8s ease-out forwards; }
          .animate-fade-in-delay-2 { animation: fade-in-delay-2 0.8s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  // Questions View
  return (
    <div className="min-h-screen lg:bg-white pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
      <HomepageNavbar />

      <section className="px-4 lg:px-8 py-8 lg:py-12 min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>

        <div className="max-w-2xl w-full relative z-10">
          <div className="mb-10 animate-fade-in">
            <div className="flex justify-between items-end mb-3">
              <span className="text-white font-bold text-xl">
                Langkah {currentQuestion + 1}
              </span>
              <span className="text-white/80 font-medium text-sm">
                dari {questions.length} Pertanyaan
              </span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden backdrop-blur-sm">
              <div
                className="h-full transition-all duration-500 ease-out bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02] animate-fade-in-delay-1 relative">
            <div className="absolute -top-8 left-10 w-16 h-16 bg-[#B13455] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl transform rotate-6 border-4 border-[#EE6983]">
              {currentQuestion + 1}
            </div>

            <h2 className="text-3xl lg:text-4xl font-black text-[#B13455] mt-6 mb-8 leading-tight">
              {questions[currentQuestion].question}
            </h2>

            <textarea
              value={answers[questions[currentQuestion].id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder={questions[currentQuestion].placeholder}
              className="w-full p-6 rounded-3xl border-2 border-[#FFE8F0] focus:border-[#EE6983] focus:ring-4 focus:ring-[#FFE8F0] outline-none transition-all resize-none text-gray-700 placeholder-gray-400 bg-[#FAFAFA] text-lg shadow-inner"
              style={{ minHeight: '150px' }}
            />

            {questions[currentQuestion].suggestions && (
              <div className="mt-6 flex flex-wrap gap-3">
                {questions[currentQuestion].suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border-2 border-[#FFE8F0] hover:border-[#EE6983] hover:bg-[#EE6983] hover:text-white text-gray-500 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-4 justify-between mt-12 pt-8 border-t border-gray-100">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 text-lg ${currentQuestion === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'text-gray-500 hover:text-[#B13455] hover:bg-[#FFF5E4]'
                  }`}
              >
                <ChevronLeft className="w-6 h-6" />
                Kembali
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={handleGenerateRecipes}
                  className="px-10 py-4 rounded-2xl font-bold transition-all text-white bg-[#EE6983] hover:bg-[#D64D6B] hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 text-lg shadow-lg"
                >
                  Buat Resep Sekarang
                  <Sparkles className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-10 py-4 rounded-2xl font-bold transition-all text-white bg-[#B13455] hover:bg-[#9A2D49] hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 text-lg shadow-lg"
                >
                  Lanjut
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-delay-1 {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-fade-in-delay-1 { animation: fade-in-delay-1 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
