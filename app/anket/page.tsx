"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AnketPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Kullanıcının oy verdiği şıkkın ID'sini tutar
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);

  // Sayfa yüklendiğinde çalışacak ilk adımlar
  useEffect(() => {
    fetchSurveyData();
    
    // Cihazda daha önce oy verilmiş mi kontrol et
    const savedVote = localStorage.getItem('flick_survey_voted');
    if (savedVote) {
      setVotedOptionId(savedVote);
    }
  }, []);

  // Supabase'den anket verilerini getiren fonksiyon
  const fetchSurveyData = async () => {
    setLoading(true);
    try {
      // 1. Sadece aktif olan (yayındaki) anketi getir
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .single();

      if (surveyData) {
        setSurvey(surveyData);
        
        // 2. Bu ankete ait şıkları getir
        const { data: optionsData } = await supabase
          .from('survey_options')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('created_at', { ascending: true });

        if (optionsData) {
          setOptions(optionsData);
          // Toplam oy sayısını hesapla (Yüzdelik dilimler için gerekli)
          const votes = optionsData.reduce((sum, opt) => sum + opt.votes, 0);
          setTotalVotes(votes);
        }
      }
    } catch (error) {
      console.error("Anket verisi çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Oy verme butonuna tıklandığında çalışacak fonksiyon
  const handleVote = async (optionId: string, currentVotes: number) => {
    // Eğer zaten oy verdiyse işlemi durdur
    if (votedOptionId) return;

    setLoading(true);
    try {
      // Supabase'deki oy sayısını 1 artır
      const { error } = await supabase
        .from('survey_options')
        .update({ votes: currentVotes + 1 })
        .eq('id', optionId);

      if (!error) {
        // İşlem başarılıysa tarayıcıya kaydet
        localStorage.setItem('flick_survey_voted', optionId);
        setVotedOptionId(optionId);
        // Sonuçları güncellemek için verileri tekrar çek
        await fetchSurveyData();
      }
    } catch (error) {
      console.error("Oy kaydedilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Yüklenme ekranı
  if (loading && !survey) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // Aktif anket bulunamadığında gösterilecek ekran
  if (!survey) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Şu An Aktif Anket Yok</h2>
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest">
          <ArrowLeft size={16} /> Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Arka plan süslemeleri */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Üst Menü */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest mb-12">
          <ArrowLeft size={16} /> Geri Dön
        </Link>

        {/* Anket Başlığı */}
        <div className="text-center mb-12">
          <span className="text-blue-500 font-bold text-[10px] tracking-[0.3em] uppercase mb-4 block">Topluluk Anketi</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">{survey.title}</h1>
        </div>

        {/* Şıkların Listelendiği Alan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((option) => {
            const isWinner = votedOptionId && option.votes === Math.max(...options.map(o => o.votes));
            const isSelected = votedOptionId === option.id;
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id, option.votes)}
                disabled={!!votedOptionId || loading} // Oy verildiyse butonları devre dışı bırak
                className={`relative group overflow-hidden rounded-3xl border-2 transition-all duration-500 text-left ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                    : votedOptionId 
                      ? 'border-white/5 bg-slate-900/50 opacity-80' 
                      : 'border-white/10 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-800 hover:-translate-y-1 cursor-pointer'
                }`}
              >
                {/* Görsel Alanı (Eğer veritabanında image_url varsa gösterir) */}
                {option.image_url && (
                  <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                    <Image 
                      src={option.image_url} 
                      alt={option.option_text} 
                      fill 
                      className={`object-cover transition-transform duration-700 ${!votedOptionId && 'group-hover:scale-110'} ${votedOptionId ? 'opacity-40' : 'opacity-80 group-hover:opacity-100'}`}
                    />
                    {/* Görselin altından yukarı doğru kararma efekti (Yazının okunması için) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent"></div>
                  </div>
                )}

                {/* Metin ve Sonuç Alanı */}
                <div className={`p-6 relative z-10 ${option.image_url ? '-mt-16' : ''}`}>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className={`text-xl font-black uppercase tracking-wide ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                      {option.option_text}
                    </h3>
                    {/* Oy verildikten sonra yüzdeleri göster */}
                    {votedOptionId && (
                      <span className={`text-2xl font-mono font-black ${isWinner ? 'text-emerald-400' : 'text-slate-400'}`}>
                        %{percentage}
                      </span>
                    )}
                  </div>

                  {/* Oy Verildikten Sonra Çıkan Yüzdelik İlerleme Çubuğu */}
                  {votedOptionId && (
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-4">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${isWinner ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Seçilen Şıkka Tik İşareti Koyma */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1 shadow-lg shadow-blue-500/30">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

}
