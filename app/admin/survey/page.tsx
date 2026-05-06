"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Save, Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Başlangıçta 2 boş kutu (Arayüzde hazır gelir)
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
        .single();

      if (surveyData) {
        setSurvey(surveyData);
        const { data: optionsData } = await supabase
          .from('survey_options')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('created_at', { ascending: true });
        setOptions(optionsData || []);
      }
    } catch (e) {
      console.error("Veri çekme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- AKTİFLİK TUŞU (FIXED) ---
  const toggleSurveyStatus = async () => {
    if (!survey) return;
    
    const currentStatus = survey.is_active;
    const nextStatus = !currentStatus;

    // 1. Adım: Arayüzü hemen güncelle (Hızlı tepki için)
    setSurvey({ ...survey, is_active: nextStatus });

    // 2. Adım: Veritabanını güncelle
    const { error } = await supabase
      .from('surveys')
      .update({ is_active: nextStatus })
      .eq('id', survey.id);

    if (error) {
      console.error("Güncelleme hatası:", error);
      alert("Durum değiştirilemedi!");
      // Hata varsa arayüzü eski haline geri çek
      setSurvey({ ...survey, is_active: currentStatus });
    }
  };

  // --- İSTATİSTİK HESAPLAMA ---
  const totalVotes = options.reduce((acc, curr) => acc + (curr.votes || 0), 0);

  const calculatePercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  // --- DİNAMİK ŞIK YÖNETİMİ ---
  const handleAddInput = () => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }]);

  const updateInput = (index: number, field: string, value: string) => {
    const newInputs = [...dynamicInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setDynamicInputs(newInputs);
  };

  const saveNewOptions = async () => {
    const toInsert = dynamicInputs
      .filter(opt => opt.text.trim() !== "")
      .map(opt => ({
        survey_id: survey.id,
        option_text: opt.text,
        image_url: opt.imageUrl,
        votes: 0
      }));

    if (toInsert.length === 0) return alert("En az bir şık yazmalısın.");

    const { error } = await supabase.from('survey_options').insert(toInsert);
    if (!error) {
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      fetchAdminData();
    }
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Bu şıkkı silmek istediğine emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 lg:p-16">
      <div className="max-w-6xl mx-auto">
        
        {/* ÜST PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-slate-900/40 p-10 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-500/20">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">Anket <span className="text-indigo-400 not-italic">Kontrol</span></h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">Flick Admin Panel</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            className={`group relative flex items-center gap-4 px-8 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all duration-300 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white' 
              : 'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
            }`}
          >
            <Power size={18} className="group-hover:scale-125 transition-transform" />
            {survey?.is_active ? 'SİSTEM AKTİF' : 'SİSTEM KAPALI'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* ŞIK EKLEME BÖLÜMÜ */}
          <section className="bg-slate-900/30 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em]">Seçenek Oluştur</h2>
              <button onClick={handleAddInput} className="bg-indigo-600 hover:bg-indigo-400 p-2 rounded-xl transition-all">
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950/80 p-5 rounded-2xl border border-white/5 space-y-3">
                  <input 
                    placeholder="Şık Başlığı..."
                    value={input.text}
                    onChange={(e) => updateInput(idx, 'text', e.target.value)}
                    className="w-full bg-transparent border-b border-white/5 py-2 outline-none focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                  <div className="flex items-center gap-3">
                    <ImageIcon size={14} className="text-slate-600" />
                    <input 
                      placeholder="Görsel URL (Örn: https://...)"
                      value={input.imageUrl}
                      onChange={(e) => updateInput(idx, 'imageUrl', e.target.value)}
                      className="w-full bg-transparent py-1 outline-none text-[10px] text-slate-500 italic"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={saveNewOptions}
              className="w-full bg-white text-slate-950 font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-white/5"
            >
              Şıkları Kaydet ve Güncelle
            </button>
          </section>

          {/* SONUÇLAR VE İSTATİSTİK BÖLÜMÜ */}
          <section className="bg-slate-900/30 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <BarChart3 size={16} /> Canlı Sonuçlar
              </h2>
              <span className="bg-slate-800 text-[10px] px-3 py-1 rounded-full font-bold">TOPLAM: {totalVotes} OY</span>
            </div>

            <div className="space-y-4">
              {options.map((opt) => {
                const percent = calculatePercentage(opt.votes);
                return (
                  <div key={opt.id} className="relative bg-slate-950 p-5 rounded-2xl border border-white/5 overflow-hidden group">
                    {/* Yüzde Çubuğu Arka Plan */}
                    <div 
                      className="absolute left-0 top-0 h-full bg-indigo-600/10 transition-all duration-1000" 
                      style={{ width: `${percent}%` }}
                    />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-black text-indigo-500 w-12">{percent}%</div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{opt.option_text}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{opt.votes} Kişi Seçti</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteOption(opt.id)}
                        className="text-slate-700 hover:text-rose-500 p-2 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 10px; }
      `}</style>
    </main>
  );
}
