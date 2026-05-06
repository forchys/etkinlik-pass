"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  MousePointer2, Save, CheckCircle2
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
      console.error("Veri çekme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = options?.reduce((acc, curr) => acc + (Number(curr.votes) || 0), 0) || 0;

  const calculatePercentage = (votes: number) => {
    if (totalVotes === 0) return "0";
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  // --- SİSTEMİ KAYDET FONKSİYONU (YENİLENMİŞ) ---
  const saveNewOptions = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      let currentSurveyId = survey?.id;

      // 1. Eğer anket yoksa önce oluştur
      if (!currentSurveyId) {
        const { data: newSurvey, error: sError } = await supabase
          .from('surveys')
          .insert([{ title: 'Aktif Anket', is_active: true }])
          .select()
          .single();
        
        if (sError) throw sError;
        currentSurveyId = newSurvey.id;
        setSurvey(newSurvey);
      }

      // 2. Şıkları filtrele ve hazırla
      const toInsert = dynamicInputs
        .filter(opt => opt.text.trim() !== "")
        .map(opt => ({
          survey_id: currentSurveyId,
          option_text: opt.text,
          image_url: opt.imageUrl,
          votes: 0
        }));

      if (toInsert.length === 0) {
        alert("Lütfen en az bir şık metni girin.");
        setActionLoading(false);
        return;
      }

      // 3. Veritabanına şıkları ekle
      const { error: optError } = await supabase.from('survey_options').insert(toInsert);
      if (optError) throw optError;

      // 4. Başarılıysa temizle ve listeyi tazele
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      await fetchAdminData();
      alert("Başarıyla kaydedildi!");

    } catch (error: any) {
      console.error("Hata:", error.message);
      alert("Bir hata oluştu. Supabase RLS ayarlarını kontrol edin.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSurveyStatus = async () => {
    if (!survey || actionLoading) return;
    setActionLoading(true);
    const nextStatus = !survey.is_active;
    const { error } = await supabase.from('surveys').update({ is_active: nextStatus }).eq('id', survey.id);
    if (!error) setSurvey({ ...survey, is_active: nextStatus });
    setActionLoading(false);
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Bu şık silinecek, emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ÜST PANEL: RESPONSIVE DÜZEN */}
        <header className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
            <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-500">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Admin Kontrol</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Anket Yönetim Sistemi</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            className={`md:w-64 flex items-center justify-between px-6 py-4 rounded-3xl border transition-all duration-500 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/5' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/5'
            }`}
          >
            <div className="text-left">
              <p className="text-[9px] font-black uppercase opacity-60">Durum</p>
              <p className="text-xs font-black">{survey?.is_active ? 'AKTİF' : 'KAPALI'}</p>
            </div>
            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Power size={20} />}
          </button>
        </header>

        {/* ANA İÇERİK: MOBİLDE TEK, MASAÜSTÜNDE ÇİFT KOLON */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SEÇENEK EKLEME (SOL PANEL - 4 KOLON) */}
          <section className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-blue-400 text-[11px] font-black uppercase tracking-widest">Şık Ekle</h2>
                <button 
                  onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])}
                  className="bg-blue-600/20 hover:bg-blue-600 p-2 rounded-xl text-blue-400 hover:text-white transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {dynamicInputs.map((input, idx) => (
                  <div key={idx} className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-2 focus-within:border-blue-500/40 transition-all">
                    <input 
                      placeholder="Şık metni..."
                      value={input.text}
                      onChange={(e) => {
                        const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                      }}
                      className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-700"
                    />
                    <div className="flex items-center gap-2 opacity-30 focus-within:opacity-100 transition-opacity">
                      <ImageIcon size={12} />
                      <input 
                        placeholder="Görsel URL (isteğe bağlı)..."
                        value={input.imageUrl}
                        onChange={(e) => {
                          const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n);
                        }}
                        className="w-full bg-transparent text-[10px] outline-none italic"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={saveNewOptions}
                disabled={actionLoading}
                className="w-full bg-white text-slate-950 hover:bg-blue-600 hover:text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Sisteme Kaydet
              </button>
            </div>
          </section>

          {/* SONUÇLAR (SAĞ PANEL - 8 KOLON) */}
          <section className="lg:col-span-8 bg-slate-900/20 border border-white/5 p-6 md:p-8 rounded-[2.5rem] min-h-[500px]">
             <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-blue-500" size={24} />
                  <h2 className="text-xl font-black text-white uppercase italic">Canlı Sonuçlar</h2>
                </div>
                <div className="bg-slate-800/50 px-5 py-2 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-blue-400 uppercase mr-3">Toplam Oy:</span>
                  <span className="text-lg font-black text-white">{totalVotes}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt) => {
                  const percent = calculatePercentage(opt.votes);
                  return (
                    <div key={opt.id} className="relative bg-slate-950 p-5 rounded-3xl border border-white/5 group hover:border-blue-500/30 transition-all overflow-hidden">
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-700" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-white mb-1 truncate w-32">{opt.option_text}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-blue-500">%{percent}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{opt.votes} Oy</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteOption(opt.id)} className="text-slate-800 hover:text-rose-500 transition-colors p-2">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="mt-4 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
             </div>

             {options.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[300px] text-slate-700">
                  <MousePointer2 size={40} strokeWidth={1} className="mb-4 animate-bounce opacity-20" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] italic opacity-30">Seçenek Bekleniyor...</p>
               </div>
             )}
          </section>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </main>
  );
}
