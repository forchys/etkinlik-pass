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
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    fetchSurveyData();
  }, []);

  const fetchSurveyData = async () => {
    setLoading(true);
    try {
      // 1. Aktif anketi çek
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (surveyError) throw surveyError;

      if (surveyData) {
        setSurvey(surveyData);

        // --- LOCAL STORAGE YÖNETİMİ ---
        const localVoteKey = `flick_survey_voted_${surveyData.id}`;
        const versionKey = `flick_survey_v_check_${surveyData.id}`;
        const savedVersion = localStorage.getItem(versionKey);

        if (surveyData.version && (!savedVersion || parseInt(savedVersion) < surveyData.version)) {
          localStorage.removeItem(localVoteKey);
          localStorage.setItem(versionKey, surveyData.version.toString());
          setVotedOptionId(null);
        } else {
          const savedVote = localStorage.getItem(localVoteKey);
          if (savedVote) setVotedOptionId(savedVote);
        }

        // 2. Anket seçeneklerini çek
        const { data: optionsData, error: optionsError } = await supabase
          .from('survey_options')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('created_at', { ascending: true });

        if (optionsError) throw optionsError;

        if (optionsData) {
          setOptions(optionsData);
          const votes = optionsData.reduce((sum, opt) => sum + (opt.votes || 0), 0);
          setTotalVotes(votes);
        }
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string, currentVotes: number) => {
    if (votedOptionId || !survey) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('survey_options')
        .update({ votes: (currentVotes || 0) + 1 })
        .eq('id', optionId);

      if (!error) {
        localStorage.setItem(`flick_survey_voted_${survey.id}`, optionId);
        setVotedOptionId(optionId);
        await fetchSurveyData();
      }
    } catch (error) {
      console.error("Oy hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // KRİTİK: Görsel URL'sini oluşturan ana fonksiyon
  const getImageUrl = (path: string) => {
    if (!path) return '';
    // Eğer path zaten tam bir URL ise (http ile başlıyorsa) direkt döndür
    if (path.startsWith('http')) return path;
    
    // Supabase URL'sini ve bucket adını birleştir
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucketName = 'survey-images'; // Buranın Supabase'deki bucket adıyla aynı olduğundan emin ol
    
    // Baştaki eğik çizgileri temizle
    const cleanPath = path.replace(/^\/+/, '');
    
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
  };

  if (loading && !survey) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Aktif Anket Yok</h2>
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest">
          <ArrowLeft size={16} /> Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 text-slate-400 hover:text-white transition-all group mb-12">
          <div className="bg-white/5 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="uppercase text-[10px] font-black tracking-[0.3em]">Ana Menüye Dön</span>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">{survey.title}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((option) => {
            const isWinner = votedOptionId && option.votes === Math.max(...options.map(o => o.votes));
            const isSelected = votedOptionId === option.id;
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id, option.votes)}
                disabled={!!votedOptionId || loading}
                className={`relative group overflow-hidden rounded-3xl border-2 transition-all duration-500 text-left ${
                  isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-slate-900'
                }`}
              >
                {option.image_url && (
                  <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                    <img 
                      src={getImageUrl(option.image_url)} 
                      alt={option.option_text} 
                      className="w-full h-full object-cover opacity-80"
                      onError={(e) => {
                        // Görsel yüklenemezse çalışacak hata yönetimi
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Görsel+Bulunamadı";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent"></div>
                  </div>
                )}

                <div className={`p-6 relative z-10 ${option.image_url ? '-mt-16' : ''}`}>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xl font-black uppercase">{option.option_text}</h3>
                    {votedOptionId && <span className="text-2xl font-mono">%{percentage}</span>}
                  </div>
                  {votedOptionId && (
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${isWinner ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
