'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ChevronRight, Clock, Users } from 'lucide-react';
import { auth } from '@/lib/firebase';
import HomepageNavbar from '@/app/components/homepage-navbar';

interface RecipeQuestion {
  id: string;
  question: string;
  placeholder: string;
  type: 'text' | 'textarea';
}

interface Recipe {
  name: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  description: string;
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
    nutrition: string;
  }>;
  instructions: string[];
  nutritionBenefits: string[];
  tips: string;
}

interface RecipeResponse {
  recipes: Recipe[];
  summary: string;
  warnings: string;
}

const questions: RecipeQuestion[] = [
  {
    id: 'allergies',
    question: 'Apakah Mooma memiliki alergi makanan?',
    placeholder: 'Tulis alergi makanan yang Mooma miliki (contoh: kacang, telur, seafood)',
    type: 'textarea',
  },
  {
    id: 'preferences',
    question: 'Makanan apa yang Mooma sukai?',
    placeholder: 'Tulis makanan favorit atau jenis masakan yang Mooma sukai',
    type: 'textarea',
  },
  {
    id: 'bodyCondition',
    question: 'Bagaimana kondisi tubuh Mooma saat ini?',
    placeholder: 'Contoh: mual, pusing, lelah, atau kondisi lainnya',
    type: 'textarea',
  },
  {
    id: 'nutritionNeeds',
    question: 'Apa kebutuhan nutrisi khusus Mooma?',
    placeholder: 'Contoh: kaya zat besi, tinggi protein, kaya kalsium, atau kebutuhan lainnya',
    type: 'textarea',
  },
  {
    id: 'dietaryRestrictions',
    question: 'Apakah ada pantangan makanan lainnya?',
    placeholder: 'Tulis pantangan makanan atau batasan diet lainnya',
    type: 'textarea',
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

  // Check authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/pages/login');
        return;
      }
      setIsAuthenticated(true);
    });

    return () => unsubscribe();
  }, [router]);

  const handleAnswerChange = (value: string) => {
    const questionId = questions[currentQuestion].id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const data = await response.json();
      setRecipes(data.data);
      setShowRecipes(true);
      setCurrentRecipeIndex(0);
    } catch (error) {
      console.error('Error generating recipes:', error);
      alert('Gagal membuat resep. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#EE6983]" />
          <p className="text-[#B13455] font-semibold">Memverifikasi akun Anda...</p>
        </div>
      </div>
    );
  }

  if (!showQuestions && !showRecipes) {
    return (
      <div className="min-h-screen pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
        <HomepageNavbar />

        {/* Start Screen */}
        <section
          className="px-4 lg:px-8 py-12 lg:py-20 min-h-[80vh] flex items-center justify-center"
          style={{ backgroundColor: '#EE6983' }}
        >
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Buat Resep Sehat
            </h1>
            <p className="text-lg lg:text-xl text-white mb-8 opacity-90">
              Dapatkan resep yang dipersonalisasi khusus untuk kesehatan Mooma dan bayi. Kami akan mengajukan beberapa pertanyaan tentang kesehatan, alergi, dan preferensi Mooma.
            </p>

            <div className="bg-white rounded-3xl p-8 mb-8">
              <h2 className="text-2xl font-black text-[#EE6983] mb-6">Apa yang akan kami tanyakan?</h2>
              <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#EE6983' }}
                  >
                    1
                  </div>
                  <div>
                    <p className="font-bold text-[#B13455]">Alergi Makanan</p>
                    <p className="text-sm text-gray-600">Apakah Mooma memiliki alergi makanan?</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#EE6983' }}
                  >
                    2
                  </div>
                  <div>
                    <p className="font-bold text-[#B13455]">Preferensi Makanan</p>
                    <p className="text-sm text-gray-600">Makanan apa yang Mooma sukai?</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#EE6983' }}
                  >
                    3
                  </div>
                  <div>
                    <p className="font-bold text-[#B13455]">Kondisi Tubuh</p>
                    <p className="text-sm text-gray-600">Bagaimana kondisi tubuh Mooma saat ini?</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#EE6983' }}
                  >
                    4
                  </div>
                  <div>
                    <p className="font-bold text-[#B13455]">Kebutuhan Nutrisi</p>
                    <p className="text-sm text-gray-600">Apa kebutuhan nutrisi khusus Mooma?</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#EE6983' }}
                  >
                    5
                  </div>
                  <div>
                    <p className="font-bold text-[#B13455]">Pantangan Makanan</p>
                    <p className="text-sm text-gray-600">Apakah ada pantangan makanan lainnya?</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowQuestions(true)}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105"
              style={{ backgroundColor: '#FFF5E4', color: '#EE6983' }}
            >
              Mulai Membuat Resep
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (showRecipes && recipes) {
    const currentRecipe = recipes.recipes[currentRecipeIndex];

    return (
      <div className="min-h-screen pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
        <HomepageNavbar />

        {/* Recipe Display */}
        <div className="px-4 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Recipe Header */}
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-black text-[#EE6983] mb-4">
                {currentRecipe.name}
              </h1>
              <p className="text-gray-600 text-lg mb-6">{currentRecipe.description}</p>

              {/* Recipe Meta */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#EE6983]" />
                  <span className="text-[#B13455] font-bold">{currentRecipe.servings} porsi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#EE6983]" />
                  <span className="text-[#B13455] font-bold">
                    Prep: {currentRecipe.prepTime} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#EE6983]" />
                  <span className="text-[#B13455] font-bold">
                    Cook: {currentRecipe.cookTime} min
                  </span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-8 rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#FFE8F0' }}>
              <h2 className="text-2xl font-black text-[#EE6983] mb-6">Bahan-bahan</h2>
              <div className="space-y-3">
                {currentRecipe.ingredients.map((ingredient, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-[#FFB3D9]">
                    <div>
                      <p className="text-[#B13455] font-bold">{ingredient.item}</p>
                      <p className="text-xs text-[#EE6983]">{ingredient.nutrition}</p>
                    </div>
                    <p className="text-[#B13455] font-bold whitespace-nowrap ml-4">
                      {ingredient.amount} {ingredient.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-8 rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#FFE8F0' }}>
              <h2 className="text-2xl font-black text-[#EE6983] mb-6">Cara Membuat</h2>
              <div className="space-y-4">
                {currentRecipe.instructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: '#EE6983' }}
                    >
                      {idx + 1}
                    </div>
                    <p className="text-[#B13455] font-semibold pt-1">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nutrition Benefits */}
            <div className="mb-8 rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#EE6983' }}>
              <h2 className="text-2xl font-black text-white mb-6">Manfaat Nutrisi</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentRecipe.nutritionBenefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EE6983' }}></div>
                    </div>
                    <p className="text-white font-semibold">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="mb-8 rounded-3xl p-6 shadow-lg" style={{ backgroundColor: '#FFE8F0' }}>
              <h2 className="text-2xl font-black text-[#EE6983] mb-4">Tips</h2>
              <p className="text-[#B13455] font-semibold">{currentRecipe.tips}</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 justify-between mb-8">
              <button
                onClick={() => setCurrentRecipeIndex(Math.max(0, currentRecipeIndex - 1))}
                disabled={currentRecipeIndex === 0}
                className="px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: currentRecipeIndex === 0 ? '#ccc' : '#EE6983',
                  color: 'white',
                }}
              >
                Resep Sebelumnya
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[#B13455] font-bold">
                  {currentRecipeIndex + 1} / {recipes.recipes.length}
                </span>
              </div>

              <button
                onClick={() =>
                  setCurrentRecipeIndex(
                    Math.min(recipes.recipes.length - 1, currentRecipeIndex + 1)
                  )
                }
                disabled={currentRecipeIndex === recipes.recipes.length - 1}
                className="px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor:
                    currentRecipeIndex === recipes.recipes.length - 1 ? '#ccc' : '#EE6983',
                  color: 'white',
                }}
              >
                Resep Berikutnya
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={() => {
                setShowRecipes(false);
                setShowQuestions(true);
                setCurrentQuestion(0);
              }}
              className="w-full py-3 rounded-2xl font-bold text-white transition-all"
              style={{ backgroundColor: '#B13455' }}
            >
              Kembali ke Pertanyaan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showQuestions) {
    return (
      <div className="min-h-screen pb-32 lg:pb-0" style={{ backgroundColor: '#FFF5E4' }}>
        <HomepageNavbar />

        {/* Question Section */}
        <section
          className="px-4 lg:px-8 py-12 lg:py-16 min-h-[70vh] flex items-center justify-center"
          style={{ backgroundColor: '#EE6983' }}
        >
          <div className="max-w-2xl w-full">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  Pertanyaan {currentQuestion + 1} dari {questions.length}
                </span>
                <span className="text-white font-bold">
                  {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white bg-opacity-30 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                    backgroundColor: '#FFF5E4',
                  }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-3xl lg:text-4xl font-black text-white text-center mb-8">
                {questions[currentQuestion].question}
              </h2>

              {/* Answer Input */}
              <textarea
                value={answers[questions[currentQuestion].id] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={questions[currentQuestion].placeholder}
                className="w-full p-6 rounded-3xl border-none focus:outline-none focus:ring-4 focus:ring-white resize-none"
                style={{ minHeight: '150px', backgroundColor: '#FFF5E4' }}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 text-[#EE6983]"
                style={{ backgroundColor: 'white' }}
              >
                Kembali
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={handleGenerateRecipes}
                  disabled={loading}
                  className="px-8 py-3 rounded-2xl font-bold transition-all text-white flex items-center gap-2"
                  style={{ backgroundColor: '#FFF5E4', color: '#EE6983' }}
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Membuat Resep...
                    </>
                  ) : (
                    <>
                      Buat Resep
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-8 py-3 rounded-2xl font-bold transition-all text-[#EE6983] flex items-center gap-2"
                  style={{ backgroundColor: 'white' }}
                >
                  Lanjut
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }
}
