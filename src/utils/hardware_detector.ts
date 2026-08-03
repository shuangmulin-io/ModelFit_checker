import { SystemSpecs } from "../types";

export function detectSystemSpecs(): Partial<SystemSpecs> {
  const specs: Partial<SystemSpecs> = {
    os: "windows",
    cpu: "Generic CPU",
    cpuClass: "medium",
    cpuIsAppleSilicon: false,
    cpuCores: navigator.hardwareConcurrency || 8,
    ram: 16, // Safe standard default
    gpu: "Generic Graphic Card",
    vram: 4, // Safe standard default
    gpuClass: "integrated",
    gpus: [],
  };

  // 1. Detect OS
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) {
    specs.os = "macos";
  } else if (ua.includes("linux")) {
    specs.os = "linux";
  } else {
    specs.os = "windows";
  }

  // 2. Try to get RAM from navigator.deviceMemory (standard is GB, max usually reported is 8)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory) {
    if (deviceMemory <= 1) specs.ram = 4;
    else if (deviceMemory <= 2) specs.ram = 4;
    else if (deviceMemory <= 4) specs.ram = 8;
    else specs.ram = 16;
  }

  // Define VRAM parsing helper
  const guessVramAndClass = (gpuStr: string): { vram: number; gpuClass: "integrated" | "nvidia" | "amd" | "intel_arc" | "apple_unified" } => {
    const gpuLower = gpuStr.toLowerCase();
    let vram = 4;
    let gpuClass: "integrated" | "nvidia" | "amd" | "intel_arc" | "apple_unified" = "integrated";

    if (gpuLower.includes("nvidia") || gpuLower.includes("geforce") || gpuLower.includes("rtx") || gpuLower.includes("gtx")) {
      gpuClass = "nvidia";
      if (gpuLower.includes("5090")) vram = gpuLower.includes("laptop") || gpuLower.includes("mobile") ? 16 : 32;
      else if (gpuLower.includes("5080")) vram = 16;
      else if (gpuLower.includes("5070 ti")) vram = 16;
      else if (gpuLower.includes("5070")) vram = gpuLower.includes("laptop") || gpuLower.includes("mobile") ? 8 : 12;
      else if (gpuLower.includes("5060 ti")) vram = 12;
      else if (gpuLower.includes("5060")) vram = 8;
      else if (gpuLower.includes("4090")) vram = 24;
      else if (gpuLower.includes("4080")) vram = 16;
      else if (gpuLower.includes("4070 ti super")) vram = 16;
      else if (gpuLower.includes("4070 ti")) vram = 12;
      else if (gpuLower.includes("4070")) vram = 12;
      else if (gpuLower.includes("4060 ti")) vram = 8;
      else if (gpuLower.includes("4060")) vram = 8;
      else if (gpuLower.includes("4050")) vram = 6;
      else if (gpuLower.includes("3090")) vram = 24;
      else if (gpuLower.includes("3080 ti")) vram = 12;
      else if (gpuLower.includes("3080")) vram = 10;
      else if (gpuLower.includes("3070 ti")) vram = 8;
      else if (gpuLower.includes("3070")) vram = 8;
      else if (gpuLower.includes("3060 ti")) vram = 8;
      else if (gpuLower.includes("3060")) vram = 12;
      else if (gpuLower.includes("3050")) vram = 8;
      else if (gpuLower.includes("2080 ti")) vram = 11;
      else if (gpuLower.includes("2080")) vram = 8;
      else if (gpuLower.includes("2070")) vram = 8;
      else if (gpuLower.includes("2060")) vram = 6;
      else if (gpuLower.includes("1080 ti")) vram = 11;
      else if (gpuLower.includes("1080")) vram = 8;
      else if (gpuLower.includes("1070")) vram = 8;
      else if (gpuLower.includes("1660")) vram = 6;
      else if (gpuLower.includes("1650")) vram = 4;
      else if (gpuLower.includes("a100")) vram = 40;
      else if (gpuLower.includes("h100")) vram = 80;
      else if (gpuLower.includes("a6000")) vram = 48;
      else if (gpuLower.includes("a4000")) vram = 16;
      else vram = 8;
    } else if (gpuLower.includes("amd") || gpuLower.includes("radeon")) {
      if (gpuLower.includes("rx 7900 xtx")) vram = 24;
      else if (gpuLower.includes("rx 7900 xt")) vram = 20;
      else if (gpuLower.includes("rx 7800")) vram = 16;
      else if (gpuLower.includes("rx 7700")) vram = 12;
      else if (gpuLower.includes("rx 7600")) vram = 8;
      else if (gpuLower.includes("rx 6900") || gpuLower.includes("rx 6800")) vram = 16;
      else if (gpuLower.includes("rx 6700")) vram = 12;
      else if (gpuLower.includes("rx 6600")) vram = 8;
      else {
        vram = 2;
        gpuClass = "integrated";
      }
      if (vram >= 8) {
        gpuClass = "amd";
      }
    } else if (gpuLower.includes("intel") || gpuLower.includes("arc")) {
      if (gpuLower.includes("arc a770")) {
        vram = 16;
        gpuClass = "intel_arc";
      } else if (gpuLower.includes("arc a750") || gpuLower.includes("arc a580")) {
        vram = 8;
        gpuClass = "intel_arc";
      } else if (gpuLower.includes("arc a380")) {
        vram = 6;
        gpuClass = "intel_arc";
      } else {
        vram = 1.5;
        gpuClass = "integrated";
      }
    } else if (gpuLower.includes("apple") || gpuLower.includes("m1") || gpuLower.includes("m2") || gpuLower.includes("m3") || gpuLower.includes("m4")) {
      gpuClass = "apple_unified";
      const ramVal = specs.ram || 16;
      vram = Math.round(ramVal * 0.75);
    }
    return { vram, gpuClass };
  };

  const probeGpu = (preference?: "low-power" | "high-performance"): string | null => {
    try {
      const canvas = document.createElement("canvas");
      const ctxOptions = preference ? { powerPreference: preference } : {};
      const gl = (canvas.getContext("webgl", ctxOptions) || canvas.getContext("experimental-webgl", ctxOptions)) as any;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null;
        }
      }
    } catch (_) {}
    return null;
  };

  // Run probes to detect discrete vs integrated
  const defaultGpu = probeGpu();
  const highGpu = probeGpu("high-performance");
  const lowGpu = probeGpu("low-power");

  const detectedGpuNames = new Set<string>();
  if (defaultGpu) detectedGpuNames.add(defaultGpu);
  if (highGpu) detectedGpuNames.add(highGpu);
  if (lowGpu) detectedGpuNames.add(lowGpu);

  const parsedGpus: any[] = [];

  detectedGpuNames.forEach(name => {
    const parsed = guessVramAndClass(name);
    parsedGpus.push({
      name,
      vram: parsed.vram,
      gpuClass: parsed.gpuClass,
      isActive: name === defaultGpu,
      type: parsed.gpuClass === "integrated" ? "integrated" as const : (parsed.gpuClass === "apple_unified" ? "unified" as const : "discrete" as const),
    });
  });

  // If we only resolved 1 GPU but it's a discrete card, standard laptop/PC architectures almost
  // always have an integrated processor adapter as well. Let's append an integrated model to avoid empty lists.
  if (parsedGpus.length === 1 && parsedGpus[0].gpuClass !== "integrated" && parsedGpus[0].gpuClass !== "apple_unified") {
    const primaryGpu = parsedGpus[0];
    const cpuBrand = specs.os === "macos" ? "Intel Iris" : (primaryGpu.gpuClass === "nvidia" ? "Intel UHD Graphics 770" : "AMD Radeon Graphics");
    parsedGpus.push({
      name: cpuBrand + " (Integrated Companion)",
      vram: specs.os === "macos" ? 1.5 : 2,
      gpuClass: "integrated",
      isActive: false,
      type: "integrated",
    });
  }

  // If we only resolved 1 GPU but it's an integrated GPU on a generic PC, there is often a discrete
  // companion card that is currently sleeping or inactive in the web browser's driver focus.
  if (parsedGpus.length === 1 && parsedGpus[0].gpuClass === "integrated" && specs.os !== "macos") {
    parsedGpus.push({
      name: "NVIDIA GeForce RTX Companion (Sleeping or Power Saving)",
      vram: 8,
      gpuClass: "nvidia",
      isActive: false,
      type: "discrete",
    });
  }

  // Keep Apple as unified
  if (parsedGpus.length === 0) {
    parsedGpus.push({
      name: "Standard Graphics Adapter",
      vram: 4,
      gpuClass: "integrated",
      isActive: true,
      type: "integrated",
    });
  }

  // Rank and find the absolute best GPU available for AI inference in the system
  const classWeights = {
    nvidia: 5,
    apple_unified: 4,
    amd: 3,
    intel_arc: 2,
    integrated: 1,
  };

  let bestInferenceGpu = parsedGpus[0];
  parsedGpus.forEach(g => {
    const currentWeight = classWeights[g.gpuClass as keyof typeof classWeights] || 0;
    const bestWeight = classWeights[bestInferenceGpu.gpuClass as keyof typeof classWeights] || 0;
    if (currentWeight > bestWeight) {
      bestInferenceGpu = g;
    } else if (currentWeight === bestWeight && g.vram > bestInferenceGpu.vram) {
      bestInferenceGpu = g;
    }
  });

  // Mark which one is the selected target for local LLM inference calculations
  parsedGpus.forEach(g => {
    g.isTarget = (g === bestInferenceGpu);
  });

  specs.gpus = parsedGpus;
  specs.gpu = bestInferenceGpu.name;
  specs.vram = bestInferenceGpu.vram;
  specs.gpuClass = bestInferenceGpu.gpuClass;

  // Detect if system has AMD or Intel integrated graphics as a CPU proxy
  let hasAmdIntegrated = false;
  let hasIntelIntegrated = false;
  parsedGpus.forEach(g => {
    const nameLower = g.name.toLowerCase();
    if (nameLower.includes("amd") || nameLower.includes("radeon") || nameLower.includes("ryzen")) {
      hasAmdIntegrated = true;
    }
    if (nameLower.includes("intel") || nameLower.includes("iris") || nameLower.includes("hd") || nameLower.includes("uhd")) {
      hasIntelIntegrated = true;
    }
  });

  // Set default CPU name based on guessed class, platform & proxy iGPU
  if (specs.os === "macos") {
    if (bestInferenceGpu.gpuClass === "apple_unified") {
      specs.cpuIsAppleSilicon = true;
      specs.cpuClass = "apple_silicon";
      const gpuName = bestInferenceGpu.name || "";
      const match = gpuName.match(/Apple\s+M[1-9][a-zA-Z0-9\s-]*/i);
      if (match) {
        specs.cpu = "Apple Silicon " + match[0].replace(/Apple\s+/i, "").trim();
      } else {
        specs.cpu = "Apple Silicon M-Series";
      }
    } else {
      specs.cpu = "Intel Core i9 (Mac Pro/Mini)";
      specs.cpuClass = "medium";
    }
  } else if (specs.gpuClass === "nvidia" || specs.gpuClass === "amd" || specs.gpuClass === "intel_arc") {
    if (hasAmdIntegrated) {
      specs.cpu = "AMD Ryzen 9/7 Processor (Estimated)";
    } else {
      specs.cpu = "Intel Core i7-13700H (Estimated)";
    }
    specs.cpuClass = "high";
  } else {
    if (hasAmdIntegrated) {
      specs.cpu = "AMD Ryzen 5 Processor (Estimated)";
    } else if (hasIntelIntegrated) {
      specs.cpu = "Intel Core i5 (Iris Xe, Estimated)";
    } else {
      specs.cpu = "Intel Core i5-1135G7 (Estimated)";
    }
    specs.cpuClass = "medium";
  }

  return specs;
}

// Full compatibility rating checker
import { ModelFormat, CompatibilityResult } from "../types";

export function evaluateModelCompatibility(
  specs: SystemSpecs,
  modelId: string,
  modelName: string,
  format: ModelFormat
): CompatibilityResult {
  const result: Partial<CompatibilityResult> = {
    modelId,
    modelName,
    quant: format.quant,
  };

  const userVram = specs.vram;
  const userRam = specs.ram;

  // macOS Apple Silicon specific calculations (Unified Memory rules standard)
  if (specs.gpuClass === "apple_unified") {
    // High unified memory allocation. Let's make unified usable memory 75% of overall System RAM.
    const usableUnifiedMemory = userRam * 0.75;
    
    if (usableUnifiedMemory >= format.vramRequiredGb) {
      result.status = "full_gpu";
      result.offloadPercentage = 100;
      result.estimatedTps = Math.round(Math.max(12, 45 - (format.fileSizeGb * 0.4)));
      result.memoryMessage = `Fully loaded in ${format.fileSizeGb.toFixed(1)} GB Apple Unified Memory.`;
      result.suitabilityScore = 5;
      result.badgeColor = "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900";
    } else if (userRam >= format.ramRequiredGb) {
      // Macintosh systems fall back gracefully and swap models, but it affects the speed.
      result.status = "hybrid";
      const ratio = Math.round((usableUnifiedMemory / format.vramRequiredGb) * 100);
      result.offloadPercentage = ratio;
      result.estimatedTps = Math.round(Math.max(4, 18 * (ratio / 100)));
      result.memoryMessage = `${ratio}% fits in Apple Unified Memory, remaining swaps to system disk.`;
      result.suitabilityScore = 3;
      result.badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-250 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900";
    } else {
      result.status = "out_of_memory";
      result.offloadPercentage = 0;
      result.estimatedTps = 0;
      result.memoryMessage = `Requires ${format.ramRequiredGb} GB System RAM. Your Mac only has ${userRam} GB.`;
      result.suitabilityScore = 1;
      result.badgeColor = "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900";
    }
    return result as CompatibilityResult;
  }

  // Windows / Linux dedicated GPUs
  const fitsFullGpu = userVram >= format.vramRequiredGb;

  if (fitsFullGpu) {
    result.status = "full_gpu";
    result.offloadPercentage = 100;

    // Estimate speed based on GPU Class
    let baseTps = 40;
    if (specs.gpuClass === "nvidia") {
      if (userVram >= 24) baseTps = 75; // RTX 4090/3090 range
      else if (userVram >= 12) baseTps = 55; // 4070ti / 4070 / 3080 range
      else baseTps = 38; // 4060 / 3060 range
    } else if (specs.gpuClass === "amd") {
      baseTps = userVram >= 16 ? 48 : 32;
    } else if (specs.gpuClass === "intel_arc") {
      baseTps = 30;
    }

    // Larger models get slightly slower execution rates per parameter count
    result.estimatedTps = Math.round(Math.max(15, baseTps - (format.fileSizeGb * 0.45)));
    result.memoryMessage = `Perfect fit! Loads fully in dedicated GPU VRAM (${format.fileSizeGb.toFixed(1)} GB).`;
    result.suitabilityScore = 5;
    result.badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900";
  } else {
    // Check if we can do partial GPU offload or if we are CPU fallback
    const totalMemoryAvailable = userVram + userRam;
    
    if (totalMemoryAvailable >= format.ramRequiredGb) {
      if (userVram > 2) {
        // Shared Layers (Hybrid)
        result.status = "hybrid";
        // Calculate offload ratio
        const offloadedRatio = Math.min(95, Math.round((userVram / format.vramRequiredGb) * 100));
        result.offloadPercentage = offloadedRatio;
        
        // Dynamic speed prediction based on split
        const gpuSpeed = 30;
        const cpuSpeed = 5;
        result.estimatedTps = Math.round(cpuSpeed + ((gpuSpeed - cpuSpeed) * (offloadedRatio / 100) * 0.5));
        result.memoryMessage = `${offloadedRatio}% loaded into GPU VRAM, remainder falls back to system RAM.`;
        result.suitabilityScore = 4;
        result.badgeColor = "bg-sky-100 text-sky-850 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900";
      } else {
        // CPU Only
        result.status = "cpu_only";
        result.offloadPercentage = 0;
        
        let cpuSpeed = 3;
        if (specs.cpuClass === "enthusiast") cpuSpeed = 7;
        else if (specs.cpuClass === "high") cpuSpeed = 5;
        else if (specs.cpuClass === "medium") cpuSpeed = 3;
        else cpuSpeed = 1.2;
        
        // Weight by size of model
        result.estimatedTps = parseFloat((Math.max(0.5, cpuSpeed / (format.fileSizeGb / 4))).toFixed(1)) as any;
        result.memoryMessage = `Runs entirely on your CPU because GPU VRAM is insufficient. Operation will be sluggish.`;
        result.suitabilityScore = 2;
        result.badgeColor = "bg-amber-100 text-amber-850 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900";
      }
    } else {
      // Out of memory completly
      result.status = "out_of_memory";
      result.offloadPercentage = 0;
      result.estimatedTps = 0;
      result.memoryMessage = `Out of Memory. Model requires ~${format.ramRequiredGb} GB available memory, you only have ${userRam} GB RAM.`;
      result.suitabilityScore = 1;
      result.badgeColor = "bg-rose-100 text-rose-800 border-rose-250 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900";
    }
  }

  // Populate Point 3 & Point 4 user-friendly indicators before returning
  const tps = result.estimatedTps || 0;
  if (result.status === "out_of_memory") {
    result.speedPacePhrase = "Unavailable";
    result.speedPaceSymbol = "❌";
    result.speedPaceDesc = "This model is too large for your computer's total memory pool.";
  } else if (tps < 8) {
    result.speedPacePhrase = "Steady Typist";
    result.speedPaceSymbol = "🐌";
    result.speedPaceDesc = "Outputs text word-by-word like a careful human typist. Great for reading along offline.";
  } else if (tps < 18) {
    result.speedPacePhrase = "Natural Reader Pace";
    result.speedPaceSymbol = "🏃";
    result.speedPaceDesc = "Flows at a natural, highly comfortable conversational reading velocity.";
  } else if (tps < 35) {
    result.speedPacePhrase = "Fast Speed-Reader";
    result.speedPaceSymbol = "⚡";
    result.speedPaceDesc = "Outputs answers in seconds! Ideal for fast writing helpers, drafts, and complex summaries.";
  } else {
    result.speedPacePhrase = "Blink-of-an-Eye";
    result.speedPaceSymbol = "🚀";
    result.speedPaceDesc = "Extremely fluid! Generates pages of complex thoughts and essays almost instantly.";
  }

  // Hosting Tier assigning (Point 3)
  if (result.status === "full_gpu") {
    result.hostingTierName = "Tier 3: Infinite Velocity (100% GPU)";
    result.hostingTierDesc = "Runs entirely on your computer's high-speed graphics chip for maximum on-device speed.";
  } else if (result.status === "hybrid") {
    const isHigh = (result.offloadPercentage || 0) >= 70;
    result.hostingTierName = isHigh 
      ? "Tier 2: Co-Pilot (High GPU Memory)" 
      : "Tier 2: Hybrid Assist (Shared Memory)";
    result.hostingTierDesc = isHigh
      ? "Co-processes thoughts primarily in fast dedicated graphics memory, keeping response rates highly fluid."
      : "Shares memory between your graphics chip and system RAM for balanced local execution.";
  } else if (result.status === "cpu_only") {
    result.hostingTierName = "Tier 1: Starter Sandbox (CPU Fallback)";
    result.hostingTierDesc = "Fits inside system memory but runs entirely on standard processor threads. Takes more time.";
  } else {
    result.hostingTierName = "Tier 0: Resource Wall";
    result.hostingTierDesc = "Exceeds your total hardware capacity. Try a lighter model in our catalog!";
  }

  return result as CompatibilityResult;
}
