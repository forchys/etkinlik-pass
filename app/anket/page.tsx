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
    const savedVote = localStorage.getItem('flick_survey_voted');
    if (savedVote) setVotedOptionId(savedVote);
  }, []);

  const fetchSurveyData = async () => {
    setLoading(true);
    try {
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .single();

      if (surveyData) {
        setSurvey(surveyData);
        const { data: optionsData } = await supabase
          .from('survey_options')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('created_at', { ascending: true });

        if (optionsData) {
          setOptions(optionsData);
          const votes = optionsData.reduce((sum, opt) => sum + opt.votes, 0);
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
    if (votedOptionId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('survey_options')
        .update({ votes: currentVotes + 1 })
        .eq('id', optionId);

      if (!error) {
        localStorage.setItem('flick_survey_voted', optionId);
        setVotedOptionId(optionId);
        await fetchSurveyData();
      }
    } catch (error) {
      console.error("Oy hatası:", error);
    } finally {
      setLoading(false);
    }
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
        {/* YENİLENEN ANA MENÜYE GERİ DÖN BUTONU */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-3 text-slate-400 hover:text-white transition-all group mb-12"
        >
          <div className="bg-white/5 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="uppercase text-[10px] font-black tracking-[0.3em]">Ana Menüye Dön</span>
        </Link>

        <div className="text-center mb-12">
          <span className="text-blue-500 font-bold text-[10px] tracking-[0.3em] uppercase mb-4 block">Topluluk Anketi</span>
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
                  isSelected ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' : votedOptionId ? 'border-white/5 bg-slate-900/50 opacity-80' : 'border-white/10 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-800 hover:-translate-y-1'
                }`}
              >
                {option.image_url && (
                  <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                    <Image src={option.image_url} alt={option.option_text} fill className="object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent"></div>
                  </div>
                )}

                <div className={`p-6 relative z-10 ${option.image_url ? '-mt-16' : ''}`}>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className={`text-xl font-black uppercase tracking-wide ${isSelected ? 'text-blue-400' : 'text-white'}`}>{option.option_text}</h3>
                    {votedOptionId && <span className="text-2xl font-mono font-black text-slate-400">%{percentage}</span>}
                  </div>
                  {votedOptionId && (
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-4">
                      <div className={`h-full transition-all duration-1000 ${isWinner ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1"><CheckCircle2 size={24} /></div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {votedOptionId && (
          <div className="mt-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Toplam {totalVotes} Oy Kullanıldı</div>
        )}
      </div>
    </main>
  );
}
