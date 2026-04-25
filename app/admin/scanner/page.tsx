"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAdmin } from '../layout';

export default function ScannerPage() {
  const { participants, setParticipants, selectedSlotId, isAuthenticated } = useAdmin();
  const [scanStatus, setScanStatus] = useState<{status: 'idle' | 'success' | 'error' | 'warning', message: string}>({ status: 'idle', message: '' });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const safeStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try { await scannerRef.current.stop(); scannerRef.current = null; } catch (err) {}
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const startCamera = async () => {
      try {
        await safeStopScanner();
        const html5QrCode = new Html5Qrcode("reader", { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], verbose: false });
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            const cleanCode = decodedText.trim();
            if (scanStatus.status !== 'idle') return;
            const { data: user } = await supabase.from('katilimcilar')
              .select('*')
              .eq('qr_kodu', cleanCode)
              .eq('etkinlik_id', selectedSlotId)
              .maybeSingle();
            
            if (!user) { setScanStatus({ status: 'error', message: 'Geçersiz veya Yanlış Etkinlik!' }); }
            else if (user.geldi_mi) { setScanStatus({ status: 'warning', message: 'Zaten Girdi!' }); }
            else {
              await supabase.from('katilimcilar').update({ geldi_mi: true }).eq('id', user.id);
              setParticipants((prev: any[]) => prev.map(p => p.id === user.id ? { ...p, geldi_mi: true } : p));
              setScanStatus({ status: 'success', message: `${user.ad_soyad} girdi!` });
            }
            setTimeout(() => setScanStatus({ status: 'idle', message: '' }), 2000);
          }, () => {}
        );
      } catch (err) {}
    };
    startCamera();
    
    return () => { safeStopScanner(); };
  }, [isAuthenticated, selectedSlotId]);

  return (
    <div className="space-y-6">
      <div className={`relative border-[4px] rounded-[2.5rem] overflow-hidden min-h-[300px] ${scanStatus.status === 'success' ? 'border-emerald-500' : scanStatus.status === 'error' ? 'border-rose-500' : scanStatus.status === 'warning' ? 'border-amber-500' : 'border-white/10'}`}>
        <div id="reader" className="w-full aspect-square bg-black"></div>
        {scanStatus.message && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
             <div className="text-center animate-in zoom-in duration-300">
                <p className={`text-xl font-black uppercase ${scanStatus.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>{scanStatus.message}</p>
             </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] text-center"><p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">İçeride</p><p className="text-4xl font-black text-emerald-400">{participants.filter((p: any) => p.geldi_mi).length}</p></div>
        <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem] text-center"><p className="text-[10px] text-blue-500 font-bold uppercase mb-1">Beklenen</p><p className="text-4xl font-black text-blue-400">{participants.filter((p: any) => !p.geldi_mi).length}</p></div>
      </div>
    </div>
  );
}
