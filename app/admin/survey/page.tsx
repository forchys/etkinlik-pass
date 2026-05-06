"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  MousePointer2, Save
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
      <p className="text-indigo-500 font-black text-[10px] tracking-widest uppercase">Yükleniyor...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-6 lg:p-12 font-sans overflow-hidden">
      {/* YENİLİK BURADA: max-w-[1400px] değeri masaüstü genişlemesi için max-w-[1600px] yapıldı */}
      <div className="max-w-[1600px] mx-auto space-y-8 lg:space-y-12">
        
        {/* ÜST DASHBOARD */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
          <div className="flex-1 bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
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
            className={`w-full lg:w-[300px] flex flex-col items-center justify-center gap-3 p-6 rounded-[2.5rem] border transition-all duration-500 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)] hover:bg-emerald-500/20' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_40px_-10px_rgba(244,63,94,0.2)] hover:bg-rose-500/20'
            }`}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={28} /> : <Power size={32} />}
            <span className="text-[11px] font-black tracking-widest uppercase text-center">
              {survey?.is_active ? 'SİSTEM ÇALIŞIYOR' : 'SİSTEM DURDURULDU'}
            </span>
          </button>
        </div>

        {/* ANA İÇERİK YAPISI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start relative">
          
          {/* SEÇENEK EKLEME (4 Kolon) */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 space-y-6 backdrop-blur-sm lg:sticky lg:top-8 h-fit">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-indigo-400 text-xs font-black uppercase tracking-widest">Seçenekleri Hazırla</h2>
              <button 
                onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} 
                className="bg-indigo-600/20 hover:bg-indigo-600 p-2 rounded-xl text-indigo-400 hover:text-white transition-all"
                title="Yeni Şık Ekle"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[450px] lg:max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950/80 p-5 rounded-[1.5rem] border border-white/5 space-y-3 transition-all focus-within:border-indigo-500/50 group">
                  <input 
                    placeholder={`${idx + 1}. Şık Başlığı...`}
                    value={input.text}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent border-b border-white/5 py-2 outline-none text-sm font-bold text-white focus:border-indigo-500 transition-all placeholder:text-slate-600"
                  />
                  <div className="flex items-center gap-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <ImageIcon size={14} className="text-indigo-400" />
                    <input 
                      placeholder="Görsel URL (İsteğe bağlı)..."
                      value={input.imageUrl}
                      onChange={(e) => {
                        const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n);
                      }}
                      className="w-full bg-transparent text-[11px] outline-none italic placeholder:text-slate-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={saveNewOptions}
              disabled={actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-[2rem] uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
              Sisteme Kaydet
            </button>
          </section>

          {/* CANLI SONUÇLAR (8 Kolon) */}
          <section className="lg:col-span-8 bg-slate-900/20 border border-white/5 rounded-[3.5rem] p-8 lg:p-10 min-h-[600px]">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 border-b border-white/5 pb-6 gap-4">
                <div className="flex items-center gap-4">
                  <BarChart3 className="text-indigo-500" size={28} />
                  <h2 className="text-xl lg:text-2xl font-black text-white uppercase italic">Canlı İstatistik Merkezi</h2>
                </div>
                <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-white/5 shadow-inner self-start sm:self-auto flex items-center">
                  <span className="text-[10px] lg:text-xs font-black text-indigo-400 uppercase tracking-tighter mr-3">Toplam Katılım:</span>
                  <span className="text-lg lg:text-xl font-black text-white">{totalVotes}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                {options.map((opt) => {
                  const percent = calculatePercentage(opt.votes);
                  return (
                    <div key={opt.id} className="relative bg-slate-950 p-6 rounded-[2rem] border border-white/5 group hover:border-indigo-500/30 transition-all overflow-hidden flex flex-col justify-between">
                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-500/50 transition-colors">
                            {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" alt="Seçenek görseli" /> : <ImageIcon size={28} className="text-slate-700" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm lg:text-base font-black uppercase text-white mb-2 truncate" title={opt.option_text}>{opt.option_text}</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl lg:text-3xl font-black text-indigo-500">%{percent}</span>
                              <span className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-tighter">{opt.votes} OY</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteOption(opt.id)} className="text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 transition-all p-2 rounded-xl shrink-0" title="Seçeneği Sil">
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="mt-8 w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
             </div>

             {options.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[300px] lg:h-[400px] text-slate-700 bg-slate-900/10 rounded-[2rem] border border-dashed border-white/5 mt-4">
                  <MousePointer2 size={48} strokeWidth={1} className="mb-4 animate-bounce opacity-20" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] italic opacity-30">Veri Girişi Bekleniyor...</p>
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
