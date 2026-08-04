import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// API endpoint for hardware analysis chat & diagnostics
app.post("/api/chat", async (req, res) => {
  try {
    const { systemSpecs, message, history = [] } = req.body;
    const client = getGeminiClient();

    const gpusList = systemSpecs.gpus && systemSpecs.gpus.length > 0
      ? systemSpecs.gpus.map((g: any) => `- GPU Chip: ${g.name} (${g.vram} GB VRAM, Class: ${g.gpuClass}, Type: ${g.type}, ${g.isActive ? "Primary WebGL" : "Secondary"})`).join("\n")
      : `- GPU Model: ${systemSpecs.gpu || "None / Integrated"}\n- GPU VRAM: ${systemSpecs.vram || 0} GB`;

    // Create a rigorous system instruction matching the user's specific context
    const specsSummary = systemSpecs 
      ? `[User Hardware System Specifications]
- Operating System: ${systemSpecs.os || "Unknown"}
- CPU: ${systemSpecs.cpu || "Unknown"} (Cores: ${systemSpecs.cpuCores || "Unknown"})
- System RAM: ${systemSpecs.ram || "Unknown"} GB
${gpusList}
- CPU Class: ${systemSpecs.cpuClass || "Standard"}`
      : "No specifications entered yet.";

    const systemInstruction = `You are a warm, beginner-friendly local AI Setup Companion (LLMFit Assistant) designed for non-technical people.
Your task is to analyze the user's hardware specifications and explain in simple, encouraging, and easy-to-understand language if they can run AI models locally at home. Avoid complex technical jargon (like CUDA toolkit, tensor matrices, AVX2 compiles) unless explicitly asked, and explain concepts using everyday analogies (for example, comparing graphics cards/VRAM to the size of a kitchen table where the AI does its thinking, and system RAM to a nearby pantry).

Below are the user's current hardware specifications:
${specsSummary}

Rules for your responses:
1. Be encouraging, warm, and highly practical. Make local AI feel accessible to everyone!
2. Explain concepts simply:
   - **VRAM (Graphics Memory)**: Describe it as the AI's "immediate memory space." If a model fits here (Perfect Fit), it runs super fast because the AI has the model right on its desk.
   - **System RAM**: Like a nearby shelf. If the model is too big for VRAM, the AI can split its thoughts to System RAM (Good/Marginal Fit). It works but takes longer to read back and forth.
   - **Local AI Engines (Ollama/LM Studio)**: Compare them to clean offline music players, but for language models. Explain that they are very easy to install (just like installing any normal app like Spotify or Zoom), and once installed, you can run private AI models.
3. Recommend models simply: focus on user intent (e.g. "for a simple chatbot", "for writing help") instead of dry model name codes, and guide them in 2-3 simple steps on where to click or what to type.
4. Keep paragraphs short and friendly. Use bullet points and basic formatting to keep things clean. Avoid dry, sterile engineering reports.`;

    // System instruction is passed in config
    const response = await client.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [
        ...history.map((h: any) => ({
          role: h.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: h.content }],
        })),
        { role: "user" as const, parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI Advisor." });
  }
});

// API endpoint to analyze any custom model name dynamically
app.post("/api/analyze-model", async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName || !modelName.trim()) {
      return res.status(400).json({ error: "Please enter an AI model name." });
    }

    const client = getGeminiClient();
    
    const prompt = `Analyze the following AI model name that a user wants to check: "${modelName.trim()}"
Identify the characteristics of this model:
1. Estimate its true parameter size in Billions (e.g. 7, 8, 1.5, 32, 70, 14, 3, 9, 27). Return this as a decimal number (e.g. 8.0, 1.5). Default to 7.0 if completely unclear.
2. Identify the creator organization (e.g. Meta, Google, Microsoft, IBM, DeepSeek, Mistral, Alibaba, Cohere, Salesforce, AllenAI). Default to "Hugging Face" if unknown or obscure.
3. Recommend the best standard quantization precision bits for running locally on standard user hardware. Usually, 4-bit is the optimal standard. Let's return 4 for 4-bit, 8 for 8-bit, or 16 for unquantized.
4. Select the best category / useCase, which must be exactly one of: "General", "Reasoning", "Coding", "Lightweight".
5. Write a warm, encouraging, non-technical sentence in everyday English explaining what this model is best suited for and what makes it interesting. Keep it simple and free of jargon.
6. Provide the simplified Ollama run command identifier (e.g. "ollama run llama3:8b", "ollama run gemma2:9b", "ollama run deepseek-r1:1.5b", "ollama run qwen2.5:7b").

You MUST return the response strictly as a JSON object matching this schema:
{
  "name": "Properly formatted name (e.g. Gemma 2 9B)",
  "creator": "Name of Creator",
  "parameterSize": 8.0,
  "quantBits": 4,
  "useCase": "General",
  "explanation": "Brief easy-to-understand sentence.",
  "popularCommand": "ollama run command"
}
Do not wrap the JSON object inside markdown backticks or any other text. Return ONLY the raw JSON string.`;

    const response = await client.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const textResult = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(textResult);
    res.json(parsed);
  } catch (error: any) {
    console.error("Dynamic model analysis API Error:", error);
    
    // Fallback heuristic parsing in case of network issues or missing keys
    const rawName = req.body.modelName || "Custom Model";
    let estSize = 7.0;
    
    // Try to extract parameter size (e.g., 8B, 1.5b, 70B, 3B, 9b)
    const sizeMatch = rawName.match(/(\d+(?:\.\d+)?)\s*[Bb]/);
    if (sizeMatch) {
      estSize = parseFloat(sizeMatch[1]);
    } else {
      // Heuristic fallback words
      if (rawName.toLowerCase().includes("mini") || rawName.toLowerCase().includes("small")) {
        estSize = 3.0;
      } else if (rawName.toLowerCase().includes("large") || rawName.toLowerCase().includes("70")) {
        estSize = 70.0;
      }
    }

    let creator = "Hugging Face";
    if (rawName.toLowerCase().includes("llama")) creator = "Meta";
    else if (rawName.toLowerCase().includes("gemma")) creator = "Google";
    else if (rawName.toLowerCase().includes("qwen")) creator = "Alibaba";
    else if (rawName.toLowerCase().includes("deepseek")) creator = "DeepSeek";
    else if (rawName.toLowerCase().includes("phi")) creator = "Microsoft";
    else if (rawName.toLowerCase().includes("mistral")) creator = "Mistral";

    let useCase = "General";
    if (rawName.toLowerCase().includes("coder") || rawName.toLowerCase().includes("coding") || rawName.toLowerCase().includes("code")) {
      useCase = "Coding";
    } else if (rawName.toLowerCase().includes("r1") || rawName.toLowerCase().includes("reason") || rawName.toLowerCase().includes("math")) {
      useCase = "Reasoning";
    } else if (estSize <= 3.0) {
      useCase = "Lightweight";
    }

    const commandSafeName = rawName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    res.json({
      name: rawName,
      creator: creator,
      parameterSize: estSize,
      quantBits: 4,
      useCase: useCase,
      explanation: `Analyzed automatically using our local offline compatibility heuristics. Designed for ${useCase.toLowerCase()} tasks.`,
      popularCommand: `ollama run ${commandSafeName}:${estSize}b`
    });
  }
});

// Hardcoded fallback list in case Hugging Face is completely down / rate limited / offline
const FALLBACK_MODELS = [
  {
    id: "gemma_4_26b",
    name: "Google Gemma 4 26B Instruct",
    creator: "Google",
    parameters: "26B",
    type: "General",
    description: "Google's latest flagship model in the Gemma 4 family. Leverages advanced group-query attention and highly optimized quantization to deliver extremely high-quality agentic workflows, math, and code generation.",
    popularCommand: "ollama run gemma4:26b",
    ollamaName: "gemma4:26b",
    lastUpdated: "2026-06",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Recommended)", fileSizeGb: 14.6, vramRequiredGb: 16.5, ramRequiredGb: 24.0, qualityScore: 94 },
      { quant: "Q8_0", name: "8-bit Quantized (High Quality)", fileSizeGb: 26.0, vramRequiredGb: 28.5, ramRequiredGb: 32.0, qualityScore: 98 }
    ]
  },
  {
    id: "gemma_4_12b",
    name: "Google Gemma 4 12B Instruct",
    creator: "Google",
    parameters: "12B",
    type: "General",
    description: "An incredibly versatile mid-sized flagship within the Gemma 4 series. Delivering strong reasoning performance that punches far above its weight class while keeping memory usage accessible.",
    popularCommand: "ollama run gemma4:12b",
    ollamaName: "gemma4:12b",
    lastUpdated: "2026-06",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Snappy)", fileSizeGb: 7.4, vramRequiredGb: 9.0, ramRequiredGb: 12.0, qualityScore: 91 },
      { quant: "Q8_0", name: "8-bit Quantized (Ultra Detail)", fileSizeGb: 12.5, vramRequiredGb: 14.5, ramRequiredGb: 16.0, qualityScore: 98 }
    ]
  },
  {
    id: "deepseek_r1_8b",
    name: "DeepSeek-R1 Distill Llama 8B",
    creator: "DeepSeek",
    parameters: "8B",
    type: "Reasoning",
    description: "Extremely popular distillation model trained by DeepSeek on Llama-3 architecture. Employs reasoning tokens to achieve remarkable math, coding, and logical thinking.",
    popularCommand: "ollama run deepseek-r1:8b",
    ollamaName: "deepseek-r1:8b",
    lastUpdated: "2026-06",
    useCase: "Reasoning",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Recommended)", fileSizeGb: 4.7, vramRequiredGb: 6.5, ramRequiredGb: 8.0, qualityScore: 92 },
      { quant: "Q8_0", name: "8-bit Quantized (High Quality)", fileSizeGb: 8.5, vramRequiredGb: 10.5, ramRequiredGb: 12.0, qualityScore: 98 }
    ]
  },
  {
    id: "llama_3_1_8b",
    name: "Meta Llama 3.1 8B Instruct",
    creator: "Meta AI",
    parameters: "8B",
    type: "General",
    description: "Meta's highly capable, industry-standard 8-billion parameter model. Incredible multi-turn conversation and strong general knowledge.",
    popularCommand: "ollama run llama3.1",
    ollamaName: "llama3.1:8b",
    lastUpdated: "2026-06",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Recommended)", fileSizeGb: 4.7, vramRequiredGb: 6.5, ramRequiredGb: 8.0, qualityScore: 93 },
      { quant: "Q8_0", name: "8-bit Quantized (High Quality)", fileSizeGb: 8.5, vramRequiredGb: 10.5, ramRequiredGb: 12.0, qualityScore: 99 }
    ]
  }
];

// Robust Hugging Face single-model converter
function parseHuggingFaceModel(hfModel: any): any {
  const fullId = hfModel.id;
  if (!fullId) return null;

  const parts = fullId.split("/");
  let rawCreator = hfModel.author || (parts.length > 1 ? parts[0] : "Hugging Face");
  let rawName = parts.length > 1 ? parts[1] : parts[0];

  const creatorMapping: { [key: string]: string } = {
    "meta-llama": "Meta AI",
    "google": "Google",
    "microsoft": "Microsoft",
    "deepseek-ai": "DeepSeek",
    "mistralai": "Mistral AI",
    "qwen": "Alibaba Cloud",
    "allenai": "AllenAI",
    "cohere": "Cohere",
    "databricks": "Databricks",
    "tiiuae": "TII UAE",
    "nvidia": "NVIDIA",
    "stabilityai": "Stability AI",
    "lmstudio-community": "LM Studio",
    "unsloth": "Unsloth",
    "bartowski": "Bartowski"
  };

  const lookupKey = rawCreator.toLowerCase();
  let creator = rawCreator;
  for (const [key, val] of Object.entries(creatorMapping)) {
    if (lookupKey.includes(key)) {
      creator = val;
      break;
    }
  }
  if (creator === rawCreator && rawCreator !== "Hugging Face") {
    creator = rawCreator.split(/[-_]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // Robust parameter size detection from model ID
  let parameters = "7B";
  let parameterSizeNum = 7.0;

  const cleanName = rawName.replace(/[-_]/g, " ");
  const bMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*[Bb]\b/);
  const mMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*[Mm]\b/);

  if (bMatch) {
    parameterSizeNum = parseFloat(bMatch[1]);
    parameters = `${parameterSizeNum}B`;
  } else if (mMatch) {
    const mSize = parseFloat(mMatch[1]);
    parameterSizeNum = parseFloat((mSize / 1000).toFixed(3));
    parameters = `${mSize}M`;
  } else {
    if (cleanName.toLowerCase().includes("gpt2")) {
      parameterSizeNum = 0.55;
      parameters = "550M";
    } else if (cleanName.toLowerCase().includes("phi 3 mini") || cleanName.toLowerCase().includes("phi-3-mini")) {
      parameterSizeNum = 3.8;
      parameters = "3.8B";
    } else {
      const numMatch = cleanName.match(/\b(\d+)\b/);
      if (numMatch) {
        const potentialSize = parseInt(numMatch[1], 10);
        if (potentialSize >= 1 && potentialSize <= 120) {
          parameterSizeNum = potentialSize;
          parameters = `${potentialSize}B`;
        }
      }
    }
  }

  // Categories/Use Cases
  let useCase = "General";
  let type = "General";

  const lowerId = fullId.toLowerCase();
  const lowerPipe = (hfModel.pipeline_tag || "").toLowerCase();

  if (lowerId.includes("coder") || lowerId.includes("coding") || lowerId.includes("code")) {
    useCase = "Coding";
    type = "Coding";
  } else if (lowerId.includes("r1") || lowerId.includes("reasoning") || lowerId.includes("math")) {
    useCase = "Reasoning";
    type = "Reasoning";
  } else if (
    lowerPipe.includes("image-text") || 
    lowerPipe.includes("any-to-any") ||
    lowerId.includes("vision") || 
    lowerId.includes("vlm") || 
    lowerId.includes("vl-") ||
    lowerId.includes("vl_") ||
    lowerId.includes("multimodal") ||
    lowerId.includes("gemma-4") ||
    lowerId.includes("gemma4")
  ) {
    useCase = "Multimodal";
    type = "Multimodal";
  } else if (parameterSizeNum <= 4.0) {
    useCase = "Lightweight";
    type = "Lightweight";
  }

  // Format clean display name
  const cleanDisplayName = rawName
    .replace(/[-_]/g, " ")
    .replace(/\b([a-z])/g, (_, g) => g.toUpperCase());

  // Generate description based on trending score or downloads
  let trendingText = hfModel.trendingScore ? `highly trending with a community velocity score of ${Math.round(hfModel.trendingScore)}` : `actively trending in the open-source community`;
  let downloadsText = hfModel.downloads ? hfModel.downloads.toLocaleString() : "highly";
  let description = `Top dynamic model, ${trendingText}. Perfectly suited for local hardware evaluations with ${downloadsText} weekly downloads.`;
  if (useCase === "Coding") {
    description = `Premium developer model optimized for high-speed coding, code translation, and debugging, ${trendingText}.`;
  } else if (useCase === "Reasoning") {
    description = `Flagship reasoning model with custom chain-of-thought activations for heavy mathematics and logic, ${trendingText}.`;
  } else if (useCase === "Multimodal") {
    description = `Cutting-edge multimodal model capable of advanced visual understanding and deep multi-discipline reasoning, ${trendingText}.`;
  } else if (useCase === "Lightweight") {
    description = `Miniature, ultra-fast model perfect for on-device execution, lighter hardware, or integrated contexts, ${trendingText}.`;
  }

  let ollamaBase = rawName.toLowerCase()
    .replace(/-instruct.*/, "")
    .replace(/-it$/, "")
    .replace(/-chat.*/, "")
    .replace(/[^a-z0-9]/g, "");

  let ollamaName = `${ollamaBase}:${parameters.toLowerCase()}`;
  let popularCommand = `ollama run ${ollamaName}`;

  // Formats definition mimicking local specs
  const formats: any[] = [];
  
  const q4File = parseFloat(((parameterSizeNum * 4.5) / 8 + 0.3).toFixed(1));
  formats.push({
    quant: "Q4_K_M",
    name: "4-bit Quantized (Highly Recommended)",
    fileSizeGb: q4File === 0 ? 0.8 : q4File,
    vramRequiredGb: parseFloat((q4File + 1.8).toFixed(1)),
    ramRequiredGb: parseFloat((q4File + 2.5).toFixed(1)),
    qualityScore: 91
  });

  const q8File = parseFloat(((parameterSizeNum * 8.5) / 8 + 0.5).toFixed(1));
  formats.push({
    quant: "Q8_0",
    name: "8-bit Quantized (High Fidelity)",
    fileSizeGb: q8File === 0 ? 1.5 : q8File,
    vramRequiredGb: parseFloat((q8File + 2.0).toFixed(1)),
    ramRequiredGb: parseFloat((q8File + 3.0).toFixed(1)),
    qualityScore: 98
  });

  if (parameterSizeNum <= 10) {
    const fp16File = parseFloat((parameterSizeNum * 2.0).toFixed(1));
    formats.push({
      quant: "FP16",
      name: "16-bit Full Precision (Original)",
      fileSizeGb: fp16File === 0 ? 3.0 : fp16File,
      vramRequiredGb: parseFloat((fp16File + 2.2).toFixed(1)),
      ramRequiredGb: parseFloat((fp16File + 4.0).toFixed(1)),
      qualityScore: 100
    });
  }

  const lastUpdatedRaw = hfModel.lastModified || new Date().toISOString();
  const lastUpdated = lastUpdatedRaw.slice(0, 7);

  return {
    id: fullId,
    name: cleanDisplayName,
    creator,
    parameters,
    type,
    description,
    popularCommand,
    ollamaName,
    formats,
    lastUpdated,
    useCase,
    hfDownloads: hfModel.downloads,
    hfLikes: hfModel.likes,
    hfTrendingScore: hfModel.trendingScore
  };
}

// RESTful endpoint with 7-day disk cache for automatic weekly updates
app.get("/api/top-models", async (req, res) => {
  const cachePath = path.join(os.tmpdir(), "hf_top_models_cache.json");
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  let useCache = false;
  if (fs.existsSync(cachePath)) {
    try {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      if (age < ONE_WEEK_MS) {
        useCache = true;
      }
    } catch (e) {
      console.error("Cache verification error:", e);
    }
  }

  if (useCache) {
    try {
      const cacheRaw = fs.readFileSync(cachePath, "utf-8");
      const cacheObj = JSON.parse(cacheRaw);
      if (cacheObj && Array.isArray(cacheObj.models) && cacheObj.models.length > 0) {
        const top50 = cacheObj.models.slice(0, 50);
        return res.json({
          source: "cache",
          lastUpdated: cacheObj.lastUpdatedTime,
          models: top50
        });
      }
    } catch (e) {
      console.error("Cache read failed, fallback to live query:", e);
    }
  }

  // Query live HF API
  try {
    console.log("Fetching live top trending text and multimodal models from Hugging Face...");
    const [tgRes, imgRes] = await Promise.all([
      fetch("https://huggingface.co/api/models?limit=100&sort=trendingScore&direction=-1&filter=text-generation", {
        headers: { "User-Agent": "LLMFit-Matrix-AIAgent/1.0" }
      }),
      fetch("https://huggingface.co/api/models?limit=100&sort=trendingScore&direction=-1&filter=image-text-to-text", {
        headers: { "User-Agent": "LLMFit-Matrix-AIAgent/1.0" }
      })
    ]).catch(err => {
      throw new Error(`Failed to execute parallel fetch to Hugging Face API: ${err.message}`);
    });
    
    let combinedList: any[] = [];

    if (tgRes && tgRes.ok) {
      const tgList = await tgRes.json().catch(() => []);
      if (Array.isArray(tgList)) combinedList.push(...tgList);
    } else if (tgRes) {
      console.warn(`Text-generation fetch returned status ${tgRes.status}`);
    }

    if (imgRes && imgRes.ok) {
      const imgList = await imgRes.json().catch(() => []);
      if (Array.isArray(imgList)) combinedList.push(...imgList);
    } else if (imgRes) {
      console.warn(`Image-text-to-text fetch returned status ${imgRes.status}`);
    }

    if (combinedList.length === 0) {
      throw new Error("Hugging Face API queries returned empty results or failed");
    }

    // Deduplicate by ID prioritizing higher trending score or downloads
    const uniqueMap = new Map();
    for (const model of combinedList) {
      if (model && model.id) {
        const existing = uniqueMap.get(model.id);
        const score = model.trendingScore || model.downloads || 0;
        const existingScore = existing ? (existing.trendingScore || existing.downloads || 0) : -1;
        if (!existing || score > existingScore) {
          uniqueMap.set(model.id, model);
        }
      }
    }

    const sortedList = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
      const scoreA = a.trendingScore || a.downloads || 0;
      const scoreB = b.trendingScore || b.downloads || 0;
      return scoreB - scoreA;
    });

    // Map models and filter nulls
    const mapped: any[] = sortedList
      .map(m => parseHuggingFaceModel(m))
      .filter(m => m !== null && m.formats && m.formats.length > 0);

    // Filter down to the best 50 items (e.g. valid parameter weights etc.)
    const top50 = mapped.slice(0, 50);

    if (top50.length === 0) {
      throw new Error("No Hugging Face models could be successfully parsed");
    }

    // Save cache
    const cacheData = {
      lastUpdatedTime: Date.now(),
      models: top50
    };
    try {
      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write cache file to disk:", e);
    }

    return res.json({
      source: "live",
      lastUpdated: cacheData.lastUpdatedTime,
      models: top50
    });

  } catch (error: any) {
    console.error("Hugging Face live fetch error:", error);
    
    // In case of error (e.g. rate-limit/offline), return existing cache (even if old) OR fallback array!
    if (fs.existsSync(cachePath)) {
      try {
        const cacheRaw = fs.readFileSync(cachePath, "utf-8");
        const cacheObj = JSON.parse(cacheRaw);
        const top50 = (cacheObj.models || []).slice(0, 50);
        return res.json({
          source: "fallback-cache-stale",
          lastUpdated: cacheObj.lastUpdatedTime,
          models: top50
        });
      } catch (e) {}
    }

    // Absolute fallback: static highly-optimized base list
    return res.json({
      source: "fallback-static",
      lastUpdated: Date.now(),
      models: FALLBACK_MODELS
    });
  }
});

// Serve Vite in development, static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
