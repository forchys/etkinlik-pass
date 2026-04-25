"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import RegistrationForm from './components/RegistrationForm';
import SeatMap from './components/SeatMap';
import TicketView from './components/TicketView';
import NewRegistration from './components/NewRegistration';
import { ArrowLeft, UserPlus, Info } from 'lucide-react';

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
        .order('slot_id', { ascending: true });
      if (slots) setEventSlots(slots);
      setLoading(false);
    };
    fetchInitialData();

    const settingsChannel = supabase
      .channel('realtime_event_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etkinlik_ayarlari' }, fetchInitialData)
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

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
      const { data, error: supabaseError } = await supabase
        .from('katilimcilar')
        .select('*')
        .ilike('ad_soyad', adSoyad.trim())
        .eq('telefon', telefon.trim())
        .eq('etkinlik_id', selectedEvent.id)
        .eq('onayli_mi', true) // Sadece admin onaylıları QR'a geçir
        .maybeSingle();

      if (supabaseError || !data) {
        setError("Onaylı kayıt bulunamadı. Lütfen bekleyin veya bilgilerinizi kontrol edin.");
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
    } catch (err) { setError("Bağlantı hatası oluştu."); } finally { setLoading(false); }
  };

  const handleSeatConfirm = async () => {
    if (!selectedSeat) return;
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from('katilimcilar')
        .update({ koltuk_no: selectedSeat })
        .eq('id', currentUserData.id);

      if (updateError) {
        setError("Koltuk rezerve edilemedi.");
      } else { 
        await handleBiletVerisiniGuncelle(currentUserData); 
      }
    } finally { setLoading(false); }
  };

  const indirPDF = async () => {
    const { jsPDF } = await import("jspdf"); 
    const doc = new jsPDF();
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const qrImage = canvas.toDataURL("image/png");
    doc.setFillColor(10, 15, 30); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.text("FLICK BILET", 105, 55, { align: "center" });
    doc.addImage(qrImage, 'PNG', 70, 135, 70, 70);
    doc.save(`${userDisplayName}_Flick_Bilet.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col items-center justify-start font-sans overflow-x-hidden relative">
      <header className="w-full max-w-2xl py-8 mb-4 text-center z-50">
        <div className="space-y-1">
          <h2 className="text-blue-500 font-bold text-[10px] tracking-[0.3em] uppercase italic">ANKARA MEDIPOL SINEMA VE TIYATRO TOPLULUGU</h2>
          <h1 className="text-3xl font-black tracking-tighter flex items-center justify-center gap-2 text-white">
            FLICK <span className="text-white">BILET</span>
          </h1>
        </div>
      </header>

      <div className="w-full max-w-lg relative z-10">
        <div className="relative bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="relative z-10">
            {/* STEP 0: ETKİNLİK SEÇİMİ (ILK EKRAN) */}
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <p className="text-center text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Lütfen Bir Etkinlik Seçin</p>
                {eventSlots.map((slot) => (
                  <button 
                    key={slot.id} 
                    onClick={() => { setSelectedEvent(slot); setStep(1); }}
                    className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all text-left flex justify-between items-center group"
                  >
                    <div>
                      <h3 className="font-bold text-lg uppercase text-white group-hover:text-blue-400 transition-colors">{slot.event_name}</h3>
                      <p className="text-xs text-slate-500">{slot.event_date}</p>
                    </div>
                    <ArrowLeft className="rotate-180 text-slate-600 group-hover:text-white transition-all" size={20} />
                  </button>
                ))}
              </div>
            )}

            {/* STEP 1: BİLGİ GİRİŞİ VEYA YENİ KAYIT BUTONU */}
            {step === 1 && (
              <div className="space-y-6">
                <RegistrationForm 
                  step={step} setStep={setStep} eventSlots={eventSlots} loading={loading}
                  selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent}
                  adSoyad={adSoyad} setAdSoyad={setAdSoyad} telefon={telefon} setTelefon={setTelefon}
                  handleSubmit={handleSubmit} error={error}
                />
                
                <div className="pt-6 border-t border-white/5">
                  <p className="text-center text-[10px] text-slate-500 mb-4 uppercase font-bold">Kaydınız yok mu?</p>
                  <button 
                    onClick={() => setStep(4)}
                    className="w-full bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-sm uppercase"
                  >
                    <UserPlus size={18} /> Yeni Kayıt Oluştur
                  </button>
                </div>
                
                <button onClick={() => setStep(0)} className="w-full text-slate-500 text-xs font-bold uppercase flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Etkinlik Listesine Dön
                </button>
              </div>
            )}

            {/* STEP 4: YENİ KAYIT FORMU (NEWREGISTRATION.TSX) */}
            {step === 4 && (
              <div className="space-y-4">
                <NewRegistration onSuccess={() => setStep(5)} />
                <button onClick={() => setStep(1)} className="w-full text-slate-500 text-xs font-bold uppercase py-2">Geri Dön</button>
              </div>
            )}

            {/* STEP 5: KAYIT BAŞARILI / ONAY MESAJI */}
            {step === 5 && (
              <div className="text-center space-y-6 py-8 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Info className="text-emerald-500" size={40} />
                </div>
                <h2 className="text-2xl font-bold uppercase italic text-white">Kaydınız Alındı</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Ödemeniz ve bilgileriniz onaylandıktan sonra biletinizi buradan alabileceksiniz. Lütfen daha sonra tekrar kontrol edin.
                </p>
                <button onClick={() => { setStep(0); setAdSoyad(""); setTelefon(""); }} className="w-full bg-white text-black font-bold py-4 rounded-2xl uppercase text-sm">Ana Menüye Dön</button>
              </div>
            )}

            {step === 2 && (
              <SeatMap timeLeft={timeLeft} occupiedSeats={occupiedSeats} selectedSeat={selectedSeat} setSelectedSeat={setSelectedSeat} handleSeatConfirm={handleSeatConfirm} loading={loading} setStep={setStep} setError={setError} />
            )}

            {step === 3 && (
              <TicketView userDisplayName={userDisplayName} selectedSeat={selectedSeat} qrValue={qrValue} indirPDF={indirPDF} />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .animate-scroll-left { animation: scroll-left 40s linear infinite; }
        .animate-scroll-right { animation: scroll-right 40s linear infinite; }
        .animate-super-slow-rotate { animation: rotate-slow 150s linear infinite; }
        @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
