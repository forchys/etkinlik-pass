"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, LayoutDashboard, 
  ImageIcon, Loader2, Power, 
  BarChart3, Save, CheckCircle2, AlertCircle, Edit2, RefreshCw, Upload
} from 'lucide-react';

export default function AdminSurveyPage() {
  const [survey, setSurvey] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: surveyData } = await supabase
        .from('surveys').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (surveyData) {
        setSurvey(surveyData);
        const { data: optionsData } = await supabase
          .from('survey_options').select('*').eq('survey_id', surveyData.id).order('created_at', { ascending: true });
        setOptions(optionsData || []);
      }
    } catch (e) {
      console.error("Veri çekme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSurvey = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ title: survey.title, is_active: survey.is_active })
        .eq('id', survey.id);
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Anket ayarları başarıyla güncellendi!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Güncelleme başarısız oldu.' });
    } finally {
      setActionLoading(false);
    }
  };

  const hardResetSurvey = async () => {
    const confirmFirst = confirm('DİKKAT: Mevcut anket silinecek ve YENİ VERSİYON oluşturulacak. Bu işlem tüm kullanıcıların "oy kullandınız" engelini otomatik kaldırır. Emin misin?');
    if (!confirmFirst) return;

    setActionLoading(true);
    try {
      const currentTitle = survey.title;
      const currentIsActive = survey.is_active;
      const oldId = survey.id;
      const newVersion = (survey.version || 1) + 1;

      await supabase.from('survey_options').delete().eq('survey_id', oldId);
      await supabase.from('surveys').delete().eq('id', oldId);

      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert([{ 
            title: currentTitle, 
            is_active: currentIsActive,
            version: newVersion 
        }])
        .select()
        .single();

      if (createError) throw createError;

      localStorage.removeItem(`voted_${oldId}`);
      localStorage.setItem(`last_cleared_v_${newSurvey.id}`, newVersion.toString());

      setSurvey(newSurvey);
      setOptions([]);
      setMessage({ type: 'success', text: `Sistem v${newVersion} olarak sıfırlandı!` });
      
      await fetchData();
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Sıfırlama işlemi sırasında bir hata oluştu.' });
    } finally {
      setActionLoading(false);
    }
  };

  const addOption = async () => {
    const { data: newOpt, error } = await supabase
      .from('survey_options')
      .insert([{ survey_id: survey.id, option_text: 'Yeni Şık', votes: 0 }])
      .select().single();

    if (!error) setOptions([...options, newOpt]);
  };

  const deleteOption = async (id: string) => {
    if (!confirm('Bu şıkkı silmek istediğine emin misin?')) return;
    const { error } = await supabase.from('survey_options').delete().eq('id', id);
    if (!error) setOptions(options.filter(o => o.id !== id));
  };

  const updateOptionLocal = (id: string, field: string, value: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const saveOptionToDB = async (opt: any) => {
    const { error } = await supabase
      .from('survey_options')
      .update({ option_text: opt.option_text, image_url: opt.image_url })
      .eq('id', opt.id);
    
    if (!error) setMessage({ type: 'success', text: 'Şık kaydedildi.' });
  };

  // YENİ: Görsel Yükleme Fonksiyonu
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(optId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('survey-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('survey-images')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Local state güncelle
      setOptions(prev => prev.map(o => o.id === optId ? { ...o, image_url: publicUrl } : o));
      
      // DB güncelle
      await supabase
        .from('survey_options')
        .update({ image_url: publicUrl })
        .eq('id', optId);

      setMessage({ type: 'success', text: 'Görsel başarıyla yüklendi!' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'Yükleme başarısız.' });
    } finally {
      setUploadingId(null);
    }
  };

  const totalVotes = options.reduce((acc, curr) => acc + (curr.votes || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-slate-500 font-medium animate-pulse">Sistem yükleniyor...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {message.text && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        <header className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 p-2.5 rounded-xl text-blue-500 shadow-inner">
                <LayoutDashboard size={22} />
              </div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter">Anket Editörü</h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={hardResetSurvey}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all font-bold text-[9px] tracking-widest uppercase"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                HER ŞEYİ SIFIRLA
              </button>
              
              <button 
                onClick={() => {
                  const nextStatus = !survey.is_active;
                  setSurvey({ ...survey, is_active: nextStatus });
                  supabase.from('surveys').update({ is_active: nextStatus }).eq('id', survey.id);
                }}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-500 font-bold text-[10px] tracking-widest ${
                  survey.is_active 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}
              >
                {survey.is_active ? 'SİSTEM AKTİF' : 'SİSTEM KAPALI'}
                <Power size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Anket Başlığı</label>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <input 
                  value={survey.title}
                  onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-lg font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800"
                  placeholder="Anket başlığını buraya yazın..."
                />
                <Edit2 size={18} className="absolute right-5 top-4.5 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <button 
                onClick={handleUpdateSurvey}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                GÜNCELLE
              </button>
            </div>
          </div>
        </header>

        <section className="bg-slate-900/30 border border-white/5 p-6 rounded-[2.5rem] space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Anket Şıkları</h2>
            <button 
              onClick={addOption}
              className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/5"
            >
              <Plus size={16} className="text-blue-500 group-hover:scale-125 transition-transform" />
              <span className="text-[10px] font-black text-white">YENİ ŞIK</span>
            </button>
          </div>

          <div className="grid gap-4">
            {options.map((opt) => (
              <div key={opt.id} className="group bg-slate-950/40 border border-white/5 p-4 rounded-3xl hover:border-blue-500/20 transition-all">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  {/* Görsel Yükleme Alanı */}
                  <div className="relative w-20 h-20 bg-slate-900 rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 flex items-center justify-center group/img">
                    {uploadingId === opt.id ? (
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                    ) : opt.image_url ? (
                      <img src={opt.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover/img:opacity-30 transition-opacity" />
                    ) : (
                      <ImageIcon className="text-slate-800" size={24} />
                    )}
                    
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={(e) => handleImageUpload(e, opt.id)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <Upload size={18} className="text-white" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <input 
                      value={opt.option_text}
                      onChange={(e) => updateOptionLocal(opt.id, 'option_text', e.target.value)}
                      onBlur={() => saveOptionToDB(opt)}
                      placeholder="Şık metni..."
                      className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-800"
                    />
                    <div className="flex items-center gap-2 opacity-60 italic text-[10px] text-slate-400">
                        <span className="truncate max-w-[250px]">{opt.image_url ? opt.image_url : "Görsel yüklenmedi"}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => deleteOption(opt.id)}
                    className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="text-blue-500" size={20} />
                <h2 className="text-xl font-black text-white uppercase italic">Canlı Sonuçlar</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gerçek zamanlı oy dağılımı</p>
            </div>
            <div className="text-right">
              <span className="block text-3xl font-black text-white tracking-tighter">{totalVotes}</span>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">TOPLAM OY</span>
            </div>
          </div>

          <div className="grid gap-6">
            {options.map((opt) => {
              const percent = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : "0";
              return (
                <div key={opt.id} className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-sm font-black text-slate-300 uppercase">{opt.option_text}</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-blue-500">%{percent}</span>
                      <span className="text-[10px] font-bold text-slate-600 ml-2">({opt.votes} oy)</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[2px]">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
