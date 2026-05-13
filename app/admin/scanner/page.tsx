"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAdmin } from '../layout';
import { CheckCircle2, XCircle, AlertCircle, Camera, Loader2 } from 'lucide-react';

export default function ScannerPage() {
  const { participants, setParticipants, selectedSlotId, isAuthenticated } = useAdmin();
  const [scanStatus, setScanStatus] = useState<{status: 'idle' | 'success' | 'error' | 'warning', message: string}>({ status: 'idle', message: '' });
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const safeStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Scanner durdurulamadı:", err);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const startCamera = async () => {
      try {
        setIsInitializing(true);
        await safeStopScanner();

        const html5QrCode = new Html5Qrcode("reader", { 
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false 
        });
        scannerRef.current = html5QrCode;

        // Kamera Seçimi Optimizasyonu (iPhone 0.5x lensini önlemek için)
        const devices = await Html5Qrcode.getCameras();
        let cameraId = { facingMode: "environment" };

        if (devices && devices.length > 0) {
          // Genellikle dizideki son kamera ana (main) kameradır. 
          // 0.5x lensi genellikle listenin başında veya ortasındadır.
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          cameraId = backCamera ? { deviceId: devices[devices.length - 1].id } : { facingMode: "environment" };
        }

        await html5QrCode.start(
          cameraId, 
          { 
            fps: 24, // Daha akıcı tarama için FPS artırıldı
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
            // Native tarama desteği varsa kullan (hızı inanılmaz artırır)
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          },
          async (decodedText) => {
            if (scanStatus.status !== 'idle') return;

            const cleanCode = decodedText.trim();
            // Başarı hissi için hafif bir titreşim (Mobil destekliyorsa)
            if (window.navigator.vibrate) window.navigator.vibrate(100);

            const { data: user, error } = await supabase.from('katilimcilar')
              .select('*')
              .eq('qr_kodu', cleanCode)
              .eq('etkinlik_id', selectedSlotId)
              .maybeSingle();
            
            if (error || !user) {
              setScanStatus({ status: 'error', message: 'Geçersiz QR Kod!' });
            } else if (user.geldi_mi) {
              setScanStatus({ status: 'warning', message: `${user.ad_soyad} Zaten İçeride!` });
            } else {
              const { error: updateError } = await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', user.id);
              if (!updateError) {
                setParticipants((prev: any[]) => prev.map(p => p.id === user.id ? { ...p, geldi_mi: true } : p));
                setScanStatus({ status: 'success', message: `${user.ad_soyad} Giriş Yaptı!` });
              }
            }
            
            // 2 saniye bekle ve normale dön
            setTimeout(() => setScanStatus({ status: 'idle', message: '' }), 2000);
          }, 
          () => {} // Tarama hatası (QR bulunamadığında sessiz kal)
        );
        setIsInitializing(false);
      } catch (err) {
        console.error("Kamera başlatılamadı:", err);
        setIsInitializing(false);
      }
    };

    startCamera();
    return () => { safeStopScanner(); };
  }, [isAuthenticated, selectedSlotId]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Scanner Container */}
      <div className={`relative aspect-square rounded-[3rem] overflow-hidden border-[6px] transition-all duration-500 shadow-2xl ${
        scanStatus.status === 'success' ? 'border-emerald-500 shadow-emerald-500/20' : 
        scanStatus.status === 'error' ? 'border-rose-500 shadow-rose-500/20' : 
        scanStatus.status === 'warning' ? 'border-amber-500 shadow-amber-500/20' : 
        'border-white/10'
      }`}>
        
        {/* HTML5 QrCode Reader Div */}
        <div id="reader" className="w-full h-full object-cover"></div>

        {/* Tarama Çizgisi Animasyonu (Sadece idle durumunda) */}
        {scanStatus.status === 'idle' && !isInitializing && (
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-500/50 shadow-[0_0_15px_blue] animate-scan-line z-10"></div>
        )}

        {/* Yükleniyor Durumu */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 z-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kamera Hazırlanıyor...</p>
          </div>
        )}

        {/* Sonuç Overlay - UI İyileştirmesi */}
        {scanStatus.message && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md z-30 animate-in fade-in zoom-in duration-300 ${
            scanStatus.status === 'success' ? 'bg-emerald-950/80' : 
            scanStatus.status === 'error' ? 'bg-rose-950/80' : 
            'bg-amber-950/80'
          }`}>
            {scanStatus.status === 'success' && <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />}
            {scanStatus.status === 'error' && <XCircle className="w-20 h-20 text-rose-400 mb-4" />}
            {scanStatus.status === 'warning' && <AlertCircle className="w-20 h-20 text-amber-400 mb-4" />}
            
            <p className="text-2xl font-black text-white uppercase leading-tight">
              {scanStatus.message}
            </p>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">İçeride</span>
          <span className="text-4xl font-black text-white">{participants.filter((p: any) => p.geldi_mi).length}</span>
        </div>
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Kalan</span>
          <span className="text-4xl font-black text-white">{participants.filter((p: any) => !p.geldi_mi && p.onayli_mi === true).length}</span>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em]">
        <Camera className="inline-block w-3 h-3 mr-2 mb-0.5" />
        Otomatik Netleme Aktif
      </p>

      {/* Tarama Çizgisi İçin Tailwind CSS Animasyonu */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          position: absolute;
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
