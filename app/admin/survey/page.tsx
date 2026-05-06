"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  MousePointer2
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

  // --- HATA ALDIĞIN HESAPLAMA KISMI (DÜZELTİLDİ) ---
  // options? kontrolü ile dizinin varlığından emin oluyoruz
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
      setActionLoading(false);
      return;
    }

    const nextStatus = !survey.is_active;
    const { error } = await supabase
      .from('surveys')
      .update({ is_active: nextStatus })
      .eq('id', survey.id);

    if (!error) setSurvey({ ...survey, is_active: nextStatus });
    setActionLoading(false);
  };

  const saveNewOptions = async () => {
    if (!survey) return alert("Önce anket başlatmalısın!");
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
    if(!confirm("Silmek istediğine emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-6 lg:p-10 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* ÜST DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] flex items-center gap-6">
            <div className="bg-indigo-600/20 p-4 rounded-2xl border border-indigo-500/20 text-indigo-500">
              <LayoutDashboard size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Kontrol Paneli</h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase italic">{survey ? 'Anket Aktif' : 'Veri Bekleniyor'}</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            disabled={actionLoading}
            className={`flex flex-col items-center justify-center gap-2 rounded-[2rem] border transition-all duration-300 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Power size={24} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {survey?.is_active ? 'SİSTEM AÇIK' : 'SİSTEM KAPALI'}
            </span>
          </button>
        </div>

        {/* MASAÜSTÜ İÇİN YAN YANA PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SEÇENEK EKLEME (4 Kolon) */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-indigo-400 text-[11px] font-black uppercase tracking-widest">Seçenek Girişi</h2>
              <button onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2">
                  <input 
                    placeholder="Başlık..."
                    value={input.text}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent border-b border-white/5 py-1 outline-none text-sm font-bold text-white focus:border-indigo-500 transition-all"
                  />
                  <input 
                    placeholder="Görsel URL..."
                    value={input.imageUrl}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent text-[9px] outline-none opacity-40 italic"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={saveNewOptions}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-900/20"
            >
              Şıkları Kaydet
            </button>
          </section>

          {/* SONUÇLAR (8 Kolon) */}
          <section className="lg:col-span-8 bg-slate-900/20 border border-white/5 rounded-[2.5rem] p-8 min-h-[500px]">
             <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-indigo-500" size={20} />
                  <h2 className="text-sm font-black text-white uppercase italic">Canlı Oylama Sonuçları</h2>
                </div>
                <div className="bg-slate-800/50 px-4 py-1.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter">Toplam: {totalVotes} OY</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt) => {
                  const percent = calculatePercentage(opt.votes);
                  return (
                    <div key={opt.id} className="bg-slate-950 p-4 rounded-2xl border border-white/5 group relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-700" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-white truncate w-24">{opt.option_text}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-indigo-500">%{percent}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{opt.votes} Oy</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteOption(opt.id)} className="text-slate-800 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-3 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
             </div>

             {options.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[300px] text-slate-700">
                  <MousePointer2 size={32} className="mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Veri Girişi Bekleniyor...</p>
               </div>
             )}
          </section>

        </div>
      </div>
    </main>
  );
}
