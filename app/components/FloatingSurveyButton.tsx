// app/components/FloatingSurveyButton.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Sayfa yolunu kontrol etmek için
import { Sparkles } from 'lucide-react';

export default function FloatingSurveyButton() {
  const pathname = usePathname();

  // Eğer kullanıcı anket sayfasındaysa butonu hiç gösterme (gizle)
  if (pathname === '/anket') {
    return null;
  }

  return (
    <Link 
      href="/anket" 
      className="fixed bottom-8 right-8 z-[9999] group cursor-pointer"
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"></div>
        
        <button className="relative bg-slate-950 border-2 border-blue-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:border-blue-400 hover:scale-105 active:scale-95 transition-all duration-300">
          <Sparkles size={20} className="text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-sm font-black uppercase tracking-[0.15em] whitespace-nowrap">
            Sen seç!
          </span>
          <div className="absolute top-0 right-0 w-8 h-full bg-white/5 skew-x-12 -translate-x-12 group-hover:translate-x-12 transition-transform duration-1000"></div>
        </button>
      </div>
    </Link>
  );
}
