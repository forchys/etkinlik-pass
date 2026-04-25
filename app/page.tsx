"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import RegistrationForm from './components/RegistrationForm';
import SeatMap from './components/SeatMap';
import TicketView from './components/TicketView';
import NewRegistration from './components/NewRegistration'; // Yeni bileşeni import etmeyi unutmayın
import { UserPlus, Search, ArrowLeft } from 'lucide-react';

export default function Home() {
  const [adSoyad, setAdSoyad] = useState("");
  const [telefon, setTelefon] = useState("");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(0); // 0: Menu, 1: Yeni Kayıt, 2: Koltuk, 3: Bilet, 4: Sorgulama
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
        setStep(prev => (prev === 4 ? 0 : prev - 1));
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
        setStep(0);
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
      const { data: slots } = await supabase.from('etkinlik_ayarlari').select('*').order('slot_id', { ascending: true });
      if (slots) setEventSlots(slots);
      setLoading(false);
    };
    fetchInitialData();
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

  const handleSuccess = async (user: any) => {
    setCurrentUserData(user);
    setUserDisplayName(user.ad_soyad);
    // Kayıt sonrası otomatik koltuk seçimine veya bilete yönlendir
    if (user.koltuk_no || selectedEvent?.has_seating === false) {
      await handleBiletVerisiniGuncelle(user);
    } else {
      setStep(2);
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
        .maybeSingle();

      if (supabaseError || !data) {
        setError("Kayıt bulunamadı veya henüz onaylanmadı.");
        return; 
      } 
      
      setCurrentUserData(data);
      setUserDisplayName(data.ad_soyad);
      
      if (data.koltuk_no || selectedEvent.has_seating === false) { 
        await handleBiletVerisiniGuncelle(data); 
      } else {
        const { data: seats } = await supabase.from('katilimcilar').select('koltuk_no').eq('etkinlik_id', selectedEvent.id).not('koltuk_no', 'is', null);
        setOccupiedSeats(seats?.map(p => p.koltuk_no) || []);
        setStep(2);
      }
    } catch (err) { 
      setError("Bağlantı hatası oluştu."); 
    } finally {
      setLoading(false); 
    }
  };

  const handleSeatConfirm = async () => {
    if (!selectedSeat) return;
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('katilimcilar')
        .update({ koltuk_no: selectedSeat })
        .eq('id', currentUserData.id);

      if (updateError) {
        setError("Koltuk seçilemedi, lütfen tekrar deneyin.");
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
          <h1 className="text-3xl font-black tracking-tighter text-white">FLICK BILET</h1>
        </div>
      </header>

      <div className="w-full max-w-lg relative z-10">
        <div className="relative bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          
          <div className="relative z-10">
            {/* STEP 0: SEÇİM MENÜSÜ */}
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                <button onClick={() => setStep(1)} className="w-full bg-blue-600 hover:bg-blue-500 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95 group">
                  <UserPlus size={32} />
                  <div className="text-center">
                    <span className="block font-bold text-lg uppercase">Yeni Kayıt</span>
                    <span className="text-[10px] text-blue-200/60 uppercase font-bold">Sıfırdan Kayıt Ol</span>
                  </div>
                </button>
                <button onClick={() => setStep(4)} className="w-full bg-white/5 border border-white/10 hover:bg-white/10 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95 group">
                  <Search size={32} />
                  <div className="text-center">
                    <span className="block font-bold text-lg uppercase">Biletimi Bul</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Zaten Kayıtlıyım</span>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 1: YENİ KAYIT FORMU */}
            {step === 1 && (
              <div className="space-y-4">
                <NewRegistration onSuccess={handleSuccess} />
                <button onClick={() => setStep(0)} className="w-full text-slate-500 text-xs font-bold uppercase flex items-center justify-center gap-2 py-2"><ArrowLeft size={14}/> Geri Dön</button>
              </div>
            )}

            {/* STEP 4: BİLET SORGULAMA (ESKİ REGISTRATION FORM) */}
            {step === 4 && (
              <div className="space-y-4">
                <RegistrationForm 
                  step={1} setStep={setStep} eventSlots={eventSlots} loading={loading}
                  selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent}
                  adSoyad={adSoyad} setAdSoyad={setAdSoyad} telefon={telefon} setTelefon={setTelefon}
                  handleSubmit={handleSubmit} error={error}
                />
                <button onClick={() => setStep(0)} className="w-full text-slate-500 text-xs font-bold uppercase flex items-center justify-center gap-2 py-2"><ArrowLeft size={14}/> Geri Dön</button>
              </div>
            )}

            {/* STEP 2: KOLTUK HARİTASI */}
            {step === 2 && (
              <SeatMap timeLeft={timeLeft} occupiedSeats={occupiedSeats} selectedSeat={selectedSeat} setSelectedSeat={setSelectedSeat} handleSeatConfirm={handleSeatConfirm} loading={loading} setStep={setStep} setError={setError} />
            )}

            {/* STEP 3: BİLET GÖRÜNÜMÜ */}
            {step === 3 && (
              <TicketView userDisplayName={userDisplayName} selectedSeat={selectedSeat} qrValue={qrValue} indirPDF={indirPDF} />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .view-transition { animation: flickerFadeIn 0.4s forwards; }
        @keyframes flickerFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-scroll-left { animation: scroll-left 40s linear infinite; }
        .animate-scroll-right { animation: scroll-right 40s linear infinite; }
      `}</style>
    </main>
  );
}
