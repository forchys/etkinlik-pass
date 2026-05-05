"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Plus, Trash2, LayoutDashboard, ToggleRight, ToggleLeft, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function AdminSurveyPage() {
  // Eyalet Yönetimi (States)
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOption, setNewOption] = useState({ text: '', imageUrl: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  // 1. Veri Çekme Fonksiyonu
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // En son oluşturulan anketi getirir
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

  // 2. Anket Başlığı ve Durumu Güncelleme
  const updateSurveySettings = async () => {
    if (!survey) return;
    const { error } = await supabase
      .from('surveys')
      .update({ title: survey.title, is_active: survey.is_active })
      .eq('id', survey.id);
    
    if (!error) alert("Anket ayarları güncellendi!");
  };

  // 3. Yeni Şık Ekleme
  const addOption = async () => {
    if (!newOption.text || !survey) return;
    const { error } = await supabase
      .from('survey_options')
      .insert([{ 
        survey_id: survey.id, 
        option_text: newOption.text, 
        image_url: newOption.imageUrl,
        votes: 0 
      }]);

    if (!error) {
      setNewOption({ text: '', imageUrl: '' });
      fetchAdminData();
    }
  };

  // 4. Şık Silme
  const deleteOption = async (id: string) => {
    const confirm = window.confirm("Bu şıkkı silmek istediğine emin misin? Oylar da silinecektir.");
    if (!confirm) return;
    const { error } = await supabase.from('survey_options').delete().eq('id', id);
    if (!error) fetchAdminData();
  };

  if (loading && !survey) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Bilgi Paneli */}
        <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Anket Kontrol Merkezi</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Flick Bilet Yönetim Paneli</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SOL KOLON: ANKET GENEL AYARLARI */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                <Save size={16} /> Genel Ayarlar
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Anket Başlığı</label>
                  <input 
                    type="text"
                    value={survey?.title || ''}
                    onChange={(e) => setSurvey({...survey, title: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-white/5">
                  <span className="text-xs font-bold uppercase">Anket Yayında</span>
                  <button 
                    onClick={() => setSurvey({...survey, is_active: !survey.is_active})}
                    className="transition-colors"
                  >
                    {survey?.is_active ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} className="text-slate-600" />}
                  </button>
                </div>

                <button 
                  onClick={updateSurveySettings}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-widest"
                >
                  Ayarları Kaydet
                </button>
              </div>
            </div>
          </div>

          {/* SAĞ KOLON: ŞIKLAR VE EKLEME */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Yeni Şık Ekleme Formu */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6">Yeni Seçenek Ekle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  placeholder="Şık metni (Örn: Dram Tiyatrosu)"
                  value={newOption.text}
                  onChange={(e) => setNewOption({...newOption, text: e.target.value})}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <input 
                  placeholder="Görsel URL (Opsiyonel)"
                  value={newOption.imageUrl}
                  onChange={(e) => setNewOption({...newOption, imageUrl: e.target.value})}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <button 
                onClick={addOption}
                className="flex items-center justify-center gap-2 w-full md:w-auto px-8 bg-white text-black font-black py-3 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-xs uppercase"
              >
                <Plus size={18} /> Şıkkı Listeye Ekle
              </button>
            </div>

            {/* Mevcut Şıklar Listesi */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6">Mevcut Seçenekler ve Oylar</h2>
              <div className="space-y-3">
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      {opt.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 relative">
                          <img src={opt.image_url} alt="" className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-slate-700">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm uppercase">{opt.option_text}</p>
                        <p className="text-blue-500 text-[10px] font-black uppercase">{opt.votes} OY ALDI</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => deleteOption(opt.id)}
                      className="text-slate-600 hover:text-red-500 p-2 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                {options.length === 0 && <p className="text-center text-slate-600 py-10 text-xs italic uppercase tracking-widest">Henüz bir seçenek eklemedin.</p>}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
