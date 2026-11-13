
import { useCallback, useRef } from 'react';

export const useSound = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioCtxRef.current = new AudioContextClass();
            }
        }
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume().catch(err => console.warn("Audio resume failed", err));
        }
    }, []);

    const playNotification = useCallback(() => {
        try {
            initAudioContext();
            const audioCtx = audioCtxRef.current;
            
            if (!audioCtx) return;

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Efeito "Ding-Dong" (Campainha)
            const now = audioCtx.currentTime;

            // Primeiro tom (Ding) - Mais agudo
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, now);
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);

            // Controle de volume e duração
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

            oscillator.start(now);
            oscillator.stop(now + 1.5);

        } catch (e) {
            console.error("Falha ao tocar som via código:", e);
        }
    }, [initAudioContext]);

    return { playNotification, initAudioContext };
};
