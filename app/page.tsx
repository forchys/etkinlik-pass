"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import RegistrationForm from './components/RegistrationForm';
import SeatMap from './components/SeatMap';
import TicketView from './components/TicketView';
import NewRegistration from './components/NewRegistration';
import { UserPlus, Info, ArrowLeft } from 'lucide-react';

export default function Home() {
  const [adSoyad, setAdSoyad] = useState("");
  const [telefon, setTelefon] = useState("");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(0); 
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventSlots, setEventSlots] = useState<any[]>([]);

  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    window.history.pushState({ step }, `Step ${step}`);
    const handlePopState = () => {
      if (step > 0) {
        setStep(prev => prev - 1);
        setError(""); 
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step]);

  useEffect(() => {
    if (step !== 2) {
      localStorage.removeItem('flick_timer');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const savedTimer = localStorage.getItem('flick_timer');
    const expiry = savedTimer ? parseInt(savedTimer) : now + 60;
    
    if (!savedTimer) localStorage.setItem('flick_timer', expiry.toString());

    const updateTimer = () => {
      const remaining = expiry - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('flick_timer');
        setError("İşlem süreniz dolduğu için başa dönüldü.");
        setStep(1);
        setTimeLeft(60);
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: slots } = await supabase
        .from('etkinlik_ayarlari')
        .select('*')
        .order('is_active', { ascending: false })
        .order('slot_id', { ascending: true });
      
      if (slots) setEventSlots(slots);
      setLoading(false);
    };
    
    fetchInitialData();

    const settingsChannel = supabase
      .channel('realtime_event_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etkinlik_ayarlari' }, fetchInitialData)
      .subscribe();

    const seatsChannel = supabase
      .channel('realtime_seats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'katilimcilar' }, async () => {
        if (!selectedEvent) return;
        const { data } = await supabase
          .from('katilimcilar')
          .select('koltuk_no')
          .eq('etkinlik_id', selectedEvent.id)
          .not('koltuk_no', 'is', null);
        setOccupiedSeats(data?.map(p => p.koltuk_no) || []);
      }).subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(seatsChannel);
    };
  }, [selectedEvent]);

  const handleBiletVerisiniGuncelle = async (user: any) => {
    const { data, error: updateError } = await supabase
      .from('katilimcilar')
      .update({ bilet_alindi_mi: true })
      .eq('id', user.id)
      .select('qr_kodu, koltuk_no')
      .single();
      
    if (!updateError && data) {
      setQrValue(data.qr_kodu);
      setSelectedSeat(data.koltuk_no);
      setStep(3);
    } else {
      setError("Bilet bilgileri güncellenirken hata oluştu.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const temizAd = adSoyad.trim();
      const temizTel = telefon.replace(/\D/g, "");

      if (!selectedEvent?.id) {
        setError("Lütfen önce bir etkinlik seçin.");
        setLoading(false);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from('katilimcilar')
        .select('*')
        .ilike('ad_soyad', temizAd)
        .eq('telefon', temizTel)
        .eq('etkinlik_id', Number(selectedEvent.id))
        .maybeSingle();

      if (supabaseError) throw supabaseError;

      if (!data) {
        setError(`${selectedEvent.event_name || 'Bu etkinlik'} için kayıt bulunamadı. Lütfen bilgilerinizi kontrol edin.`);
        return; 
      } 

      if (data.onayli_mi === false) {
        setError("Kaydınız sisteme ulaştı ancak henüz onaylanmadı. Lütfen onay bekleyin.");
        return;
      }
      
      setCurrentUserData(data);
      setUserDisplayName(data.ad_soyad);
      
      if (data.koltuk_no || selectedEvent.has_seating === false) { 
        await handleBiletVerisiniGuncelle(data); 
      } else {
        const { data: allParticipants } = await supabase
          .from('katilimcilar')
          .select('koltuk_no')
          .eq('etkinlik_id', selectedEvent.id)
          .not('koltuk_no', 'is', null);
        setOccupiedSeats(allParticipants?.map(p => p.koltuk_no) || []);
        setStep(2);
      }
    } catch (err) { 
      setError("Bağlantı hatası oluştu."); 
      console.error(err);
    } finally {
      setLoading(false); 
    }
  };

  const handleSeatConfirm = async () => {
    if (!selectedSeat) return;
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from('katilimcilar')
        .update({ koltuk_no: selectedSeat })
        .eq('id', currentUserData.id)
        .eq('etkinlik_id', selectedEvent.id);

      if (updateError) {
        if (updateError.code === '23505') {
          setError("Maalesef bu koltuk az önce başkası tarafından seçildi.");
          const { data } = await supabase.from('katilimcilar').select('koltuk_no').eq('etkinlik_id', selectedEvent.id).not('koltuk_no', 'is', null);
          setOccupiedSeats(data?.map(p => p.koltuk_no) || []);
        } else { 
          setError("Koltuk rezerve edilemedi."); 
        }
      } else { 
        await handleBiletVerisiniGuncelle(currentUserData); 
      }
    } finally {
      setLoading(false);
    }
  };

  const indirPDF = async () => {
    const { jsPDF } = await import("jspdf"); 
    const doc = new jsPDF();
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const qrImage = canvas.toDataURL("image/png");
    
    doc.setFillColor(254, 240, 138); doc.rect(0, 0, 210, 297, 'F');
    doc.setDrawColor(30, 27, 75); doc.setLineWidth(1.5); doc.roundedRect(20, 30, 170, 240, 10, 10, 'S');
    
    doc.setTextColor(30, 27, 75); doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.text("FLICK BILET", 105, 55, { align: "center" });
    
    doc.setFillColor(255, 255, 255); doc.roundedRect(40, 70, 130, 45, 5, 5, 'FD');
    doc.setTextColor(30, 27, 75); doc.setFontSize(22); doc.text(userDisplayName.toUpperCase(), 105, 88, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(100, 100, 100); doc.text("KOLTUK NO:", 105, 96, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(16, 185, 129); doc.text(selectedSeat || "---", 105, 106, { align: "center" });
    
    doc.setFillColor(255, 255, 255); doc.roundedRect(65, 130, 80, 80, 5, 5, 'FD');
    doc.addImage(qrImage, 'PNG', 70, 135, 70, 70);
    
    doc.setTextColor(30, 27, 75); doc.setFontSize(11); doc.text(selectedEvent?.event_name || "", 105, 245, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(`${selectedEvent?.event_date}  •  ${selectedEvent?.event_location}`, 105, 255, { align: "center" });
    
    doc.save(`${userDisplayName}_Flick_Bilet.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#e2e8f0] text-[#1e1b4b] p-4 md:p-8 flex flex-col items-center justify-start font-sans overflow-x-hidden relative select-none">
      
      {/* ==================== MEMPHIS ARKA PLAN AMORF MATERYALLERİ ==================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 1. Sol Üst Yamuk Üçgen (Mavi & Yeşil Dalga) */}
        <div className="absolute -top-5 -left-24 w-44 h-40 bg-[repeating-radial-gradient(circle_at_10%_20%,#2563eb_0,#2563eb_8px,#22c55e_8px,#22c55e_16px,#2563eb_16px,#2563eb_24px)] -rotate-18 opacity-90 [clip-path:path('M_20_15_Q_10_10_25_25_L_140_40_Q_155_45_140_60_L_65_125_Q_50_135_45_115_Z')] filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />
        
        {/* 2. Sağ Üst Blob (Mavi & Mor Izgara) */}
        <div className="absolute -top-16 -right-20 w-44 h-36 bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_10px,#7c3aed_10px,#7c3aed_20px)] rotate-22 rounded-[43%_57%_71%_29%/34%_52%_48%_66%] opacity-90 filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />

        {/* 3. Sağ Orta Yamuk Üçgen (Mor & Sarı Zikzak) */}
        <div className="absolute top-[38%] -right-24 w-44 h-40 bg-[repeating-linear-gradient(135deg,#6d28d9_0px,#6d28d9_8px,#facc15_8px,#facc15_16px,#6d28d9_16px,#6d28d9_24px)] rotate-38 opacity-90 [clip-path:path('M_40_15_Q_30_5_45_15_L_145_70_Q_155_80_140_90_L_20_135_Q_5_145_10_125_Z')] filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />

        {/* 4. Sol Orta Blob (Mor & Sarı Şerit) */}
        <div className="absolute top-[32%] -left-20 w-40 h-32 bg-[repeating-linear-gradient(-60deg,#7c3aed,#7c3aed_8px,#fbbf24_8px,#fbbf24_16px)] -rotate-38 rounded-[67%_33%_41%_59%/61%_38%_62%_39%] opacity-90 filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />

        {/* 5. Sol Alt Yamuk Üçgen (Mor & Turuncu Dalga) */}
        <div className="absolute -bottom-16 -left-20 w-48 h-36 bg-[repeating-radial-gradient(circle_at_80%_80%,#7c3aed_0,#7c3aed_10px,#f97316_10px,#f97316_20px)] -rotate-28 opacity-90 [clip-path:path('M_15_40_Q_5_30_25_25_L_150_10_Q_165_5_150_20_L_75_115_Q_60_130_55_110_Z')] filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />

        {/* 6. Sağ Alt Blob (Mavi & Yeşil Şerit) */}
        <div className="absolute -bottom-16 -right-20 w-44 h-36 bg-[repeating-linear-gradient(90deg,#2563eb,#2563eb_10px,#10b981_10px,#10b981_20px)] -rotate-14 rounded-[38%_62%_35%_65%/53%_31%_69%_47%] opacity-90 filter drop-shadow-[4px_8px_8px_rgba(0,0,0,0.22)]" />

        {/* 7. UÇUŞAN MEMPHIS POP-ART SÜSLEMELERİ */}
        <span className="absolute top-3 left-3 text-[#facc15] font-black text-3xl rotate-12 drop-shadow-[2px_3px_0px_#1e1b4b]">✦</span>
        <span className="absolute top-9 left-11 text-[#8b5cf6] font-normal text-sm -rotate-12">✧</span>
        <span className="absolute top-2 right-4 text-[#ec4899] font-black text-3xl rotate-25 drop-shadow-[2px_2px_0px_#1e1b4b]">✚</span>
        <span className="absolute top-12 right-14 text-[#06b6d4] font-black text-base -rotate-15">✖</span>
        <span className="absolute top-[25%] right-3 text-[#f97316] font-black text-xl rotate-35">∿∿</span>
        <span className="absolute top-[50%] left-8 text-[#10b981] font-normal text-sm rotate-15">◆</span>
        <span className="absolute top-[48%] right-3 text-[#facc15] font-black text-2xl -rotate-20 drop-shadow-[2px_2px_0px_#1e1b4b]">✦</span>
        <span className="absolute top-[56%] right-9 text-[#ec4899] font-normal text-sm rotate-8">★</span>
        <span className="absolute bottom-[32%] left-3 text-[#6d28d9] font-black text-xl rotate-12">✚</span>
        <span className="absolute bottom-9 right-3 text-[#f97316] font-black text-3xl -rotate-15 drop-shadow-[2px_3px_0px_#1e1b4b]">✦</span>
        <span className="absolute bottom-16 right-12 text-[#facc15] font-normal text-base">✧</span>
        <span className="absolute bottom-20 left-3 text-[#10b981] font-black text-2xl rotate-40">✚</span>
        <span className="absolute bottom-11 left-10 text-[#ef4444] font-normal text-sm -rotate-25">◆</span>
        <span className="absolute bottom-4 left-6 text-[#7c3aed] font-black text-lg -rotate-10">∿</span>
      </div>

      {/* HEADER: MEMPHIS BAŞLIK (KATMANLI 3D ETIKETLER) */}
      <header className="w-full max-w-2xl py-6 mb-2 text-center z-10">
        <div className="relative inline-block rotate-[-2.5deg] mb-2">
          {/* Çift Vurgu Pembe Alt Gölge */}
          <div className="absolute top-[7px] left-[7px] right-[-7px] bottom-[-7px] bg-[#ec4899] rounded-2xl border-[3.5px] border-[#1e1b4b] -z-10" />
          
          <div className="bg-[#10b981] border-[3.5px] border-[#1e1b4b] px-8 py-3 rounded-2xl shadow-[4px_5px_0px_#1e1b4b]">
            <h1 className="text-3xl md:text-4xl font-[#950] tracking-[4.5px] text-white uppercase drop-shadow-[2px_2.5px_0px_#047857] leading-none">
              FLICK BİLET
            </h1>
          </div>
        </div>

        {/* Üst Üste Binen (Overlapping) Alt Başlık Etiketi */}
        <div className="-mt-3 relative z-20">
          <div className="inline-block bg-[#fef08a] border-[2.5px] border-[#1e1b4b] px-5 py-1.5 rounded-lg rotate-2 shadow-[3.5px_3.5px_0px_#1e1b4b]">
            <span className="text-[#1e1b4b] font-[#950] text-xs md:text-sm uppercase tracking-[2.2px]">
              ANKARA MEDİPOL SİNEMA VE TİYATRO TOPLULUĞU
            </span>
          </div>
        </div>
      </header>

      {/* KART GÖVDESİ (SEMPATİK NOKTALI / NOKTASIZ DOKULU NOKTA DESENLİ MEMPHIS KUTUSU) */}
      <div className="w-full max-w-lg relative z-10 my-auto">
        <div className="relative bg-white border-[3.5px] border-[#1e1b4b] p-6 md:p-8 rounded-[28px] shadow-[0_30px_60px_-12px_rgba(15,23,42,0.18),5px_6px_0px_#1e1b4b] bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:13px_13px] overflow-visible">
          
          {/* Sol Üst Şeffaf Koli Bandı Çıkartması */}
          <div className="absolute -top-3 left-6 w-14 h-4 bg-amber-300/80 border border-amber-700/50 -rotate-9 shadow-sm z-20 pointer-events-none" />
          
          <div className="relative z-10">
            {(step === 0 || step === 1) && (
              <div className="space-y-6">
                <RegistrationForm 
                  step={step}
                  setStep={setStep}
                  eventSlots={eventSlots}
                  loading={loading}
                  selectedEvent={selectedEvent}
                  setSelectedEvent={setSelectedEvent}
                  adSoyad={adSoyad}
                  setAdSoyad={setAdSoyad}
                  telefon={telefon}
                  setTelefon={setTelefon}
                  handleSubmit={handleSubmit}
                  error={error}
                />
                
                {step === 1 && (
                  <div className="pt-6 border-t-2 border-dashed border-[#64748b] text-center">
                    <p className="text-[11px] text-slate-600 mb-3 uppercase font-black tracking-wider">Henüz Kayıt Yapmadınız mı?</p>
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase border-2 border-[#1e1b4b] shadow-[4px_4px_0px_#1e1b4b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                    >
                      <UserPlus size={18} /> Yeni Kayıt Oluştur
                    </button>
                    <button 
                      onClick={() => setStep(0)} 
                      className="mt-4 w-full text-slate-600 text-[11px] font-black uppercase hover:text-[#1e1b4b] transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={14} /> Etkinlik Listesine Dön
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <NewRegistration selectedEventId={selectedEvent?.id} whatsappLink={selectedEvent?.whatsapp_link} onSuccess={() => setStep(5)} />
                <button onClick={() => setStep(1)} className="w-full text-slate-600 text-[11px] font-black uppercase py-2 hover:text-[#1e1b4b] transition-colors">Vazgeç ve Geri Dön</button>
              </div>
            )}

            {step === 5 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#10b981] border-2 border-[#1e1b4b] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#1e1b4b]">
                  <Info className="text-white" size={32} />
                </div>
                <h2 className="text-xl font-black uppercase text-[#1e1b4b] mb-2 tracking-tight">Başvuru Alındı 🚀</h2>
                <p className="text-slate-700 text-xs font-bold leading-relaxed px-2 uppercase">
                  Kaydınız yöneticilerimiz tarafından onaylandıktan sonra biletinizi buradan alabileceksiniz.
                </p>
                <button 
                  onClick={() => { setStep(0); setAdSoyad(""); setTelefon(""); }} 
                  className="mt-6 w-full bg-[#facc15] text-[#1e1b4b] border-2 border-[#1e1b4b] font-black py-3.5 rounded-xl uppercase text-xs tracking-wider shadow-[4px_4px_0px_#1e1b4b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  Ana Menüye Dön
                </button>
              </div>
            )}

            {step === 2 && (
              <SeatMap 
                timeLeft={timeLeft}
                occupiedSeats={occupiedSeats}
                selectedSeat={selectedSeat}
                setSelectedSeat={setSelectedSeat}
                handleSeatConfirm={handleSeatConfirm}
                loading={loading}
                setStep={setStep}
                setError={setError}
                seatLayout={eventSlots.find(s => s.slot_id === selectedEvent?.slot_id)?.seat_layout || []}
              />
            )}

            {/* STEP 3: GERÇEKÇİ YIRTILMIŞ KAĞIT, 3D ZIMBA TELİ VE WINDOWS XP MOUSE CURSOR BİLET EKRANI */}
            {step === 3 && (
              <div className="relative my-4 rotate-[1.2deg]">
                {/* 3D Metalik Zımba Teli */}
                <div className="absolute -top-[7px] right-7 w-[22px] h-[6px] bg-gradient-to-b from-[#f1f5f9] via-[#94a3b8] to-[#475569] border border-[#1e293b] rounded-sm shadow-[0_3px_4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] z-30 -rotate-6">
                  <div className="absolute top-[1px] -left-[3px] w-[2px] h-[4px] bg-[#0f172a] rounded-[1px]" />
                  <div className="absolute top-[1px] -right-[3px] w-[2px] h-[4px] bg-[#0f172a] rounded-[1px]" />
                </div>

                {/* Sol Üst Kağıt Bant */}
                <div className="absolute -top-[14px] left-[18px] w-[65px] h-[20px] bg-[#fef08a]/75 border border-amber-700/40 -rotate-12 shadow-sm z-20" />

                {/* Yırtık Kağıt Gövdesi */}
                <div className="bg-[#fef08a] p-6 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.22),5px_6px_0px_#1e1b4b] border-l-2 border-r-2 border-[#1e1b4b] bg-[radial-gradient(rgba(161,98,7,0.2)_1.2px,transparent_1.2px)] [background-size:8px_8px] relative min-h-[140px] flex flex-col items-center justify-center">
                  
                  {/* Üst Tırtık */}
                  <div className="absolute -top-[9px] -left-[2px] -right-[2px] h-[9px] bg-[linear-gradient(-45deg,transparent_5px,#fef08a_0),linear-gradient(45deg,transparent_5px,#fef08a_0)] [background-size:10px_10px] filter drop-shadow-[0_-2px_1px_rgba(0,0,0,0.12)]" />

                  {/* Kırmızı Etiket Bant */}
                  <div className="absolute -top-[16px] -left-[8px] bg-[#ef4444] text-white px-3.5 py-1 text-[10.5px] font-[950] -rotate-3 rounded-md tracking-widest shadow-[2.5px_2.5px_0px_#1e1b4b] border-[1.8px] border-[#1e1b4b] z-30 whitespace-nowrap uppercase">
                    BİLETİNİZ HAZIR
                  </div>

                  {/* Bilet ve QR Bileşeni */}
                  <TicketView 
                    userDisplayName={userDisplayName}
                    selectedSeat={selectedSeat}
                    qrValue={qrValue}
                    indirPDF={indirPDF}
                  />

                  {/* Alt Tırtık */}
                  <div className="absolute -bottom-[9px] -left-[2px] -right-[2px] h-[9px] bg-[linear-gradient(-45deg,#fef08a_5px,transparent_0),linear-gradient(45deg,#fef08a_5px,transparent_0)] [background-size:10px_10px] filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]" />

                  {/* SAĞ ALT KÖŞE: WINDOWS XP MOUSE CURSOR (52px) */}
                  <div className="absolute -bottom-[22px] -right-[16px] z-40 -rotate-4 filter drop-shadow-[3px_4px_0px_#1e1b4b]">
                    <svg width="52" height="52" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M 4 2 V 26 L 10.5 19.5 L 14.5 28 L 18.5 26 L 14.5 17.5 L 22 17.5 Z" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER: KOLLAJ KULÜP İMZASI (KART ROZETİ) */}
      <footer className="mt-8 z-10 text-center">
        <div className="inline-block bg-[#f8fafc] border-2 border-[#1e1b4b] rounded-xl px-5 py-2.5 shadow-[3px_3px_0px_#6d28d9] -rotate-1">
          <span className="text-xs font-[950] text-[#1e293b] uppercase tracking-wider leading-relaxed block">
            Ankara Medipol Üniversitesi<br />
            <span className="text-[#6d28d9] text-[13.5px] font-[950]">Sinema ve Tiyatro Topluluğu</span>
          </span>
        </div>
      </footer>

    </main>
  );
}
