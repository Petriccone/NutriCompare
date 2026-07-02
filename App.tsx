import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraCapture } from './components/CameraCapture';
import { Onboarding } from './components/Onboarding';
import { NutritionReview } from './components/NutritionReview';
import { ComparisonResultView } from './components/ComparisonResult';
import { History } from './components/History';
import { compare } from './services/scoring';
import {
  saveComparison,
  listHistory,
  deleteEntry,
  clearHistory,
} from './services/history';
import { extractProduct } from './services/extractionService';
import {
  ImageFile,
  ExtractedProduct,
  ComparisonResult,
  UserGoal,
  AppStep,
  HistoryEntry,
} from './types';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('ONBOARDING');
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null);
  const [extractedA, setExtractedA] = useState<ExtractedProduct | null>(null);
  const [extractedB, setExtractedB] = useState<ExtractedProduct | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history once on mount
  useEffect(() => {
    setHistory(listHistory());
  }, []);

  // Keep <html> class in sync with dark mode state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // ── Goal selection ──────────────────────────────────────────────────────────
  const handleGoalSelect = (goal: UserGoal) => {
    setUserGoal(goal);
    setStep('SCAN_A');
  };

  // ── Image capture + extraction (A) ─────────────────────────────────────────
  const handleCaptureA = async (img: ImageFile) => {
    setIsExtracting(true);
    setError(null);
    try {
      const product = await extractProduct(img);
      // Revoke the blob URL once extraction is done — new flow never displays it
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
      setExtractedA(product);
      setStep('REVIEW_A');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao analisar a imagem. Tente novamente.';
      setError(msg);
      // Remain on SCAN_A so the camera remounts for a retry
      setStep('SCAN_A');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Image capture + extraction (B) ─────────────────────────────────────────
  const handleCaptureB = async (img: ImageFile) => {
    setIsExtracting(true);
    setError(null);
    try {
      const product = await extractProduct(img);
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
      setExtractedB(product);
      setStep('REVIEW_B');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao analisar a imagem. Tente novamente.';
      setError(msg);
      setStep('SCAN_B');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── NutritionReview callbacks ───────────────────────────────────────────────
  const handleConfirmA = (edited: ExtractedProduct) => {
    setExtractedA(edited);
    setStep('SCAN_B');
  };

  const handleConfirmB = (edited: ExtractedProduct) => {
    if (!userGoal || !extractedA) return;
    // Synchronous deterministic comparison — no network call
    const r = compare(userGoal, extractedA, edited);
    saveComparison(r);
    setResult(r);
    setHistory(listHistory());
    setStep('RESULT');
  };

  const handleRetakeA = () => setStep('SCAN_A');
  const handleRetakeB = () => setStep('SCAN_B');

  // ── Result / reset ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setExtractedA(null);
    setExtractedB(null);
    setResult(null);
    setError(null);
    setStep('SCAN_A');
  };

  // ── Goal change ─────────────────────────────────────────────────────────────
  const handleChangeGoal = () => {
    setUserGoal(null);
    setExtractedA(null);
    setExtractedB(null);
    setResult(null);
    setError(null);
    setStep('ONBOARDING');
  };

  // ── History ─────────────────────────────────────────────────────────────────
  const handleOpenHistory = () => setStep('HISTORY');

  const handleHistoryOpen = (entry: HistoryEntry) => {
    setResult(entry.result);
    setStep('RESULT');
  };

  const handleHistoryDelete = (id: string) => {
    deleteEntry(id);
    setHistory(listHistory());
  };

  const handleHistoryClear = () => {
    clearHistory();
    setHistory([]);
  };

  // Go back to RESULT if we got there via history, otherwise to SCAN_A
  const handleHistoryBack = () => {
    setStep(result ? 'RESULT' : 'SCAN_A');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white transition-colors duration-300 overflow-x-hidden">
      <Header
        goal={userGoal}
        isDark={isDarkMode}
        onToggleTheme={() => setIsDarkMode(d => !d)}
        onChangeGoal={handleChangeGoal}
        onOpenHistory={handleOpenHistory}
      />

      <main className="h-full">
        {/* ONBOARDING */}
        {step === 'ONBOARDING' && (
          <Onboarding onSelect={handleGoalSelect} currentGoal={userGoal} />
        )}

        {/* SCAN_A / SCAN_B — unmount camera during extraction to free the stream */}
        {(step === 'SCAN_A' || step === 'SCAN_B') && !isExtracting && (
          <CameraCapture
            key={step}
            label={
              step === 'SCAN_A'
                ? 'Escaneie a tabela do 1º produto'
                : 'Escaneie a tabela do 2º produto'
            }
            onCapture={step === 'SCAN_A' ? handleCaptureA : handleCaptureB}
          />
        )}

        {/* Extraction loading overlay */}
        {isExtracting && (
          <div className="fixed inset-0 bg-white dark:bg-gray-950 z-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-lg font-bold font-mono text-gray-900 dark:text-white">
              ANALISANDO RÓTULO...
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Isso pode levar alguns segundos
            </p>
          </div>
        )}

        {/* REVIEW_A */}
        {step === 'REVIEW_A' && extractedA && userGoal && (
          <NutritionReview
            product={extractedA}
            label="Produto 1 de 2"
            goal={userGoal}
            onConfirm={handleConfirmA}
            onRetake={handleRetakeA}
          />
        )}

        {/* REVIEW_B */}
        {step === 'REVIEW_B' && extractedB && userGoal && (
          <NutritionReview
            product={extractedB}
            label="Produto 2 de 2"
            goal={userGoal}
            onConfirm={handleConfirmB}
            onRetake={handleRetakeB}
          />
        )}

        {/* RESULT */}
        {step === 'RESULT' && result && (
          <ComparisonResultView
            result={result}
            onReset={handleReset}
            onOpenHistory={handleOpenHistory}
          />
        )}

        {/* HISTORY */}
        {step === 'HISTORY' && (
          <History
            entries={history}
            onOpen={handleHistoryOpen}
            onDelete={handleHistoryDelete}
            onClear={handleHistoryClear}
            onBack={handleHistoryBack}
          />
        )}
      </main>

      {/* Non-blocking error toast */}
      {error && (
        <div className="fixed bottom-10 left-4 right-4 bg-red-900/90 border border-red-500 text-white p-4 rounded-xl flex items-center gap-3 shadow-2xl z-50">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="flex-1 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Fechar erro"
            className="ml-2 font-bold text-red-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
