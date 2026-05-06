"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  Image as ImageIcon, Loader2, Power, BarChart3,
  MousePointer2, Save, CheckCircle2
} from 'lucide-react';

/**
 * AdminSurveyPage: Anket yönetimi, canlı sonuç takibi ve şık ekleme işlemlerini 
 * gerçekleştiren merkezi yönetim panelidir.
 */
export default function AdminSurveyPage() {
  // --- STATE YÖNETİMİ ---
  const [survey, setSurvey] = useState<any>(null); // Mevcut anket bilgisi
  const [options, setOptions] = useState<any[]>([]); // Ankete ait şıklar
  const [loading, setLoading] = useState(true); // Sayfa ilk yüklenme durumu
  const [actionLoading, setActionLoading] = useState(false); // Buton işlem durumları
  
  // Yeni eklenecek şıklar için dinamik input state'i
  const [dynamicInputs, setDynamicInputs] = useState([
    { text: '', imageUrl: '' },
    { text: '', imageUrl: '' }
  ]);

  // Sayfa açıldığında verileri çek
  useEffect(() => {
    fetchAdminData();
  }, []);

  /**
   * fetchAdminData: Veritabanındaki en güncel anketi ve bu ankete ait şıkları getirir.
   */
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
      console.error("Veri yükleme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  // İstatistiksel hesaplamalar
  const totalVotes = options?.reduce((acc, curr) => acc + (Number(curr.votes) || 0), 0) || 0;

  const calculatePercentage = (votes: number) => {
    if (totalVotes === 0) return "0";
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  /**
   * saveNewOptions: Şık ekleme ve anket oluşturma mantığı.
   * Eğer anket yoksa önce oluşturur, sonra şıkları bu ankete bağlayarak kaydeder.
   */
  const saveNewOptions = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      let currentSurveyId = survey?.id;

      // 1. ADIM: Aktif bir anket yoksa otomatik olarak bir tane oluştur
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

      // 2. ADIM: Boş olmayan şıkları filtrele ve hazırla
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

      // 3. ADIM: Şıkları veritabanına toplu olarak ekle
      const { error: optError } = await supabase.from('survey_options').insert(toInsert);
      
      if (optError) throw optError;

      // Başarılı işlem sonrası formu temizle ve verileri tazele
      setDynamicInputs([{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }]);
      await fetchAdminData();
      
    } catch (error: any) {
      console.error("Kayıt Hatası:", error.message);
      alert("İşlem sırasında bir sorun oluştu. Lütfen bağlantınızı kontrol edin.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSurveyStatus = async () => {
    if (actionLoading || !survey) return;
    setActionLoading(true);
    const nextStatus = !survey.is_active;
    const { error } = await supabase.from('surveys').update({ is_active: nextStatus }).eq('id', survey.id);
    if (!error) setSurvey({ ...survey, is_active: nextStatus });
    setActionLoading(false);
  };

  const deleteOption = async (id: string) => {
    if(!confirm("Bu seçeneği silmek istediğine emin misin?")) return;
    await supabase.from('survey_options').delete().eq('id', id);
    fetchAdminData();
  };

  // Yüklenme Ekranı
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="text-indigo-500 font-bold text-xs tracking-widest uppercase">Veriler Hazırlanıyor...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* ÜST DASHBOARD: Responsive Header */}
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
          <div className="flex-1 bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex items-center gap-6 shadow-xl">
            <div className="bg-indigo-600/20 p-4 rounded-2xl text-indigo-500">
              <LayoutDashboard size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight italic">Panel <span className="text-indigo-500 not-italic">Merkezi</span></h1>
              <p className="text-slate-500 text-[9px] font-bold tracking-[0.3em] uppercase">Flick Admin v2.1</p>
            </div>
          </div>

          <button 
            onClick={toggleSurveyStatus}
            disabled={actionLoading}
            className={`md:w-64 flex items-center justify-between px-6 py-4 rounded-3xl border transition-all duration-500 ${
              survey?.is_active 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10'
            }`}
          >
            <div className="text-left">
              <p className="text-[9px] font-black uppercase opacity-60">Sistem Durumu</p>
              <p className="text-xs font-black tracking-widest">{survey?.is_active ? 'ÇALIŞIYOR' : 'DURDURULDU'}</p>
            </div>
            {actionLoading ? <Loader2 className="animate-spin" size={24} /> : <Power size={24} />}
          </button>
        </div>

        {/* ANA İÇERİK: Masaüstünde 12'li grid, mobilde tek kolon */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SEÇENEK EKLEME (Masaüstünde 4 Kolon) */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 backdrop-blur-md sticky top-8">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-indigo-400 text-xs font-black uppercase tracking-widest">Şıkları Hazırla</h2>
              <button 
                onClick={() => setDynamicInputs([...dynamicInputs, { text: '', imageUrl: '' }])} 
                className="bg-indigo-600/20 hover:bg-indigo-600 p-2 rounded-xl text-indigo-400 hover:text-white transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicInputs.map((input, idx) => (
                <div key={idx} className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-3 transition-all focus-within:border-indigo-500/50 group">
                  <input 
                    placeholder="Seçenek metni..."
                    value={input.text}
                    onChange={(e) => {
                      const n = [...dynamicInputs]; n[idx].text = e.target.value; setDynamicInputs(n);
                    }}
                    className="w-full bg-transparent border-b border-white/5 py-1 outline-none text-sm font-bold text-white focus:border-indigo-500 transition-all placeholder:text-slate-700"
                  />
                  <div className="flex items-center gap-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <ImageIcon size={14} />
                    <input 
                      placeholder="Görsel Linki (Opsiyonel)..."
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 group"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
              Sisteme Kaydet
            </button>
          </section>

          {/* CANLI SONUÇLAR (Masaüstünde 8 Kolon) */}
          <section className="lg:col-span-8 bg-slate-900/20 border border-white/5 rounded-[3rem] p-6 md:p-10 min-h-[600px]">
             <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                  <BarChart3 className="text-indigo-500" size={24} />
                  <h2 className="text-xl font-black text-white uppercase italic">Canlı İstatistikler</h2>
                </div>
                <div className="bg-slate-800/50 px-5 py-2 rounded-2xl border border-white/5 flex items-baseline gap-3">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Katılım</span>
                  <span className="text-xl font-black text-white">{totalVotes}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {options.map((opt) => {
                  const percent = calculatePercentage(opt.votes);
                  return (
                    <div key={opt.id} className="relative bg-slate-950 p-6 rounded-[2rem] border border-white/5 group hover:border-indigo-500/30 transition-all overflow-hidden">
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-500/50 transition-colors">
                            {opt.image_url ? <img src={opt.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-700" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase text-white mb-2 truncate max-w-[150px]">{opt.option_text}</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-indigo-500">%{percent}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{opt.votes} OY</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteOption(opt.id)} className="text-slate-800 hover:text-rose-500 transition-colors p-2">
                          <Trash2 size={20} />
                        </button>
                      </div>

                      {/* Görsel İlerleme Çubuğu */}
                      <div className="mt-6 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${percent}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
             </div>

             {options.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[350px] text-slate-700">
                  <MousePointer2 size={48} strokeWidth={1} className="mb-4 animate-bounce opacity-20" />
                  <p className="text-xs font-black uppercase tracking-[0.4em] italic opacity-30">Veri Girişi Bekleniyor...</p>
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
