// app/components/FloatingSurveyButton.tsx
"use client";

import Link from 'next/link';
import { Sparkles } from 'lucide-react'; // Daha "seçim" odaklı bir ikon seçtim

export default function FloatingSurveyButton() {
  return (
    <Link 
      href="/anket" 
      className="fixed bottom-8 right-8 z-[9999] group cursor-pointer"
    >
      <div className="relative flex items-center justify-center">
        
        {/* 1. KATMAN: DIŞ PARLAMA (GLOW) EFEKTİ */}
        {/* Butonun dikdörtgen yapısına uygun şekilde yayılım sağlar */}
        <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"></div>
        
        {/* 2. KATMAN: ANA BUTON GÖVDESİ */}
        {/* 'flex items-center gap-3': İkon ve metni yan yana, aralarında boşlukla dizer */}
        {/* 'px-6 py-4': Butonu yanlara doğru genişleterek yatay bir form verir */}
        <button className="relative bg-slate-950 border-2 border-blue-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:border-blue-400 hover:scale-105 active:scale-95 transition-all duration-300">
          
          {/* İkon */}
          <Sparkles 
            size={20} 
            className="text-blue-400 group-hover:rotate-12 transition-transform duration-300" 
          />

          {/* Metin */}
          <span className="text-sm font-black uppercase tracking-[0.15em] whitespace-nowrap">
            Sen seç!
          </span>

          {/* Süsleme: Sağ tarafta küçük bir parıltı efekti */}
          <div className="absolute top-0 right-0 w-8 h-full bg-white/5 skew-x-12 -translate-x-12 group-hover:translate-x-12 transition-transform duration-1000"></div>
        </button>

      </div>
    </Link>
  );
}
