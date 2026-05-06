"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  AlertCircle, MousePointer2
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
      const { data: surveyData, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // .single() yerine .maybeSingle() hatayı önler

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

  // --- AKTİFLİK TUŞU: BOŞ TABLO DESTEĞİ ---
  const toggleSurveyStatus = async () => {
    setActionLoading(true);
    
    // Eğer hiç anket yoksa yeni bir tane oluştur
    if (!survey) {
      const { data, error } = await supabase
        .from('surveys')
        .insert([{ title: 'Yeni Anket', is_active: true }])
        .select()
        .single();
      
      if (!error) setSurvey(data);
      setActionLoading(false);
      return;
    }

    // Varsa durumunu değiştir
    const nextStatus = !survey.is_active;
    const { error } = await supabase
      .from('surveys')
      .update({ is_active: nextStatus })
      .eq('id', survey.id);

    if (!error) setSurvey({ ...survey, is_active: nextStatus });
    setActionLoading(false);
  };

  const saveNewOptions = async () => {
    if (!survey) return alert("Önce sistemi aktif ederek bir anket oluşturmalısınız!");
    
    const toInsert = dynamicInputs
      .filter(opt => opt.text.trim() !== "")
      .map(opt => ({
        survey_id: survey.id,
        option_text: opt.text,
        image_url: opt.imageUrl,
        votes: 0
      }));

    const { error } = await supabase.from('survey_options').insert(toInsert);
    if (!error) {
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      fetchAdminData();
    }
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Silinsin mi?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-8 lg:p-12 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* ÜST DASHBOARD PANELİ */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 mb-10">
          <div className="flex-1 bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
            <div className="bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/20">
              <LayoutDashboard className="text-indigo-500" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight italic">Panel <span className="text-indigo-500 not-italic">Merkezi</span></h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">Flick Survey Management</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            disabled={actionLoading}
            className={`lg:w-72 flex flex-col items-center justify-center gap-2 p-6 rounded-[2.5rem] border transition-all duration-500 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_30px_-10px_rgba(244,63,94,0.3)]'
            }`}
          >
            {actionLoading ? <Loader2 className="animate-spin" /> : <Power size={28} />}
            <span className="text-[10px] font-black tracking-widest uppercase">
              {!survey ? 'SİSTEMİ BAŞLAT' : (survey.is_active ? 'ANKET YAYINDA' : 'ANKET DURDURULDU')}
            </span>
          </button>
        </div>

        {/* ANA GRID SİSTEMİ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SOL: VERİ GİRİŞ ALANI (4 Kolon) */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-indigo-400 text-xs font-black uppercase tracking-widest">Seçenek Ekle</h2>
              <button onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} className="bg-indigo-600 p-2 rounded-xl text-white">
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950/80 p-5 rounded-[1.5rem] border border-white/5 space-y-3 transition-all focus-within:border-indigo-500/50">
                  <input 
                    placeholder="Seçenek Metni..."
                    value={input.text}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent border-b border-white/5 py-2 outline-none text-sm font-bold text-white"
                  />
                  <div className="flex items-center gap-2 opacity-50">
                    <ImageIcon size={14} />
                    <input 
                      placeholder="Görsel Linki..."
                      value={input.imageUrl}
                      onChange={(e) => {
                        const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n);
                      }}
                      className="w-full bg-transparent text-[10px] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={saveNewOptions}
              className="w-full bg-white text-slate-950 font-black py-5 rounded-[2rem] uppercase text-[11px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-2xl"
            >
              Şıkları Sisteme İşle
            </button>
          </section>

          {/* SAĞ: CANLI SONUÇLAR (8 Kolon) */}
          <section className="lg:col-span-8 bg-slate-900/20 border border-white/5 rounded-[3.5rem] p-10 min-h-[600px]">
             <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-indigo-500" size={24} />
                  <h2 className="text-xl font-black text-white uppercase italic">Canlı İstatistikler</h2>
                </div>
                <div className="flex gap-4">
                  <div className="bg-slate-800/50 px-5 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Toplam:</span>
                    <span className="text-sm font-black text-white">{totalVotes} OY</span>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {options.map((opt) => {
                  const percent = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
                  return (
                    <div key={opt.id} className="relative bg-slate-950 p-6 rounded-[2rem] border border-white/5 group hover:scale-[1.02] transition-all overflow-hidden">
                      {/* Görsel Arka Plan Efekti */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 blur-[50px] -z-0" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                            {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-700" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-white mb-1">{opt.option_text}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-indigo-500">%{percent}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{opt.votes} Kişi</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteOption(opt.id)} className="text-slate-700 hover:text-rose-500 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-6 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
             </div>

             {options.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[400px] text-slate-700">
                  <MousePointer2 size={48} strokeWidth={1} className="mb-4 animate-bounce" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] italic">Henüz veri girişi yapılmadı</p>
               </div>
             )}
          </section>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 10px; }
      `}</style>
    </main>
  );
}
