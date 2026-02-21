import { GoogleGenAI, Type } from "@google/genai";
import { ComparisonResult, UserGoal } from "../types";

export const compareNutritionLabels = async (
  base64ImageA: string,
  base64ImageB: string,
  userGoal: UserGoal
): Promise<ComparisonResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
  }

  // Validate inputs before sending
  if (!base64ImageA || base64ImageA.length < 100) {
    throw new Error("Imagem A inválida ou vazia. Tente escanear novamente.");
  }
  if (!base64ImageB || base64ImageB.length < 100) {
    throw new Error("Imagem B inválida ou vazia. Tente escanear novamente.");
  }

  console.log(`🤖 Gemini API call. ImageA: ${Math.round(base64ImageA.length / 1024)}KB, ImageB: ${Math.round(base64ImageB.length / 1024)}KB, Goal: ${userGoal}`);

  const ai = new GoogleGenAI({ apiKey });

  const goalPrompts: Record<UserGoal, string> = {
    weight_loss: "Foco total em perda de peso: priorize baixas calorias, alta saciedade (fibras/proteínas) e baixo açúcar/gordura.",
    muscle_gain: "Foco em ganho de massa muscular: priorize alto teor de proteína e qualidade dos carboidratos.",
    diabetes: "Foco em controle de diabetes: priorize baixo índice glicêmico (baixo açúcar, altas fibras) e baixos carboidratos simples.",
    low_carb: "Foco em dieta Low Carb/Cetogênica: priorize o mínimo de carboidratos líquidos e gorduras saudáveis.",
    vegan: "Foco em dieta Vegana: Verifique ingredientes. Priorize proteínas vegetais. Se algum tiver ingredientes animais, descarte-o ou alerte fortemente.",
    general: "Foco em saúde geral: equilíbrio de nutrientes, menos processados, menor sódio."
  };

  const specificPrompt = goalPrompts[userGoal];

  const prompt = `
    INSTRUÇÕES CRÍTICAS DE OCR E ANÁLISE:
    1. Analise as tabelas nutricionais do Produto A (primeira imagem) e Produto B (segunda imagem).
    2. CORREÇÃO DE ERROS: Corrija erros comuns de leitura (ex: 'g' lido como '9', 'O' como '0', vírgulas faltantes em decimais).
    3. NOMENCLATURA: Use o formato: "[Categoria do Alimento] (Opção 1)" para o Produto A e "[Categoria do Alimento] (Opção 2)" para o Produto B.
    4. COMPARAÇÃO: Baseie-se no objetivo: "${specificPrompt}".
    5. VERDITO: Seja direto. Explique por que a opção escolhida é melhor para o objetivo "${userGoal}".
    6. GOAL FIT: Use uma frase de impacto comparativa (ex: "Contém 40% menos sódio que a outra opção").

    Retorne os dados estritamente em JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64ImageA } },
        { text: "Tabela Nutricional do Produto A." },
        { inlineData: { mimeType: "image/jpeg", data: base64ImageB } },
        { text: "Tabela Nutricional do Produto B. " + prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productA: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              productName: { type: Type.STRING },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.STRING },
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fats: { type: Type.STRING },
                  fiber: { type: Type.STRING },
                  sodium: { type: Type.STRING },
                  sugar: { type: Type.STRING },
                },
              },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          productB: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              productName: { type: Type.STRING },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.STRING },
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fats: { type: Type.STRING },
                  fiber: { type: Type.STRING },
                  sodium: { type: Type.STRING },
                  sugar: { type: Type.STRING },
                },
              },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          winner: { type: Type.STRING, enum: ["A", "B", "Tie"] },
          verdict: { type: Type.STRING },
          goalFitReason: { type: Type.STRING },
          healthScoreA: { type: Type.INTEGER },
          healthScoreB: { type: Type.INTEGER },
        },
      },
    },
  });

  const jsonText = response.text;
  console.log("🤖 Gemini response received, length:", jsonText?.length);
  if (!jsonText) throw new Error("Sem resposta da IA");

  try {
    return JSON.parse(jsonText) as ComparisonResult;
  } catch (parseErr) {
    console.error("JSON parse error:", parseErr, "Raw text:", jsonText?.substring(0, 200));
    throw new Error("Resposta da IA em formato inválido.");
  }
};