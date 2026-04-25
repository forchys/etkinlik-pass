"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, Smartphone, Mail, School, Users, 
  Upload, MessageCircle, CheckCircle2, Loader2, Image as ImageIcon 
} from 'lucide-react';

// selectedEventId yanına whatsappLink prop'u eklendi
export default function NewRegistration({ 
  onSuccess, 
  selectedEventId,
  whatsappLink // Bu alan eklendi
}: { 
  onSuccess: (data: any) => void,
  selectedEventId: string,
  whatsappLink?: string // Tip tanımı eklendi
}) {
  const [loading, setLoading] = useState(false);
  const [waJoined, setWaJoined] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    ad_soyad: '',
    email: '',
    telefon: '',
    okul: '',
    referans: ''
  });

  const handleFileUpload = async (userId: string) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `dekontlar/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('dekontlar')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('dekontlar').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waJoined) return alert("Lütfen önce WhatsApp grubuna katılın!");
    if (!file) return alert("Lütfen ödeme dekontunu yükleyin!");

    setLoading(true);
    try {
      // 1. Katılımcıyı ekle (etkinlik_id ve onayli_mi: false eklendi)
      const { data: user, error: userError } = await supabase
        .from('katilimcilar')
        .insert([{
          ...formData,
          etkinlik_id: selectedEventId, // Seçili etkinliğe bağlar
          onayli_mi: false,              // Pending sekmesine düşmesini sağlar
          geldi_mi: false,
          bilet_alindi_mi: false
        }])
        .select()
        .single();

      if (userError) throw userError;

      // 2. Dekontu yükle ve URL'i güncelle
      const dekontUrl = await handleFileUpload(user.id);
      await supabase
        .from('katilimcilar')
        .update({ dekont_url: dekontUrl })
        .eq('id', user.id);

      onSuccess(user);
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl animate-in fade-in duration-700">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 tracking-tighter uppercase text-white">
        <CheckCircle2 className="text-blue-500" /> Etkinlik Kaydı
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Giriş Alanları */}
        <div className="grid grid-cols-1 gap-3">
          <InputItem icon={<User size={18}/>} placeholder="Ad Soyad" value={formData.ad_soyad} onChange={(v: any) => setFormData({...formData, ad_soyad: v})} />
          <InputItem icon={<Mail size={18}/>} placeholder="E-posta" type="email" value={formData.email} onChange={(v: any) => setFormData({...formData, email: v})} />
          <InputItem icon={<Smartphone size={18}/>} placeholder="Telefon" value={formData.telefon} onChange={(v: any) => setFormData({...formData, telefon: v})} />
          <InputItem icon={<School size={18}/>} placeholder="Okul / Bölüm" value={formData.okul} onChange={(v: any) => setFormData({...formData, okul: v})} />
          <InputItem icon={<Users size={18}/>} placeholder="Referans (Varsa)" value={formData.referans} onChange={(v: any) => setFormData({...formData, referans: v})} />
        </div>

        {/* Dekont Yükleme */}
        <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-4 transition-all hover:bg-white/5">
          <input 
            type="file" accept="image/*" 
            onChange={(e: any) => setFile(e.target.files?.[0] || null)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-3 text-slate-400">
            <ImageIcon />
            <span className="text-sm">{file ? file.name : "Ödeme Dekontu Yükle"}</span>
          </div>
        </div>

        {/* WhatsApp Butonu - Dinamik Link Bağlandı */}
        <a 
          href={whatsappLink || "#"} 
          target="_blank"
          onClick={() => setWaJoined(true)}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${waJoined ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-[#25D366] text-white'}`}
        >
          <MessageCircle size={20} />
          {waJoined ? "GRUBA KATILINDI" : "WHATSAPP GRUBUNA KATIL"}
        </a>

        {/* Kaydı Tamamla */}
        <button
          disabled={loading || !waJoined}
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : "KAYDI TAMAMLA"}
        </button>
      </form>
    </div>
  );
}

function InputItem({ icon, placeholder, value, onChange, type = "text" }: any) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      <input
        required type={type} placeholder={placeholder} value={value}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
      />
    </div>
  );
}
