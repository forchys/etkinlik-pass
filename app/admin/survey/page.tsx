"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Save, Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, CheckCircle2
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Başlangıçta 2 boş kutu tanımlıyoruz
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

  // Aktif/Pasif Durumunu Veritabanında Güncelleme
  const toggleSurveyStatus = async () => {
    if (!survey) return;
    const newStatus = !survey.is_active;
    
    // UI'da anında göster (Optimistic Update)
    setSurvey({ ...survey, is_active: newStatus });

    const { error } = await supabase
      .from('surveys')
      .update({ is_active: newStatus })
      .eq('id', survey.id);

    if (error) {
      alert("Durum güncellenirken hata oluştu!");
      setSurvey({ ...survey, is_active: !newStatus }); // Hata varsa geri al
    }
  };

  // Yeni boş kutu ekleme fonksiyonu
  const handleAddInput = () => {
    setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }]);
  };

  // Kutulardaki veriyi güncelleme
  const updateInput = (index: number, field: string, value: string) => {
    const newInputs = [...dynamicInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setDynamicInputs(newInputs);
  };

  // Tüm yeni şıkları kaydetme
  const saveNewOptions = async () => {
    const toInsert = dynamicInputs.filter(opt => opt.text.trim() !== "").map(opt => ({
      survey_id: survey.id,
      option_text: opt.text,
      image_url: opt.imageUrl,
      votes: 0
    }));

    if (toInsert.length === 0) return alert("Lütfen en az bir şık metni girin.");

    const { error } = await supabase.from('survey_options').insert(toInsert);
    if (!error) {
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      fetchAdminData();
    }
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 lg:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER: Masaüstü için optimize edildi */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase">Anket Yönetimi</h1>
              <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Flick Bilet Sistemi</p>
            </div>
          </div>

          {/* AKTİF/PASİF BUTONU - DAHA DOĞRU ÇALIŞAN VERSİYON */}
          <button 
            onClick={toggleSurveyStatus}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              survey?.is_active 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}
          >
            <Power size={18} />
            {survey?.is_active ? 'ANKET ŞUAN AÇIK' : 'ANKET ŞUAN KAPALI'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* SOL: ŞIK EKLEME ALANI */}
          <section className="space-y-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-blue-400 text-xs font-black uppercase mb-6 tracking-widest flex justify-between items-center">
                Yeni Şıklar Ekle
                <button onClick={handleAddInput} className="bg-blue-600 hover:bg-blue-500 p-1 rounded-lg text-white">
                  <Plus size={20} />
                </button>
              </h2>
              
              <div className="space-y-4">
                {dynamicInputs.map((input, idx) => (
                  <div key={idx} className="space-y-2 p-4 bg-slate-950 rounded-2xl border border-white/5">
                    <input 
                      placeholder="Şık Metni"
                      value={input.text}
                      onChange={(e) => updateInput(idx, 'text', e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 py-2 outline-none focus:border-blue-500 text-sm"
                    />
                    <input 
                      placeholder="Görsel URL (İsteğe bağlı)"
                      value={input.imageUrl}
                      onChange={(e) => updateInput(idx, 'imageUrl', e.target.value)}
                      className="w-full bg-transparent py-2 outline-none text-[10px] text-slate-500 italic"
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={saveNewOptions}
                className="w-full mt-6 bg-white text-black font-black py-4 rounded-2xl uppercase text-xs tracking-tighter hover:bg-blue-500 hover:text-white transition-all"
              >
                Değişiklikleri Kaydet ve Yayınla
              </button>
            </div>
          </section>

          {/* SAĞ: MEVCUT LİSTE */}
          <section className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 h-fit">
            <h2 className="text-slate-400 text-xs font-black uppercase mb-6 tracking-widest text-center italic">Yayındaki Şıklar</h2>
            <div className="space-y-3">
              {options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5 group">
                  <div className="flex items-center gap-4">
                    {opt.image_url ? (
                      <img src={opt.image_url} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center"><ImageIcon size={16} /></div>
                    )}
                    <div>
                      <p className="text-sm font-bold uppercase">{opt.option_text}</p>
                      <p className="text-[10px] text-blue-500 font-black">{opt.votes} OY</p>
                    </div>
                  </div>
                  <button onClick={() => deleteOption(opt.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
