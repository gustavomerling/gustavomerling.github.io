import { useEffect, useState } from 'react';
import { audio } from '../services';

interface Props {
  onDone: () => void;
}

/** Splash: credit card -> title card -> "press any key". Any key or click skips ahead. */
export function IntroScreen({ onDone }: Props) {
  const [step, setStep] = useState<'credit' | 'title'>('credit');

  useEffect(() => {
    const t = window.setTimeout(() => setStep('title'), 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const advance = () => {
      audio.unlock();
      if (step === 'credit') setStep('title');
      else onDone();
    };
    window.addEventListener('keydown', advance);
    window.addEventListener('mousedown', advance);
    return () => {
      window.removeEventListener('keydown', advance);
      window.removeEventListener('mousedown', advance);
    };
  }, [step, onDone]);

  return (
    <div className="screen intro">
      {step === 'credit' ? (
        <p key="credit" className="intro-credit fade-in-out">
          um jogo de gustavo merling
        </p>
      ) : (
        <div key="title" className="intro-title fade-in">
          <h1 className="logo">LASANHA</h1>
          <p className="tagline">alguém comeu a lasanha errada.</p>
          <p className="press-any blink">pressione qualquer tecla</p>
        </div>
      )}
    </div>
  );
}
