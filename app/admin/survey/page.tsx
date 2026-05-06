"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Image as ImageIcon, Loader2, 
  Power, Save, Hash, Activity
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [dynamicInputs, setDynamicInputs] = useState([
    { text: '', imageUrl: '' }
  ]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (surveyData) {
        setSurvey(surveyData);
        const { data: optionsData } = await supabase
          .from('survey_options')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('votes', { ascending: false });
        setOptions(optionsData || []);
      }
    } catch (e) {
      console.error("Yükleme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = options?.reduce((acc, curr) => acc + (Number(curr.votes) || 0), 0) || 0;

  const calculatePercentage = (votes: number) => {
    if (totalVotes === 0) return "0";
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const toggleSurveyStatus = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    
    if (!survey) {
      const { data, error } = await supabase
        .from('surveys')
        .insert([{ title: 'Yeni Anket', is_active: true }])
        .select()
        .single();
      
      if (!error) setSurvey(data);
    } else {
      const nextStatus = !survey.is_active;
      const { error } = await supabase
        .from('surveys')
        .update({ is_active: nextStatus })
        .eq('id', survey.id);
      if (!error) setSurvey({ ...survey, is_active: nextStatus });
    }
    setActionLoading(false);
  };

  const saveNewOptions = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    let currentSurveyId = survey?.id;

    if (!currentSurveyId) {
      const { data, error } = await supabase
        .from('surveys')
        .insert([{ title: 'Anket', is_active: true }])
        .select()
        .single();
      
      if (error) {
        setActionLoading(false);
        return;
      }
      currentSurveyId = data.id;
      setSurvey(data);
    }

    const toInsert = dynamicInputs
      .filter(opt => opt.text.trim() !== "")
      .map(opt => ({
        survey_id: currentSurveyId,
        option_text: opt.text,
        image_url: opt.imageUrl,
        votes: 0
      }));

    if (toInsert.length === 0) {
      setActionLoading(false);
      return;
    }

    const { error: optError } = await supabase.from('survey_options').insert(toInsert);
    
    if (!optError) {
      setDynamicInputs([{ text: '', imageUrl: '' }]);
      await fetchAdminData(); 
    }
    setActionLoading(false);
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Bu seçeneği silmek istediğine emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 lg:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-4">
        
        {/* KOMPAKT ÜST BAR */}
        <header className="flex items-center justify-between bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-black uppercase tracking-widest text-white italic">Flick <span className="text-indigo-500 not-italic">Admin</span></h1>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <Activity size={14} className="text-indigo-500" />
              Toplam Katılım: <span className="text-white">{totalVotes}</span>
            </div>
          </div>
          
          <button 
            onClick={toggleSurveyStatus}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest transition-all ${
              survey?.is_active 
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10' 
              : 'bg-rose-500/5 border-rose-500/20 text-rose-500 hover:bg-rose-500/10'
            }`}
          >
            {survey?.is_active ? 'SİSTEM AKTİF' : 'SİSTEM DURDURULDU'}
          </button>
        </header>

        {/* YATAY VERİ GİRİŞ SATIRI */}
        <section className="bg-slate-900/30 border border-white/5 p-3 rounded-2xl flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex gap-3">
            <div className="flex-[2] relative">
              <input 
                placeholder="Yeni Seçenek Metni..."
                value={dynamicInputs[0].text}
                onChange={(e) => {
                  const n = [...dynamicInputs]; n[0].text = e.target.value; setDynamicInputs(n);
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-bold"
              />
            </div>
            <div className="flex-1 relative">
              <input 
                placeholder="Görsel URL..."
                value={dynamicInputs[0].imageUrl}
                onChange={(e) => {
                  const n = [...dynamicInputs]; n[0].imageUrl = e.target.value; setDynamicInputs(n);
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>
          <button 
            onClick={saveNewOptions}
            disabled={actionLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Ekle
          </button>
        </section>

        {/* YATAY LİSTE ELEMANLARI */}
        <section className="space-y-2">
          {options.map((opt) => {
            const percent = calculatePercentage(opt.votes);
            return (
              <div key={opt.id} className="group bg-slate-900/20 border border-white/5 hover:border-white/10 p-3 rounded-xl flex items-center gap-4 transition-all">
                {/* Küçük Görsel */}
                <div className="w-12 h-12 bg-slate-950 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                  {opt.image_url ? (
                    <img src={opt.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <ImageIcon size={18} className="text-slate-800" />
                  )}
                </div>

                {/* Metin ve İstatistik Alanı */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <h4 className="text-sm font-bold text-white truncate pr-4">{opt.option_text}</h4>
                    <div className="flex items-center gap-4 shrink-0 font-mono">
                      <span className="text-indigo-400 text-xs font-black">%{percent}</span>
                      <span className="text-slate-600 text-[10px] font-bold uppercase">{opt.votes} OY</span>
                    </div>
                  </div>
                  {/* Yatay İlerleme Çubuğu */}
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-indigo-500/80 group-hover:bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.3)]" 
                      style={{ width: `${percent}%` }} 
                    />
                  </div>
                </div>

                {/* Silme Butonu */}
                <button 
                  onClick={() => deleteOption(opt.id)} 
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-rose-500 transition-all shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          {/* BOŞ DURUM */}
          {options.length === 0 && (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl text-slate-700">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Gösterilecek veri bulunamadı.</p>
            </div>
          )}
        </section>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 10px; }
      `}</style>
    </main>
  );
}
