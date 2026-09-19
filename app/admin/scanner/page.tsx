"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAdmin } from '../layout';
import { CheckCircle2, XCircle, AlertCircle, Camera, Loader2 } from 'lucide-react';

export default function ScannerPage() {
  const { participants, setParticipants, selectedSlotId, isAuthenticated } = useAdmin();
  const [scanStatus, setScanStatus] = useState<{status: 'idle' | 'processing' | 'success' | 'error' | 'warning', message: string}>({ status: 'idle', message: '' });
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanStatusRef = useRef(scanStatus.status);

  // Status durumunu ref'te tutarak useEffect re-render döngüsünü kırıyoruz
  useEffect(() => {
    scanStatusRef.current = scanStatus.status;
  }, [scanStatus.status]);

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

        // Config ayarları
        const scanConfig: any = {
          fps: 24,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        // iOS Safari için en kararlı kamerayı seçme
        let cameraConfig: any = { facingMode: "environment" };

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            // Ultra Wide (0.5x) lensleri eleyip ana arka kamerayı seçme
            const mainCamera = devices.find(d => {
              const lbl = d.label.toLowerCase();
              return (lbl.includes('back') || lbl.includes('arka') || lbl.includes('rear')) &&
                     !lbl.includes('ultra') && !lbl.includes('0.5') && !lbl.includes('wide-angle');
            });

            if (mainCamera) {
              cameraConfig = mainCamera.id;
            } else if (devices.length > 1) {
              // Genellikle sondan bir önceki ana kameradır
              cameraConfig = devices[devices.length - 2].id;
            } else {
              cameraConfig = devices[0].id;
            }
          }
        } catch (e) {
          console.warn("Kamera listesi alınamadı, facingMode kullanılacak:", e);
        }

        await html5QrCode.start(
          cameraConfig,
          scanConfig,
          async (decodedText) => {
            if (scanStatusRef.current !== 'idle') return;
            
            setScanStatus({ status: 'processing', message: 'Kontrol Ediliyor...' });

            const cleanCode = decodedText.trim();
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
            
            setTimeout(() => setScanStatus({ status: 'idle', message: '' }), 2000);
          }, 
          () => {}
        );
        setIsInitializing(false);
      } catch (err) {
        console.error("Kamera başlatılamadı:", err);
        setIsInitializing(false);
      }
    };

    startCamera();
    return () => { safeStopScanner(); };
  }, [isAuthenticated, selectedSlotId]); // scanStatus.status buradan çıkarıldı (kilitlenmeyi çözer)

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Scanner Container */}
      <div className={`relative aspect-square rounded-[3rem] overflow-hidden border-[6px] transition-all duration-500 shadow-2xl ${
        scanStatus.status === 'success' ? 'border-emerald-500 shadow-emerald-500/20' : 
        scanStatus.status === 'error' ? 'border-rose-500 shadow-rose-500/20' : 
        scanStatus.status === 'warning' ? 'border-amber-500 shadow-amber-500/20' : 
        scanStatus.status === 'processing' ? 'border-blue-500 shadow-blue-500/20' : 
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
            scanStatus.status === 'processing' ? 'bg-blue-950/80' :
            'bg-amber-950/80'
          }`}>
            {scanStatus.status === 'success' && <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />}
            {scanStatus.status === 'error' && <XCircle className="w-20 h-20 text-rose-400 mb-4" />}
            {scanStatus.status === 'warning' && <AlertCircle className="w-20 h-20 text-amber-400 mb-4" />}
            {scanStatus.status === 'processing' && <Loader2 className="w-20 h-20 text-blue-400 mb-4 animate-spin" />}
            
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

      {/* Tarama Çizgisi İçin Tailwind CSS Animasyonu ve HTML5-QRCode CSS Overflow Düzeltmesi */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          position: absolute;
          animation: scan 2s linear infinite;
        }
        #reader video {
          object-fit: cover !important;
          border-radius: inherit !important;
        }
      `}</style>
    </div>
  );
}
