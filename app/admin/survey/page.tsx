"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  MousePointer2, Save, Activity
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [dynamicInputs, setDynamicInputs] = useState([
    { text: '', imageUrl: '' },
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
        alert("Anket oluşturulamadı.");
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
      alert("Lütfen en az bir seçenek metni girin.");
      setActionLoading(false);
      return;
    }

    const { error: optError } = await supabase.from('survey_options').insert(toInsert);
    
    if (!optError) {
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      await fetchAdminData(); 
    } else {
      console.error("Kaydetme hatası:", optError);
    }
    setActionLoading(false);
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Bu seçeneği silmek istediğine emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="text-indigo-500 font-black text-[10px] tracking-widest uppercase">Hazırlanıyor...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-6 lg:p-12 font-sans overflow-x-hidden">
      <div className="max-w-[1500px] mx-auto space-y-8">
        
        {/* ÜST DASHBOARD PANELİ */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
          <div className="flex-1 bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl backdrop-blur-md">
            <div className="bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/20 text-indigo-500 shadow-lg shadow-indigo-500/10">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight italic">Panel <span className="text-indigo-500 not-italic">Merkezi</span></h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase mt-1">Flick Admin v2.0</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            disabled={actionLoading}
            className={`w-full lg:w-[350px] flex flex-col items-center justify-center gap-3 p-6 rounded-[2.5rem] border transition-all duration-500 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_40px_-10px_rgba(244,63,94,0.2)]'
            }`}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={28} /> : <Power size={32} />}
            <span className="text-[11px] font-black tracking-widest uppercase">
              {survey?.is_active ? 'SİSTEM ÇEVRİMİÇİ' : 'SİSTEM DURDURULDU'}
            </span>
          </button>
        </div>

        {/* ANA İÇERİK YAPISI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          
          {/* SOL: SEÇENEK YÖNETİMİ (Kompakt Panel) */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 space-y-6 lg:sticky lg:top-8 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-indigo-400 text-xs font-black uppercase tracking-widest">Veri Girişi</h2>
              <button 
                onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} 
                className="bg-indigo-600/20 hover:bg-indigo-600 p-2 rounded-xl text-indigo-400 hover:text-white transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950/80 p-5 rounded-[1.5rem] border border-white/5 space-y-3 focus-within:border-indigo-500/50 transition-all group">
                  <input 
                    placeholder="Seçenek Metni..."
                    value={input.text}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent outline-none text-sm font-bold text-white placeholder:text-slate-700"
                  />
                  <div className="flex items-center gap-2 opacity-30 group-focus-within:opacity-100 transition-opacity">
                    <ImageIcon size={14} className="text-indigo-400" />
                    <input 
                      placeholder="Görsel URL..."
                      value={input.imageUrl}
                      onChange={(e) => {
                        const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n);
                      }}
                      className="w-full bg-transparent text-[11px] outline-none italic"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={saveNewOptions}
              disabled={actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-[2rem] uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Sistemi Güncelle
            </button>
          </section>

          {/* SAĞ: BENTO ANALİZ MERKEZİ */}
          <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* HERO KART: TOPLAM KATILIM (Geniş Yer Kaplayan Modern Kart) */}
            <div className="col-span-full bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden group shadow-2xl">
                <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Canlı Katılım Durumu</h3>
                    <h2 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter">İstatistik <br/> Merkezi</h2>
                </div>
                <div className="relative z-10 bg-white/10 backdrop-blur-xl px-10 py-6 rounded-[2.5rem] border border-white/10 flex items-center gap-6 mt-6 md:mt-0">
                    <Activity className="text-indigo-200" size={40} />
                    <div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Toplam Oy</p>
                        <p className="text-4xl font-black text-white">{totalVotes}</p>
                    </div>
                </div>
                <BarChart3 size={200} className="absolute -bottom-10 -right-10 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>

            {/* SEÇENEK KARTLARI */}
            {options.map((opt) => {
              const percent = calculatePercentage(opt.votes);
              return (
                <div key={opt.id} className="bg-slate-900/30 border border-white/5 p-6 rounded-[2.5rem] hover:bg-slate-900/50 transition-all group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-slate-950 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
                        {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-800" />}
                      </div>
                      <button onClick={() => deleteOption(opt.id)} className="text-slate-700 hover:text-rose-500 transition-colors p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-sm font-black uppercase text-white mb-2 truncate" title={opt.option_text}>{opt.option_text}</p>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-3xl font-black text-indigo-500 italic">%{percent}</span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{opt.votes} OY</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}

            {/* BOŞ DURUM */}
            {options.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-800 border-2 border-dashed border-white/5 rounded-[3rem]">
                <MousePointer2 size={40} className="mb-4 opacity-20 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Veri Bekleniyor...</p>
              </div>
            )}
          </section>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}</style>
    </main>
  );
}
