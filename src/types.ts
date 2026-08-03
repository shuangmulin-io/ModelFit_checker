export interface GPUSpec {
  name: string;
  vram: number; // GB
  gpuClass: "integrated" | "nvidia" | "amd" | "intel_arc" | "apple_unified";
  isActive: boolean;
  type: "discrete" | "integrated" | "unified";
  isTarget?: boolean;
}

export interface SystemSpecs {
  os: "windows" | "macos" | "linux";
  cpu: string;
  cpuClass: "low" | "medium" | "high" | "enthusiast" | "apple_silicon";
  cpuIsAppleSilicon: boolean;
  cpuCores: number;
  ram: number; // GB
  gpu: string;
  vram: number; // GB
  gpuClass: "integrated" | "nvidia" | "amd" | "intel_arc" | "apple_unified";
  gpus?: GPUSpec[];
}

export interface ModelFormat {
  quant: "Q4_K_M" | "Q8_0" | "FP16";
  name: string;
  fileSizeGb: number;
  vramRequiredGb: number;
  ramRequiredGb: number;
  qualityScore: number; // 1-100 indicating performance vs original quality
}

export interface ModelDef {
  id: string;
  name: string;
  creator: string;
  parameters: string;
  type: "General" | "Coding" | "Reasoning" | "Lightweight" | "Multimodal";
  description: string;
  popularCommand: string;
  ollamaName: string;
  formats: ModelFormat[];
  lastUpdated?: string; // e.g. "2026-06"
  useCase?: string; // e.g. "Reasoning", "General", "Coding", "Lightweight", "Multimodal"
  hfDownloads?: number;
  hfLikes?: number;
  hfTrendingScore?: number;
}

export interface CompatibilityResult {
  modelId: string;
  modelName: string;
  quant: "Q4_K_M" | "Q8_0" | "FP16";
  status: "full_gpu" | "hybrid" | "cpu_only" | "out_of_memory";
  offloadPercentage: number; // 0 to 100
  estimatedTps: number; // tokens per second
  memoryMessage: string;
  suitabilityScore: number; // 1 to 5 stars
  badgeColor: string;
  hostingTierName?: string;
  hostingTierDesc?: string;
  speedPacePhrase?: string;
  speedPaceSymbol?: string;
  speedPaceDesc?: string;
}
