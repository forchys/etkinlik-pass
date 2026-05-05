"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Save, Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, X
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Yeni şıklar için geçici state (Başlangıçta 2 boş kutu)
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
      console.error("Yükleme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateSurveySettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('surveys')
      .update({ title: survey.title, is_active: survey.is_active })
      .eq('id', survey.id);
    
    if (!error) alert("Ayarlar güncellendi!");
    setSaving(false);
  };

  // Dinamik kutu ekleme
  const addNewInputRow = () => {
    setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }]);
  };

  // Dinamik kutuyu listeden çıkarma
  const removeInputRow = (index: number) => {
    setDynamicInputs(dynamicInputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const updated = [...dynamicInputs];
    updated[index] = { ...updated[index], [field]: value };
    setDynamicInputs(updated);
  };

  const saveAllNewOptions = async () => {
    const validOptions = dynamicInputs.filter(opt => opt.text.trim() !== '');
    if (validOptions.length === 0) return;

    const insertData = validOptions.map(opt => ({
      survey_id: survey.id,
      option_text: opt.text,
      image_url: opt.imageUrl,
      votes: 0
    }));

    const { error } = await supabase.from('survey_options').insert(insertData);
    if (!error) {
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      fetchAdminData();
    }
  };

  const deleteOption = async (id: string) => {
    if (!window.confirm("Bu şık silinecek, emin misin?")) return;
    const { error } = await supabase.from('survey_options').delete().eq('id', id);
    if (!error) fetchAdminData();
  };

  if (loading && !survey) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-blue-500 font-black text-xs tracking-widest uppercase animate-pulse">Veriler Getiriliyor</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-4 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Üst Başlık Bölümü */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-xl shadow-blue-500/20">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Anket <span className="text-blue-500 font-light not-italic">Engine</span></h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1">Sistem Yönetim Paneli v2.0</p>
            </div>
          </div>

          {/* Yenilenmiş Toggle Butonu */}
          <div className="flex items-center gap-4 bg-slate-950/50 p-2 pr-6 rounded-full border border-white/5">
            <button 
              onClick={() => setSurvey({...survey, is_active: !survey.is_active})}
              className={`relative w-16 h-8 rounded-full transition-all duration-500 outline-none ${survey?.is_active ? 'bg-emerald-500/20' : 'bg-slate-800'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-all duration-500 shadow-lg ${survey?.is_active ? 'translate-x-8 bg-emerald-500' : 'translate-x-0 bg-slate-400'}`} />
            </button>
            <span className={`text-[11px] font-black uppercase tracking-widest ${survey?.is_active ? 'text-emerald-500' : 'text-slate-500'}`}>
              {survey?.is_active ? 'Yayında' : 'Pasif'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SOL: AYARLAR VE YENİ EKLEME */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Genel Ayarlar Kartı */}
            <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /> Anket Konfigürasyonu
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-1">Anket Sorusu / Başlık</label>
                  <input 
                    type="text"
                    value={survey?.title || ''}
                    onChange={(e) => setSurvey({...survey, title: e.target.value})}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:border-blue-500/50 outline-none transition-all shadow-inner"
                    placeholder="Anket sorusunu girin..."
                  />
                </div>
                <button 
                  onClick={updateSurveySettings}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Değişiklikleri Uygula
                </button>
              </div>
            </section>

            {/* Dinamik Şık Ekleme Kartı */}
            <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Yeni Şıklar Oluştur</h3>
                <button 
                  onClick={addNewInputRow}
                  className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {dynamicInputs.map((input, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 space-y-3 relative group">
                    <button 
                      onClick={() => removeInputRow(idx)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={14} />
                    </button>
                    <input 
                      placeholder="Şık metni..."
                      value={input.text}
                      onChange={(e) => handleInputChange(idx, 'text', e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <div className="flex gap-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-white/5 text-slate-600">
                        <ImageIcon size={16} />
                      </div>
                      <input 
                        placeholder="Görsel URL (Opsiyonel)"
                        value={input.imageUrl}
                        onChange={(e) => handleInputChange(idx, 'imageUrl', e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-indigo-500/50 transition-all italic"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={saveAllNewOptions}
                className="w-full mt-6 bg-white text-slate-950 font-black py-4 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all text-xs uppercase tracking-widest shadow-lg"
              >
                Tümünü Sisteme Ekle
              </button>
            </section>
          </div>

          {/* SAĞ: MEVCUT LİSTE VE İSTATİSTİK */}
          <div className="lg:col-span-7">
            <section className="bg-slate-900/20 border border-white/5 rounded-[2.5rem] p-4 lg:p-8">
              <div className="flex items-center justify-between mb-8 px-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Aktif Seçenekler ve İstatistikler</h3>
                <span className="text-[10px] font-bold bg-slate-800 px-3 py-1 rounded-full">{options.length} SEÇENEK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {options.map((opt) => (
                  <div key={opt.id} className="bg-slate-950 border border-white/5 p-5 rounded-3xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    {/* Arka Plan Progress Bar (Oy sayısına göre görsel doluluk) */}
                    <div className="absolute bottom-0 left-0 h-1 bg-blue-600/20 w-full" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      {opt.image_url ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={opt.image_url} alt="" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-700 border border-white/5">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm uppercase text-white truncate mb-1">{opt.option_text}</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-blue-500" />
                          <span className="text-blue-500 text-[11px] font-black tracking-tighter uppercase">{opt.votes} Toplam Oy</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteOption(opt.id)}
                        className="text-slate-700 hover:text-rose-500 p-2 transition-all hover:bg-rose-500/10 rounded-xl"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {options.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                  <AlertCircle size={48} className="mx-auto text-slate-800 mb-4" />
                  <p className="text-slate-600 text-xs font-black uppercase tracking-widest italic">Henüz bir seçenek eklenmedi</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </main>
  );
}
