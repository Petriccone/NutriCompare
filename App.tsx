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

// ── DEV-ONLY: Mock result for visual preview at #preview-result ─────────────
const PREVIEW_MOCK: ComparisonResult = {
  goal: 'vegan',
  productA: {
    productName: 'Proteína Vegetal Mix',
    category: 'Suplemento',
    per100g: {
      calories: 380, protein: 72, carbs: 14, sugar: 4,
      fats: 5, saturatedFats: 1, fiber: 6, sodium: 320,
    },
    netCarbs: 8,
    ingredients: ['proteína de ervilha', 'proteína de arroz', 'cacau em pó', 'estévia'],
    isAnimalFree: true,
  },
  productB: {
    productName: 'Whey Protein Clássico',
    category: 'Suplemento',
    per100g: {
      calories: 385, protein: 78, carbs: 8, sugar: 3,
      fats: 4, saturatedFats: 2, fiber: 2, sodium: 280,
    },
    netCarbs: 6,
    ingredients: ['concentrado de proteína do soro do leite', 'cacau em pó', 'sucralose'],
    isAnimalFree: false,
  },
  scoreA: {
    total: 81,
    disqualified: false,
    lines: [
      { key: 'protein',       label: 'Proteínas',        value: 72, unit: 'g',    points: 25, maxPoints: 30, note: 'excelente' },
      { key: 'fiber',         label: 'Fibras',            value: 6,  unit: 'g',    points: 20, maxPoints: 20 },
      { key: 'sugar',         label: 'Açúcares',          value: 4,  unit: 'g',    points: 18, maxPoints: 20 },
      { key: 'saturatedFats', label: 'Gord. saturadas',   value: 1,  unit: 'g',    points: 18, maxPoints: 30 },
    ],
  },
  scoreB: {
    total: 0,
    disqualified: true,
    disqualifyReason: 'Contém ingrediente de origem animal (soro do leite)',
    lines: [],
  },
  winner: 'A',
  verdict: 'Proteína Vegetal Mix vence por padrão: o Whey Protein foi desclassificado por conter soro do leite, ingrediente de origem animal, incompatível com o objetivo vegano. A opção vegetal entrega 72g de proteína por 100g com 6g de fibras e apenas 4g de açúcar.',
  keyReason: 'Whey desclassificado — proteína 100% vegetal vence!',
  createdAt: Date.now() - 86400000,
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('ONBOARDING');
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null);
  const [extractedA, setExtractedA] = useState<ExtractedProduct | null>(null);
  const [extractedB, setExtractedB] = useState<ExtractedProduct | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history once on mount
  useEffect(() => {
    setHistory(listHistory());
  }, []);

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

  // DEV-ONLY: visual preview of ComparisonResult without camera/API
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.hash === '#preview-result') {
    return <ComparisonResultView result={PREVIEW_MOCK} onReset={() => {}} onOpenHistory={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200 overflow-x-hidden">
      <Header
        goal={userGoal}
        onHome={handleChangeGoal}
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
          <div className="fixed inset-0 bg-[var(--bg)] z-50 flex flex-col items-center justify-center p-4">
            <div className="nc-box-sm bg-[#C6F833] p-6 mb-6 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#000] animate-spin" />
            </div>
            <h2 className="font-display text-2xl font-black text-[var(--ink)] tracking-tight">
              ANALISANDO RÓTULO...
            </h2>
            <p className="text-sm font-mono text-[var(--ink)] opacity-60 mt-2 text-center">
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
        <div className="fixed bottom-10 left-4 right-4 nc-box bg-[#FF5A47] p-4 flex items-center gap-3 z-50">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#000]" aria-hidden />
          <span className="flex-1 text-sm font-mono font-bold text-[#000]">{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Fechar erro"
            className="ml-2 font-mono font-bold text-[#000] hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
