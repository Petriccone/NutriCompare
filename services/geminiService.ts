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

  const goalRules: Record<UserGoal, string> = {
    weight_loss: `
      OBJETIVO: PERDA DE PESO
      PESOS DOS NUTRIENTES (do mais ao menos importante):
      1. Calorias totais (mais importante, mas NÃO é o único critério)
      2. Açúcares: alto açúcar = pior escolha mesmo com menos calorias
      3. Gorduras saturadas: menos = melhor
      4. Fibras: mais fibras = mais saciedade = melhor
      5. Proteínas: mais proteína = melhor (preserva massa muscular)
      6. Sódio: muito sódio causa retenção de líquidos, prejudica o emagrecimento
      REGRA CRÍTICA: Um produto com MENOS calorias mas MUITO MAIS açúcar/sódio NÃO é melhor. Faça uma análise balanceada de todos os nutrientes.`,
    muscle_gain: `
      OBJETIVO: GANHO DE MASSA MUSCULAR
      PESOS DOS NUTRIENTES (do mais ao menos importante):
      1. Proteínas: PRIORIDADE MÁXIMA. Mais proteína por 100g = melhor
      2. Carboidratos de qualidade: necessários para energia e recuperação muscular
      3. Calorias: mais calorias são bem-vindas para ganho de massa
      4. Gorduras: saudáveis são ok, saturadas em excesso são ruins
      5. Açúcares: simples demais sem treino = acúmulo de gordura
      REGRA CRÍTICA: Não escolha o produto com menos proteína só porque tem menos calorias. Mais calorias é DESEJÁVEL neste objetivo.`,
    diabetes: `
      OBJETIVO: CONTROLE DE DIABETES
      PESOS DOS NUTRIENTES (do mais ao menos importante):
      1. Açúcares: PRIORIDADE MÁXIMA. Menos açúcar = muito melhor
      2. Carboidratos totais: menos = melhor (impacto glicêmico)
      3. Fibras: mais fibras = menor índice glicêmico = muito melhor
      4. Sódio: diabéticos têm maior risco cardiovascular, sódio importa
      5. Gorduras saturadas: aumentam risco cardiovascular
      REGRA CRÍTICA: Nunca escolha um produto com MORE açúcar/carboidratos simples só porque tem menos calorias. O controle glicêmico é o critério principal.`,
    low_carb: `
      OBJETIVO: DIETA LOW CARB / CETOGÊNICA
      PESOS DOS NUTRIENTES (do mais ao menos importante):
      1. Carboidratos líquidos (carbs - fibras): PRIORIDADE MÁXIMA. Menos = muito melhor
      2. Açúcares: parte dos carbs, qualquer açúcar é terrível neste objetivo
      3. Gorduras: gorduras saudáveis são bem-vindas (energia na cetose)
      4. Proteínas: importantes para manutenção muscular
      5. Calorias: secundário, o foco é carboidratos
      REGRA CRÍTICA: Nunca escolha o produto com mais carboidratos/açúcar por ter menos calorias. Carboidratos baixos é o único critério prioritário.`,
    vegan: `
      OBJETIVO: DIETA VEGANA
      CRITÉRIOS (do mais ao menos importante):
      1. Ingredientes: verificar se contém carne, laticínios, ovos, mel, gelatina (ELIMINATÓRIO)
      2. Proteínas vegetais: mais proteína vegetal = melhor
      3. Vitaminas e minerais relevantes (B12, ferro, cálcio, zinco)
      4. Processamento: menos ingredientes artificiais = melhor
      5. Equilíbrio nutricional geral
      REGRA CRÍTICA: Se um produto contiver ingrediente animal, ele perde automaticamente independentemente dos valores nutricionais.`,
    general: `
      OBJETIVO: SAÚDE GERAL
      PESOS DOS NUTRIENTES (análise equilibrada):
      1. Sódio: muito sódio é o sinal de alerta mais comum em alimentos processados
      2. Açúcares: açúcar adicionado é prejudicial para a saúde geral
      3. Gorduras saturadas: menos = melhor
      4. Fibras: mais = melhor (saúde digestiva, glicemia)
      5. Proteínas: mais = melhor
      6. Calorias: considerar dentro do contexto, não como critério único
      REGRA CRÍTICA: Faça uma análise HOLÍSTICA. Um produto com menos calorias mas cheio de sódio, açúcar e gordura NÃO é saudável. Priorize alimentos menos processados.`
  };

  const specificRule = goalRules[userGoal];

  const prompt = `
    VOCÊ É UM NUTRICIONISTA ESPECIALISTA. Analise as tabelas nutricionais com rigor científico.

    ${specificRule}

    INSTRUÇÕES OBRIGATÓRIAS:
    1. Analise o Produto A (1ª imagem) e o Produto B (2ª imagem).
    2. LEIA TODOS OS NUTRIENTES com atenção. Não se concentre apenas em calorias.
    3. COMPARE cada nutriente individualmente antes de decidir o vencedor.
    4. JUSTIFIQUE a escolha citando os nutrientes que mais pesaram na decisão.
    5. Se um produto for claramente pior em nutrientes-chave do objetivo, mesmo tendo menos calorias, ele NÃO deve ganhar.
    6. No campo 'verdict': seja específico, cite os números (ex: "Produto A tem 8g de açúcar vs. 18g do B").
    7. No campo 'goalFitReason': dê uma frase de impacto com comparação numérica direta.
    8. CORREÇÃO DE ERROS OCR: Corrija 'g' lido como '9', 'O' como '0', vírgulas faltantes.
    9. Use no 'productName': "[Categoria] (Opção 1)" e "[Categoria] (Opção 2)".

    Retorne ESTRITAMENTE em JSON.
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