"use client";

import Link from 'next/link';
import { MessageSquarePlus } from 'lucide-react'; // Anket/Mesaj ikonu

export default function FloatingSurveyButton() {
  return (
    <Link 
      href="/anket" 
      className="fixed bottom-8 right-8 z-[9999] group cursor-pointer"
      aria-label="Ankete Katıl"
    >
      <div className="relative flex items-center justify-center">
        
        {/* 1. KATMAN: DIŞ PARLAMA (GLOW) EFEKTİ */}
        {/* Butonun arkasında mavi bir ışık yayılmasını sağlar. */}
        <div className="absolute inset-0 bg-blue-600 rounded-full blur-xl opacity-20 group-hover:opacity-60 group-hover:scale-125 transition-all duration-500"></div>
        
        {/* 2. KATMAN: ANA BUTON GÖVDESİ */}
        {/* bg-slate-950: Koyu arka plan | border-blue-500/50: Yarı şeffaf mavi çerçeve */}
        <button className="relative bg-slate-950 border-2 border-blue-500/50 text-white p-5 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-blue-500/50 hover:scale-110 active:scale-90 transition-all duration-300">
          <MessageSquarePlus 
            size={30} 
            className="text-blue-400 group-hover:text-white transition-colors duration-300" 
          />
        </button>

        {/* 3. KATMAN: TOOLTIP (İPUCU METNİ) */}
        {/* Fareyle üzerine gelindiğinde sol tarafta "Ankete Katıl" yazısı belirir. */}
        <div className="absolute right-[120%] top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none shadow-2xl">
          <div className="relative whitespace-nowrap">
            Ankete Katıl
            {/* Küçük ok işareti */}
            <div className="absolute top-1/2 -right-5 -translate-y-1/2 border-8 border-transparent border-l-blue-600"></div>
          </div>
        </div>
        
      </div>
    </Link>
  );
}
