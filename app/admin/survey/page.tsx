"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3, Save, Edit3
} from 'lucide-react';

/**
 * AdminSurveyPage: Minimalist ve dikey sıralı yönetim paneli.
 * Yenilik: Anket başlığı artık düzenlenebilir.
 */
export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Başlığı yönetmek için yeni state
  const [surveyTitle, setSurveyTitle] = useState("");

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
        .from('surveys').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (surveyData) {
        setSurvey(surveyData);
        setSurveyTitle(surveyData.title); // Başlığı state'e yükle
        const { data: optionsData } = await supabase
          .from('survey_options').select('*').eq('survey_id', surveyData.id).order('votes', { ascending: false });
        setOptions(optionsData || []);
      }
    } catch (e) {
      console.error("Hata:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      let currentSurveyId = survey?.id;
      
      // 1. Eğer anket varsa, önce başlığı güncelle
      if (currentSurveyId) {
        await supabase.from('surveys').update({ title: surveyTitle }).eq('id', currentSurveyId);
      } else {
        // Anket yoksa yeni oluştur
        const { data: newSurvey } = await supabase.from('surveys').insert([{ title: surveyTitle || 'Yeni Anket', is_active: true }]).select().single();
        currentSurveyId = newSurvey.id;
        setSurvey(newSurvey);
      }

      // 2. Yeni şıkları ekle
      const toInsert = dynamicInputs
        .filter(opt => opt.text.trim() !== "")
        .map(opt => ({ survey_id: currentSurveyId, option_text: opt.text, image_url: opt.imageUrl, votes: 0 }));

      if (toInsert.length > 0) {
        await supabase.from('survey_options').insert(toInsert);
        setDynamicInputs([{ text: '', imageUrl: '' }]);
      }
      
      await fetchAdminData();
      alert("Başarıyla kaydedildi!");
    } catch (error) {
      alert("İşlem sırasında hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!survey) return;
    const next = !survey.is_active;
    await supabase.from('surveys').update({ is_active: next }).eq('id', survey.id);
    setSurvey({ ...survey, is_active: next });
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-blue-400"><Loader2 className="animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-300 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* 1. BÖLÜM: ÜST DURUM ÇUBUĞU VE BAŞLIK EDİTÖRÜ */}
        <section className="bg-slate-900 border border-white/5 p-4 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className="text-blue-500" />
              <h1 className="font-bold text-white uppercase tracking-tight text-sm">Anket Yönetimi</h1>
            </div>
            <button onClick={toggleStatus} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${survey?.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              {survey?.is_active ? 'ANKET AÇIK' : 'ANKET KAPALI'}
            </button>
          </div>

          <div className="relative group">
            <input 
              type="text"
              value={surveyTitle}
              onChange={(e) => setSurveyTitle(e.target.value)}
              placeholder="Anket Başlığı Yazın..."
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-lg font-bold text-white outline-none focus:border-blue-500/50 transition-all"
            />
            <Edit3 size={16} className="absolute right-4 top-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
          </div>
        </section>

        {/* 2. BÖLÜM: ŞIK EKLEME ALANI */}
        <section className="bg-slate-900 border border-white/5 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Yeni Şıklar Ekle</h2>
            <button onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} className="text-blue-500 hover:text-blue-400"><Plus size={20}/></button>
          </div>
          
          <div className="space-y-2">
            {dynamicInputs.map((input, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-2 bg-slate-950 p-3 rounded-lg border border-white/5">
                <input 
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-white" 
                  placeholder="Şık metni..." 
                  value={input.text}
                  onChange={e => { const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n); }}
                />
                <input 
                  className="flex-1 bg-transparent outline-none text-[11px] italic opacity-50 focus:opacity-100 text-slate-300" 
                  placeholder="Görsel URL (Opsiyonel)..." 
                  value={input.imageUrl}
                  onChange={e => { const n = [...dynamicInputs]; n[idx].imageUrl = e.target.value; setDynamicInputs(n); }}
                />
              </div>
            ))}
          </div>

          <button onClick={saveChanges} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Değişiklikleri ve Başlığı Kaydet
          </button>
        </section>

        {/* 3. BÖLÜM: CANLI SONUÇLAR LİSTESİ */}
        <section className="bg-slate-900 border border-white/5 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mevcut Durum</h2>
            <div className="text-[10px] font-bold text-blue-400">TOPLAM OY: {options.reduce((a, b) => a + b.votes, 0)}</div>
          </div>

          <div className="divide-y divide-white/5">
            {options.map((opt) => {
              const total = options.reduce((a, b) => a + b.votes, 0);
              const percent = total > 0 ? ((opt.votes / total) * 100).toFixed(1) : "0";
              return (
                <div key={opt.id} className="py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-slate-950 rounded border border-white/10 flex-shrink-0 overflow-hidden">
                      {opt.image_url && <img src={opt.image_url} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-white">{opt.option_text}</span>
                        <span className="text-xs font-black text-blue-500">%{percent} ({opt.votes} oy)</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full">
                        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { if(confirm('Sil?')) supabase.from('survey_options').delete().eq('id', opt.id).then(() => fetchAdminData()) }} className="ml-4 opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
