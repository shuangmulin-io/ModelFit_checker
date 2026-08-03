import { ModelDef, SystemSpecs } from "../types";

export const MODELS_DATABASE: ModelDef[] = [
  {
    id: "gemma_4_26b",
    name: "Google Gemma 4 26B Instruct",
    creator: "Google",
    parameters: "26B",
    type: "Multimodal",
    description: "Google's latest flagship model in the Gemma 4 family. Leverages advanced group-query attention and highly optimized quantization to deliver extremely high-quality agentic workflows, math, and code generation.",
    popularCommand: "ollama run gemma4:26b",
    ollamaName: "gemma4:26b",
    lastUpdated: "2026-06",
    useCase: "Multimodal",
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
    type: "Multimodal",
    description: "An incredibly versatile mid-sized flagship within the Gemma 4 series. Delivering strong reasoning performance that punches far above its weight class while keeping memory usage accessible.",
    popularCommand: "ollama run gemma4:12b",
    ollamaName: "gemma4:12b",
    lastUpdated: "2026-06",
    useCase: "Multimodal",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Snappy)", fileSizeGb: 7.4, vramRequiredGb: 9.0, ramRequiredGb: 12.0, qualityScore: 91 },
      { quant: "Q8_0", name: "8-bit Quantized (Ultra Detail)", fileSizeGb: 12.5, vramRequiredGb: 14.5, ramRequiredGb: 16.0, qualityScore: 98 }
    ]
  },
  {
    id: "gemma_4_e2b_mobile",
    name: "Google Gemma 4 E2B Mobile",
    creator: "Google",
    parameters: "4.6B",
    type: "Multimodal",
    description: "A highly specialized mobile-optimized variant of Gemma 4. Designed for local execution with ultra-low power consumption and incredibly fast inference times on unified memory architectures.",
    popularCommand: "ollama run gemma4:e2b",
    ollamaName: "gemma4:e2b",
    lastUpdated: "2026-06",
    useCase: "Multimodal",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized", fileSizeGb: 2.7, vramRequiredGb: 4.0, ramRequiredGb: 6.0, qualityScore: 86 },
      { quant: "Q8_0", name: "8-bit Quantized", fileSizeGb: 4.9, vramRequiredGb: 6.2, ramRequiredGb: 8.0, qualityScore: 94 }
    ]
  },
  {
    id: "deepseek_r1_8b",
    name: "DeepSeek-R1 Distill Llama 8B",
    creator: "DeepSeek",
    parameters: "8B",
    type: "Reasoning",
    description: "Extremely popular distillation model trained by DeepSeek on Llama-3 architecture. Employs reasoning tokens (<thought>) to achieve remarkable math, coding, and logical thinking.",
    popularCommand: "ollama run deepseek-r1:8b",
    ollamaName: "deepseek-r1:8b",
    lastUpdated: "2026-06",
    useCase: "Reasoning",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Medium Cooked)", fileSizeGb: 4.7, vramRequiredGb: 6.5, ramRequiredGb: 8.0, qualityScore: 92 },
      { quant: "Q8_0", name: "8-bit Quantized (High Quality)", fileSizeGb: 8.5, vramRequiredGb: 10.5, ramRequiredGb: 12.0, qualityScore: 98 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 16.0, vramRequiredGb: 18.5, ramRequiredGb: 24.0, qualityScore: 100 }
    ]
  },
  {
    id: "llama_3_1_8b",
    name: "Meta Llama 3.1 8B Instruct",
    creator: "Meta AI",
    parameters: "8B",
    type: "General",
    description: "Meta's highly capable, industry-standard 8-billion parameter model. Incredible multi-turn conversation, high context window (up to 128k), and strong general knowledge.",
    popularCommand: "ollama run llama3.1",
    ollamaName: "llama3.1:8b",
    lastUpdated: "2026-06",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Medium Cooked)", fileSizeGb: 4.7, vramRequiredGb: 6.5, ramRequiredGb: 8.0, qualityScore: 93 },
      { quant: "Q8_0", name: "8-bit Quantized (High Quality)", fileSizeGb: 8.5, vramRequiredGb: 10.5, ramRequiredGb: 12.0, qualityScore: 99 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 16.0, vramRequiredGb: 18.5, ramRequiredGb: 24.0, qualityScore: 100 }
    ]
  },
  {
    id: "deepseek_r1_1_5b",
    name: "DeepSeek-R1 Distill Qwen 1.5B",
    creator: "DeepSeek",
    parameters: "1.5B",
    type: "Lightweight",
    description: "An ultra-lightweight reasoning model distilled from Qwen 2.5. Highly optimized for systems with very low CPU/GPU power (runs wonderfully on old laptops or mobile platforms!)",
    popularCommand: "ollama run deepseek-r1:1.5b",
    ollamaName: "deepseek-r1:1.5b",
    lastUpdated: "2026-05",
    useCase: "Reasoning",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Ultra-light)", fileSizeGb: 1.1, vramRequiredGb: 2.5, ramRequiredGb: 4.0, qualityScore: 82 },
      { quant: "Q8_0", name: "8-bit Quantized (Snappy)", fileSizeGb: 1.8, vramRequiredGb: 3.2, ramRequiredGb: 4.5, qualityScore: 90 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 3.0, vramRequiredGb: 4.5, ramRequiredGb: 6.0, qualityScore: 100 }
    ]
  },
  {
    id: "qwen_2_5_coder_7b",
    name: "Qwen 2.5 Coder 7B",
    creator: "Alibaba Cloud",
    parameters: "7B",
    type: "Coding",
    description: "Specifically trained and optimized for programming tasks, debugging, and code generation. Rivaling or exceeding many larger models in software engineering benchmarks.",
    popularCommand: "ollama run qwen2.5-coder",
    ollamaName: "qwen2.5-coder:7b",
    lastUpdated: "2026-05",
    useCase: "Coding",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Recommended)", fileSizeGb: 4.7, vramRequiredGb: 6.5, ramRequiredGb: 8.0, qualityScore: 91 },
      { quant: "Q8_0", name: "8-bit Quantized (Precise)", fileSizeGb: 7.7, vramRequiredGb: 9.5, ramRequiredGb: 12.0, qualityScore: 98 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 15.0, vramRequiredGb: 17.5, ramRequiredGb: 24.0, qualityScore: 100 }
    ]
  },
  {
    id: "deepseek_r1_14b",
    name: "DeepSeek-R1 Distill Qwen 14B",
    creator: "DeepSeek",
    parameters: "14B",
    type: "Reasoning",
    description: "A mid-tier reasoning heavyweight. Strikes a breathtaking balance between resource usage and complex math / programming capability. Distilled from Qwen-2.5-14B.",
    popularCommand: "ollama run deepseek-r1:14b",
    ollamaName: "deepseek-r1:14b",
    lastUpdated: "2026-04",
    useCase: "Reasoning",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Fast Medium)", fileSizeGb: 9.0, vramRequiredGb: 11.5, ramRequiredGb: 16.0, qualityScore: 94 },
      { quant: "Q8_0", name: "8-bit Quantized (High Detail)", fileSizeGb: 16.0, vramRequiredGb: 18.5, ramRequiredGb: 24.0, qualityScore: 99 }
    ]
  },
  {
    id: "mistral_7b",
    name: "Mistral 7B Instruct v0.3",
    creator: "Mistral AI",
    parameters: "7B",
    type: "General",
    description: "The classic generalist champ from France. Broad vocabulary, high speeds, excellent multi-lingual support, and extremely easy to run across nearly any configuration.",
    popularCommand: "ollama run mistral",
    ollamaName: "mistral:7b",
    lastUpdated: "2026-03",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Standard Cook)", fileSizeGb: 4.1, vramRequiredGb: 6.0, ramRequiredGb: 8.0, qualityScore: 90 },
      { quant: "Q8_0", name: "8-bit Quantized (Precise Mode)", fileSizeGb: 7.7, vramRequiredGb: 9.5, ramRequiredGb: 12.0, qualityScore: 98 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 14.5, vramRequiredGb: 16.8, ramRequiredGb: 24.0, qualityScore: 100 }
    ]
  },
  {
    id: "phi_3_mini",
    name: "Microsoft Phi-3 Mini 3.8B",
    creator: "Microsoft",
    parameters: "3.8B",
    type: "Lightweight",
    description: "An incredibly compact powerhouse. Trained with heavily curated high-quality synthetic textbooks. Performs like a 7B or 8B model despite its tiny footprint.",
    popularCommand: "ollama run phi3",
    ollamaName: "phi3:3.8b",
    lastUpdated: "2026-02",
    useCase: "General",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Snappy)", fileSizeGb: 2.2, vramRequiredGb: 3.5, ramRequiredGb: 6.0, qualityScore: 89 },
      { quant: "Q8_0", name: "8-bit Quantized (Solid Quality)", fileSizeGb: 4.0, vramRequiredGb: 5.5, ramRequiredGb: 8.0, qualityScore: 96 },
      { quant: "FP16", name: "16-bit Full Precision (Original)", fileSizeGb: 7.6, vramRequiredGb: 9.2, ramRequiredGb: 12.0, qualityScore: 100 }
    ]
  },
  {
    id: "llama_3_1_70b",
    name: "Meta Llama 3.1 70B",
    creator: "Meta AI",
    parameters: "70B",
    type: "Reasoning",
    description: "The ultimate local open-source flagship. Absolute state-of-the-art capability in translation, planning, and knowledge retrieval. Requires multi-GPU setup or massive unified memory.",
    popularCommand: "ollama run llama3.1:70b",
    ollamaName: "llama3.1:70b",
    lastUpdated: "2026-01",
    useCase: "Reasoning",
    formats: [
      { quant: "Q4_K_M", name: "4-bit Quantized (Heavy flagship)", fileSizeGb: 42.0, vramRequiredGb: 45.0, ramRequiredGb: 48.0, qualityScore: 96 },
      { quant: "Q8_0", name: "8-bit Quantized (Ultra premium)", fileSizeGb: 75.0, vramRequiredGb: 78.0, ramRequiredGb: 80.0, qualityScore: 99 }
    ]
  }
];

export interface SystemPreset {
  name: string;
  specs: SystemSpecs;
}

export const SYSTEM_PRESETS: SystemPreset[] = [
  {
    name: "Gaming Laptop (RTX 4060, 16GB)",
    specs: {
      os: "windows",
      cpu: "Intel Core i7-13700H",
      cpuClass: "high",
      cpuIsAppleSilicon: false,
      cpuCores: 14,
      ram: 16,
      gpu: "NVIDIA GeForce RTX 4060 Laptop",
      vram: 8,
      gpuClass: "nvidia"
    }
  },
  {
    name: "Standard Macbook Air (M2, 8GB)",
    specs: {
      os: "macos",
      cpu: "Apple M2 (Unified)",
      cpuClass: "apple_silicon",
      cpuIsAppleSilicon: true,
      cpuCores: 8,
      ram: 8,
      gpu: "Apple M2 8-Core GPU",
      vram: 6, // 6GB allocatable RAM
      gpuClass: "apple_unified"
    }
  },
  {
    name: "Macbook Pro (M3 Pro, 18GB)",
    specs: {
      os: "macos",
      cpu: "Apple M3 Pro (Unified)",
      cpuClass: "apple_silicon",
      cpuIsAppleSilicon: true,
      cpuCores: 11,
      ram: 18,
      gpu: "Apple M3 Pro 14-Core GPU",
      vram: 14, // unified dynamic
      gpuClass: "apple_unified"
    }
  },
  {
    name: "Macbook Pro Max (M3 Max, 48GB)",
    specs: {
      os: "macos",
      cpu: "Apple M3 Max (Unified)",
      cpuClass: "apple_silicon",
      cpuIsAppleSilicon: true,
      cpuCores: 16,
      ram: 48,
      gpu: "Apple M3 Max 40-Core GPU",
      vram: 36, // ~75% unified dynamic
      gpuClass: "apple_unified"
    }
  },
  {
    name: "Creator Desktop (RTX 4070, 32GB)",
    specs: {
      os: "windows",
      cpu: "AMD Ryzen 7 7800X3D",
      cpuClass: "enthusiast",
      cpuIsAppleSilicon: false,
      cpuCores: 8,
      ram: 32,
      gpu: "NVIDIA GeForce RTX 4070",
      vram: 12,
      gpuClass: "nvidia"
    }
  },
  {
    name: "AI Enthusiast PC (RTX 4090, 64GB)",
    specs: {
      os: "windows",
      cpu: "Intel Core i9-14900K",
      cpuClass: "enthusiast",
      cpuIsAppleSilicon: false,
      cpuCores: 24,
      ram: 64,
      gpu: "NVIDIA GeForce RTX 4090",
      vram: 24,
      gpuClass: "nvidia"
    }
  },
  {
    name: "Office / Family PC (No GPU, 8GB)",
    specs: {
      os: "windows",
      cpu: "Intel Core i5-11400",
      cpuClass: "medium",
      cpuIsAppleSilicon: false,
      cpuCores: 6,
      ram: 8,
      gpu: "Intel UHD Graphics 730",
      vram: 0.5,
      gpuClass: "integrated"
    }
  },
  {
    name: "Modern Intel/AMD Ultrabook (16GB)",
    specs: {
      os: "windows",
      cpu: "AMD Ryzen 5 7530U",
      cpuClass: "medium",
      cpuIsAppleSilicon: false,
      cpuCores: 6,
      ram: 16,
      gpu: "AMD Radeon Graphics (Integrated)",
      vram: 1.5,
      gpuClass: "integrated"
    }
  }
];
