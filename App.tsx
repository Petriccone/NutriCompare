import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CameraCapture } from './components/CameraCapture';
import { ComparisonResultView } from './components/ComparisonResult';
import { Onboarding } from './components/Onboarding';
import { compareNutritionLabels } from './services/geminiService';
import { ImageFile, ComparisonResult, UserGoal, AppStep } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('ONBOARDING');
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null);
  const [imageA, setImageA] = useState<ImageFile | null>(null);
  const [imageB, setImageB] = useState<ImageFile | null>(null);
  const imageARef = useRef<ImageFile | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleGoalSelect = (goal: UserGoal) => {
    setUserGoal(goal);
    setStep('SCAN_A');
  };

  const handleCaptureA = (img: ImageFile) => {
    setImageA(img);
    imageARef.current = img;
    setStep('SCAN_B');
  };

  const handleCaptureB = async (img: ImageFile) => {
    setImageB(img);
    setStep('ANALYZING');

    // Trigger analysis immediately after second capture
    try {
      if (!imageARef.current || !userGoal) throw new Error("Missing data");
      const data = await compareNutritionLabels(imageARef.current.base64, img.base64, userGoal);
      setResult(data);
      setStep('RESULT');
    } catch (err) {
      console.error(err);
      setError("Falha na análise. Tente novamente.");
      setStep('SCAN_A'); // Reset to start if fail
      setImageA(null);
      setImageB(null);
    }
  };

  const reset = () => {
    setImageA(null);
    setImageB(null);
    imageARef.current = null;
    setResult(null);
    setError(null);
    setStep('SCAN_A');
  };

  const changeGoal = () => {
    setUserGoal(null);
    reset();
    setStep('ONBOARDING');
  };

  // Render Logic based on Step
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white transition-colors duration-300 overflow-x-hidden">
      <Header userGoal={userGoal || undefined} onChangeGoal={changeGoal} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

      <main className="h-full">
        {step === 'ONBOARDING' && (
          <Onboarding onSelectGoal={handleGoalSelect} />
        )}

        {step === 'SCAN_A' && (
          <CameraCapture
            key="scan-a"
            label="Escaneie a tabela nutricional do 1º produto"
            onCapture={handleCaptureA}
          />
        )}

        {step === 'SCAN_B' && (
          <CameraCapture
            key="scan-b"
            label="Agora escaneie o 2º produto"
            onCapture={handleCaptureB}
          />
        )}

        {step === 'ANALYZING' && (
          <div className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col items-center justify-center p-4">
            <div className="relative">
              <div className="w-24 h-24 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
              <div className="w-16 h-16 border-b-4 border-purple-500 rounded-full animate-spin absolute top-4 left-4 direction-reverse"></div>
            </div>
            <h2 className="mt-8 text-2xl font-bold font-mono text-gray-900 dark:text-white animate-pulse">PROCESSANDO DADOS...</h2>
            <p className="text-gray-500 mt-2 font-mono text-sm">A IA está comparando as tabelas nutricionais</p>
          </div>
        )}

        {step === 'RESULT' && result && userGoal && (
          <ComparisonResultView result={result} userGoal={userGoal} onReset={reset} />
        )}

        {error && (
          <div className="fixed bottom-10 left-4 right-4 bg-red-900/90 border border-red-500 text-white p-4 rounded-xl flex items-center gap-3 shadow-2xl z-50">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto font-bold">X</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;