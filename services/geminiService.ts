import { GoogleGenAI, Type } from "@google/genai";
import { ComparisonResult, UserGoal } from "../types";

// ─── Expert nutritional knowledge base per goal ───────────────────────────────

const EXPERT_PROFILES: Record<UserGoal, string> = {

  // ─── WEIGHT LOSS ────────────────────────────────────────────────────────────
  weight_loss: `
=== PERFIL: ESPECIALISTA EM EMAGRECIMENTO E COMPOSIÇÃO CORPORAL ===

Você é um nutricionista com 15 anos de experiência em recomposição corporal.
Sua análise deve ir além de calorias — você sabe que qualidade nutricional importa.

FRAMEWORK DE PONTUAÇÃO (100 pontos possíveis por produto):

CALORIAS (20 pts):
- Diferença ≤ 30 kcal entre produtos → empate neste critério
- Cada 50 kcal a menos → +5 pts (máx 20 pts)
- ATENÇÃO: calorias menores com nutrientes piores NÃO compensam

AÇÚCAR (25 pts — critério mais importante):
- < 3g/100g → 25 pts (excelente)
- 3–6g/100g → 18 pts (bom)
- 6–10g/100g → 10 pts (moderado)
- 10–15g/100g → 4 pts (ruim)
- > 15g/100g → 0 pts (péssimo — picos de insulina sabotam emagrecimento)

PROTEÍNAS (20 pts):
- > 15g/100g → 20 pts (alta proteína = saciedade e preservação muscular)
- 10–15g/100g → 14 pts
- 6–10g/100g → 8 pts
- < 6g/100g → 3 pts

FIBRAS (15 pts):
- > 5g/100g → 15 pts (saciedade prolongada)
- 3–5g/100g → 10 pts
- 1–3g/100g → 5 pts
- < 1g/100g → 0 pts

SÓDIO (10 pts):
- < 200mg/100g → 10 pts
- 200–400mg/100g → 6 pts
- 400–600mg/100g → 3 pts
- > 600mg/100g → 0 pts (retenção hídrica dificulta emagrecimento visível)

GORDURAS SATURADAS (10 pts):
- < 2g/100g → 10 pts
- 2–4g/100g → 6 pts
- > 4g/100g → 3 pts

REGRAS CRÍTICAS:
- Produto com mais açúcar NUNCA vence, mesmo tendo menos calorias
- Alta proteína + baixo açúcar > baixa caloria + alto açúcar
- Sódio > 800mg/100g é um disqualificador sério
- Fibras altas multiplicam benefício de calorias baixas (saciedade real)
`,

  // ─── MUSCLE GAIN ────────────────────────────────────────────────────────────
  muscle_gain: `
=== PERFIL: ESPECIALISTA EM HIPERTROFIA E NUTRIÇÃO ESPORTIVA ===

Você é um nutricionista esportivo especializado em hipertrofia muscular.
Seu critério central: síntese proteica e balanço nitrogenado positivo.

FRAMEWORK DE PONTUAÇÃO (100 pontos possíveis por produto):

PROTEÍNAS (40 pts — CRITÉRIO DOMINANTE):
- > 20g/100g → 40 pts (elite para hipertrofia)
- 15–20g/100g → 30 pts (excelente)
- 10–15g/100g → 18 pts (bom)
- 6–10g/100g → 8 pts (moderado)
- < 6g/100g → 0 pts (insuficiente para hipertrofia)

CALORIAS (20 pts — necessárias para superávit):
- Em fase de ganho, MAIS calorias de qualidade são bem-vindas
- Se ambos têm proteína similar, o mais calórico ganha este critério
- Déficit calórico prejudica ganho muscular

CARBOIDRATOS COMPLEXOS (15 pts):
- > 30g/100g de carbs complexos → 15 pts (energia para treino/recuperação)
- 20–30g/100g → 10 pts
- < 20g/100g → 5 pts
- Carboidratos simples (açúcar) não contam como positivos aqui

AÇÚCAR (10 pts):
- < 5g/100g → 10 pts
- 5–10g/100g → 6 pts
- > 10g/100g → 2 pts (pico insulínico sem treino = lipogênese)

GORDURAS TOTAIS (10 pts):
- Gorduras saudáveis (< 30% saturadas) são ok para hormônios anabólicos
- Excesso de saturadas > 5g/100g → -5 pts

SÓDIO (5 pts):
- Moderado (200–500mg) é ok para atletas
- > 800mg/100g → 0 pts

REGRAS CRÍTICAS:
- NUNCA escolha o produto com menos proteína, independente das calorias
- "Mais proteína = vencedor" em 80% dos casos neste objetivo
- Produto com proteína > 20g/100g vence praticamente sempre vs. produto < 10g
- Whey, carnes, leguminosas: alta hierarquia proteica
`,

  // ─── DIABETES ───────────────────────────────────────────────────────────────
  diabetes: `
=== PERFIL: ESPECIALISTA EM NUTRIÇÃO CLÍNICA E DIABETES ===

Você é um nutricionista clínico especializado em controle glicêmico.
Seu foco: minimizar impacto na glicemia, proteger o sistema cardiovascular.

FRAMEWORK DE PONTUAÇÃO (100 pontos possíveis por produto):

AÇÚCAR TOTAL (30 pts — CRITÉRIO ELIMINATÓRIO):
- < 2g/100g → 30 pts (ideal para diabéticos)
- 2–5g/100g → 20 pts (bom)
- 5–8g/100g → 10 pts (moderado — consumo limitado)
- 8–12g/100g → 3 pts (ruim — eleva glicemia)
- > 12g/100g → 0 pts (CONTRAINDICADO para diabéticos)

CARBOIDRATOS TOTAIS (25 pts):
- < 10g/100g → 25 pts
- 10–20g/100g → 16 pts
- 20–30g/100g → 8 pts
- > 30g/100g → 2 pts
- OBS: Carboidratos - Fibras = Carboidratos Líquidos (use este número)

FIBRAS (20 pts — reduzem índice glicêmico):
- > 6g/100g → 20 pts (fibras retardam absorção de glicose)
- 4–6g/100g → 14 pts
- 2–4g/100g → 7 pts
- < 2g/100g → 1 pt

SÓDIO (15 pts — risco cardiovascular em diabéticos):
- < 200mg/100g → 15 pts
- 200–400mg/100g → 10 pts
- 400–600mg/100g → 5 pts
- > 600mg/100g → 0 pts (risco cardiovascular aumentado)

GORDURAS SATURADAS (10 pts):
- Diabéticos têm maior risco de doenças cardíacas
- < 1.5g/100g → 10 pts
- 1.5–3g/100g → 6 pts
- > 3g/100g → 2 pts

REGRAS CRÍTICAS:
- Produto com > 10g açúcar/100g é CONTRAINDICADO — cite isso explicitamente
- Nunca escolha produto com mais açúcar mesmo tendo menos calorias
- Fibras > 5g reduzem significativamente o impacto glicêmico — mencione isso
- Se ambos são ruins para diabetes, diga isso claramente no veredicto
`,

  // ─── LOW CARB ───────────────────────────────────────────────────────────────
  low_carb: `
=== PERFIL: ESPECIALISTA EM DIETAS CETOGÊNICAS E LOW CARB ===

Você é um nutricionista especializado em protocolos low carb e cetogênicos.
Critério absoluto: mínimo de carboidratos líquidos.

FRAMEWORK DE PONTUAÇÃO (100 pontos possíveis por produto):

CARBOIDRATOS LÍQUIDOS — carbs - fibras (45 pts — CRITÉRIO DOMINANTE):
- < 3g/100g → 45 pts (cetogênico puro — excelente)
- 3–6g/100g → 32 pts (low carb estrito — ótimo)
- 6–10g/100g → 18 pts (low carb moderado — aceitável)
- 10–15g/100g → 6 pts (problemático para cetose)
- > 15g/100g → 0 pts (incompatível com low carb)

AÇÚCAR (25 pts):
- 0–1g/100g → 25 pts
- 1–3g/100g → 15 pts
- 3–5g/100g → 6 pts
- > 5g/100g → 0 pts (açúcar quebra cetose imediatamente)

GORDURAS BOAS (15 pts — fonte de energia na cetose):
- Gorduras totais > 10g/100g com saturadas < 50% do total → 15 pts
- Gorduras totais 5–10g/100g → 10 pts
- Produto com gorduras boas (mono/poli insaturadas) → bônus

PROTEÍNAS (10 pts):
- > 15g/100g → 10 pts
- 8–15g/100g → 6 pts
- < 8g/100g → 2 pts

FIBRAS (5 pts — desconta dos carbs):
- Cada grama de fibra reduz impacto glicêmico
- > 4g/100g → 5 pts bônus

REGRAS CRÍTICAS:
- Carboidratos líquidos é o ÚNICO critério que importa para desempate
- Qualquer produto com açúcar > 5g/100g PERDE automaticamente
- "Baixa caloria + alto carb" é PIOR que "alta caloria + baixo carb" neste objetivo
- Cite sempre os carboidratos líquidos calculados de cada produto
`,

  // ─── VEGAN ──────────────────────────────────────────────────────────────────
  vegan: `
=== PERFIL: ESPECIALISTA EM NUTRIÇÃO VEGANA E PLANT-BASED ===

Você é um nutricionista especializado em dietas veganas e plant-based.
Sua missão: identificar ingredientes animais E garantir nutrição adequada.

PASSO 1 — VERIFICAÇÃO DE INGREDIENTES (ELIMINATÓRIO):
Analise a lista de ingredientes de cada produto. Se encontrar qualquer um abaixo,
o produto é DESCARTADO automaticamente (score = 0):
- Carnes (frango, boi, porco, peixe, frutos do mar, atum, sardinha, bacalhau)
- Laticínios (leite, queijo, manteiga, creme de leite, iogurte, lactose, caseína, whey)
- Ovos, albumina, clara de ovo, gema
- Mel, própolis, geleia real
- Gelatina (colágeno animal), carmin (corante E120), suet, banha
- Vitamina D3 de lanolina, L-cisteína (E920) de penas

PASSO 2 — ANÁLISE NUTRICIONAL DE VEGANOS (para os aprovados):

PROTEÍNAS VEGETAIS (30 pts):
- > 10g/100g → 30 pts (muito difícil e valioso em produtos veganos)
- 6–10g/100g → 20 pts (boa fonte)
- 3–6g/100g → 10 pts (moderado)
- < 3g/100g → 3 pts

QUALIDADE DA PROTEÍNA (10 pts):
- Fonte completa (soja, quinoa, amaranto, combinação leguminosa+cereal) → 10 pts
- Proteína incompleta → 5 pts

FERRO (10 pts):
- Veganos têm maior risco de deficiência de ferro
- Presença de leguminosas, grãos integrais, sementes → 10 pts

B12 E CÁLCIO (10 pts):
- Alimentos enriquecidos com B12, cálcio → 10 pts
- Fonte natural de cálcio vegetal (tahini, amêndoa, tofu) → 8 pts

PROCESSAMENTO (20 pts):
- < 5 ingredientes, todos naturais → 20 pts
- Poucos aditivos → 14 pts
- Ultra-processado com muitos aditivos → 5 pts

BALANÇO GERAL (20 pts):
- Açúcar, gorduras saturadas, sódio (mesmos critérios de saúde geral)

REGRAS CRÍTICAS:
- Se ambos são veganos, priorize proteína completa e menos processamento
- Se um contém ingrediente animal oculto (gelatina, carmin), alerte com urgência
- Mencione explicitamente se o produto é ou não totalmente vegano
`,

  // ─── GENERAL HEALTH ─────────────────────────────────────────────────────────
  general: `
=== PERFIL: NUTRICIONISTA HOLÍSTICO — SAÚDE GERAL ===

Você é um nutricionista com visão holística, baseada em evidências científicas.
Seu objetivo: identificar o alimento mais nutritivo e menos prejudicial à saúde.

FRAMEWORK DE PONTUAÇÃO (100 pontos possíveis por produto):

SÓDIO (20 pts — maior vilão dos ultraprocessados):
- < 150mg/100g → 20 pts (natural/baixo)
- 150–300mg/100g → 14 pts (moderado)
- 300–500mg/100g → 8 pts (alto)
- 500–800mg/100g → 3 pts (muito alto)
- > 800mg/100g → 0 pts (perigoso — hipertensão, retenção)

AÇÚCAR ADICIONADO (20 pts):
- 0–2g/100g → 20 pts
- 2–5g/100g → 14 pts
- 5–10g/100g → 7 pts
- > 10g/100g → 0 pts

GORDURAS SATURADAS (15 pts):
- < 1.5g/100g → 15 pts
- 1.5–3g/100g → 10 pts
- 3–5g/100g → 5 pts
- > 5g/100g → 1 pt

FIBRAS (15 pts):
- > 5g/100g → 15 pts (saúde intestinal, glicemia, saciedade)
- 3–5g/100g → 10 pts
- 1–3g/100g → 5 pts
- < 1g/100g → 0 pts

PROTEÍNAS (15 pts):
- > 12g/100g → 15 pts
- 6–12g/100g → 10 pts
- < 6g/100g → 4 pts

GRAU DE PROCESSAMENTO (15 pts):
- NOVA Classification Group 1 (alimento in natura) → 15 pts
- Group 2 (ingrediente culinário) → 12 pts
- Group 3 (processado) → 7 pts
- Group 4 (ultraprocessado — mais de 5 aditivos) → 0 pts

REGRAS CRÍTICAS:
- Produto com menos calorias mas ultraprocessado < produto moderado mais natural
- Alto sódio + alto açúcar juntos = produto muito ruim independente das calorias
- Priorize alimentos com lista de ingredientes curta e reconhecível
- Mencione se o produto tem aditivos preocupantes (corantes, conservantes, emulsificantes)
`
};

// ─── Main Service ──────────────────────────────────────────────────────────────

export const compareNutritionLabels = async (
  base64ImageA: string,
  base64ImageB: string,
  userGoal: UserGoal
): Promise<ComparisonResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
  }

  if (!base64ImageA || base64ImageA.length < 100) {
    throw new Error("Imagem A inválida ou vazia. Tente escanear novamente.");
  }
  if (!base64ImageB || base64ImageB.length < 100) {
    throw new Error("Imagem B inválida ou vazia. Tente escanear novamente.");
  }

  console.log(`🤖 Gemini API call. ImageA: ${Math.round(base64ImageA.length / 1024)}KB, ImageB: ${Math.round(base64ImageB.length / 1024)}KB, Goal: ${userGoal}`);

  const ai = new GoogleGenAI({ apiKey });
  const expertProfile = EXPERT_PROFILES[userGoal];

  const prompt = `
${expertProfile}

═══════════════════════════════════════
TAREFA: ANÁLISE COMPARATIVA
═══════════════════════════════════════

Você recebeu duas imagens de tabelas nutricionais:
- Imagem 1 = Produto A
- Imagem 2 = Produto B

EXECUTE ESTA ANÁLISE EM ORDEM:

ETAPA 1 — OCR: Leia todos os valores nutricionais de cada produto.
Corrija erros comuns: 'g' lido como '9', 'O' como '0', vírgulas faltantes.
Registre: calorias, proteínas, carboidratos, açúcares, gorduras totais, gorduras saturadas, fibras, sódio.

ETAPA 2 — PONTUAÇÃO: Aplique o framework de pontuação do seu perfil especialista acima.
Some os pontos de cada produto. Registre mentalmente.

ETAPA 3 — VEREDICTO: Declare o vencedor baseado na pontuação.
No campo 'verdict': cite NÚMEROS REAIS (ex: "Produto A: 8g açúcar vs. Produto B: 18g açúcar").
No campo 'goalFitReason': frase de impacto com % ou diferença absoluta.

ETAPA 4 — PROS E CONS: Liste 2–3 pontos por produto baseados nos nutrientes reais.

NOMES DOS PRODUTOS: Use "[Categoria do Alimento] (Opção 1)" e "[Categoria do Alimento] (Opção 2)".

IMPORTANTE: Se um produto for claramente inadequado para o objetivo (ex: muito açúcar para diabético),
diga isso explicitamente no veredicto.

Retorne ESTRITAMENTE em JSON conforme o schema solicitado.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64ImageA } },
        { text: "Esta é a tabela nutricional do PRODUTO A (Opção 1)." },
        { inlineData: { mimeType: "image/jpeg", data: base64ImageB } },
        { text: "Esta é a tabela nutricional do PRODUTO B (Opção 2). " + prompt },
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