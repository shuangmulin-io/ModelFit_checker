import { useState, useEffect, useRef } from "react";
import { SystemSpecs, CompatibilityResult, ModelDef, ModelFormat } from "./types";
import { MODELS_DATABASE } from "./data/models";
import { detectSystemSpecs, evaluateModelCompatibility } from "./utils/hardware_detector";
import { 
  Cpu, 
  MessageSquare, 
  Clock, 
  Activity, 
  Layers, 
  Gauge, 
  Sparkles, 
  Send,
  Loader,
  Info,
  Laptop,
  CheckCircle2,
  HardDrive,
  Plus,
  Sun,
  Moon
} from "lucide-react";

interface HardwarePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  specs: SystemSpecs;
}

const HARDWARE_PRESETS: HardwarePreset[] = [
  {
    id: "gaming-rtx4090",
    name: "Gaming Rig (RTX 4090)",
    badge: "Enthusiast",
    description: "Intel i9-14900K, 64GB RAM, RTX 4090 (24GB VRAM)",
    specs: {
      os: "windows",
      cpu: "Intel Core i9-14900K (24 Cores / 32 Threads)",
      cpuClass: "enthusiast",
      cpuIsAppleSilicon: false,
      cpuCores: 24,
      ram: 64,
      gpu: "NVIDIA GeForce RTX 4090",
      vram: 24,
      gpuClass: "nvidia",
      gpus: [
        { name: "NVIDIA GeForce RTX 4090", vram: 24, gpuClass: "nvidia", isActive: true, isTarget: true, type: "discrete" },
        { name: "Intel UHD Graphics 770", vram: 1, gpuClass: "integrated", isActive: false, isTarget: false, type: "integrated" }
      ]
    }
  },
  {
    id: "macbook-m3max",
    name: "MacBook Pro M3 Max 64GB",
    badge: "Apple Silicon",
    description: "Apple M3 Max (16 Cores), 64GB Unified Memory",
    specs: {
      os: "macos",
      cpu: "Apple M3 Max (16 Cores)",
      cpuClass: "apple_silicon",
      cpuIsAppleSilicon: true,
      cpuCores: 16,
      ram: 64,
      gpu: "Apple M3 Max Unified GPU (40-Core)",
      vram: 48,
      gpuClass: "apple_unified",
      gpus: []
    }
  },
  {
    id: "budget-rtx4060",
    name: "Budget Creator Laptop",
    badge: "Mid-Range",
    description: "AMD Ryzen 7, 16GB RAM, RTX 4060 (8GB VRAM)",
    specs: {
      os: "windows",
      cpu: "AMD Ryzen 7 7840HS (8 Cores / 16 Threads)",
      cpuClass: "high",
      cpuIsAppleSilicon: false,
      cpuCores: 8,
      ram: 16,
      gpu: "NVIDIA GeForce RTX 4060 Laptop GPU",
      vram: 8,
      gpuClass: "nvidia",
      gpus: [
        { name: "NVIDIA GeForce RTX 4060 Laptop GPU", vram: 8, gpuClass: "nvidia", isActive: true, isTarget: true, type: "discrete" },
        { name: "AMD Radeon 780M Graphics", vram: 2, gpuClass: "integrated", isActive: false, isTarget: false, type: "integrated" }
      ]
    }
  },
  {
    id: "macbook-air-m2",
    name: "MacBook Air M2 16GB",
    badge: "Ultraportable",
    description: "Apple M2 (8 Cores), 16GB Unified Memory",
    specs: {
      os: "macos",
      cpu: "Apple M2 (8 Cores)",
      cpuClass: "apple_silicon",
      cpuIsAppleSilicon: true,
      cpuCores: 8,
      ram: 16,
      gpu: "Apple M2 Unified GPU (10-Core)",
      vram: 12,
      gpuClass: "apple_unified",
      gpus: []
    }
  },
  {
    id: "entry-laptop",
    name: "Budget Laptop 8GB",
    badge: "Entry",
    description: "Intel i5, 8GB RAM, Integrated Graphics",
    specs: {
      os: "windows",
      cpu: "Intel Core i5-1235U (10 Cores)",
      cpuClass: "medium",
      cpuIsAppleSilicon: false,
      cpuCores: 10,
      ram: 8,
      gpu: "Intel Iris Xe Graphics",
      vram: 4,
      gpuClass: "integrated",
      gpus: [
        { name: "Intel Iris Xe Graphics", vram: 4, gpuClass: "integrated", isActive: true, isTarget: true, type: "integrated" }
      ]
    }
  }
];

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem("modelfit_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("modelfit_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Server Analytics state
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    totalRequests: number;
    totalTokensConsumed: number;
    requestsByEndpoint: Record<string, number>;
    requestLogs: Array<{
      id: string;
      timestamp: number;
      endpoint: string;
      ip: string;
      tokensEstimated: number;
      status: number;
    }>;
    rateLimitMax: number;
    rateLimitWindowSeconds: number;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleResetAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics/reset", { method: "POST" });
      if (res.ok) {
        fetchAnalytics();
      }
    } catch (e) {
      console.error("Failed to reset analytics", e);
    }
  };

  const handleExportAnalyticsCSV = () => {
    window.open("/api/analytics/export", "_blank");
  };

  useEffect(() => {
    if (showAnalyticsModal) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 5000);
      return () => clearInterval(interval);
    }
  }, [showAnalyticsModal]);

  // 1. Core Hardware Specifications State
  const [specs, setSpecs] = useState<SystemSpecs>({
    os: "windows",
    cpu: "Detecting CPU...",
    cpuClass: "medium",
    cpuIsAppleSilicon: false,
    cpuCores: 8,
    ram: 16,
    gpu: "Detecting Graphic Card...",
    vram: 4,
    gpuClass: "integrated",
    gpus: []
  });

  const [formSpecs, setFormSpecs] = useState<SystemSpecs>({
    os: "windows",
    cpu: "",
    cpuClass: "medium",
    cpuIsAppleSilicon: false,
    cpuCores: 8,
    ram: "" as any,
    gpu: "",
    vram: "" as any,
    gpuClass: "nvidia",
    gpus: []
  });

  const [hasSecondaryGpu, setHasSecondaryGpu] = useState<boolean>(false);
  const [isEditingSpecs, setIsEditingSpecs] = useState<boolean>(true);

  // 2. Selection & Filter states
  const [modelsList, setModelsList] = useState<ModelDef[]>(MODELS_DATABASE);
  const [isLoadingLiveModels, setIsLoadingLiveModels] = useState<boolean>(true);
  const [catalogSource, setCatalogSource] = useState<"hf_top_100" | "offline_curated">("hf_top_100");
  const [lastCacheUpdateAt, setLastCacheUpdateAt] = useState<string>("");

  const [selectedModel, setSelectedModel] = useState<ModelDef>(MODELS_DATABASE[0]);
  const [selectedFormat, setSelectedFormat] = useState<ModelFormat>(MODELS_DATABASE[0].formats[0]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [useCaseFilter, setUseCaseFilter] = useState<string>("All");
  const [fitFilter, setFitFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "speed" | "size">("date");

  // Custom User-Inputted Models State
  const [customModels, setCustomModels] = useState<ModelDef[]>([]);
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [isAnalyzingCustom, setIsAnalyzingCustom] = useState<boolean>(false);
  const [customFormError, setCustomFormError] = useState<string>("");
  const [customPinSuccess, setCustomPinSuccess] = useState<boolean>(false);
  
  // Parsed AI model parameters
  const [analyzedResult, setAnalyzedResult] = useState<{
    name: string;
    creator: string;
    parameterSize: number;
    quantBits: number;
    useCase: "General" | "Coding" | "Reasoning" | "Lightweight";
    explanation: string;
    popularCommand: string;
  } | null>(null);

  // 3. AI Advisor Chat states
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "model"; content: string }>>([
    {
      role: "model",
      content: "Hello! I'm your friendly **ModelFit Companion**! 💻 I've scanned your computer's setup automatically, and I'm here to explain how AI models will run on your system in completely simple, everyday language. No scary tech jargon here! I can make fun comparisons (like graphics card memory to your kitchen table paper space) or recommend the perfect models for you. What would you like to know?"
    }
  ]);
  const [userInput, setUserInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Run initial hardware scan on client mount
  const handleAutoDetect = () => {
    const detected = detectSystemSpecs();
    const finalSpecs: SystemSpecs = {
      os: (detected.os as any) || "windows",
      cpu: detected.cpu || "Unknown Processor Model",
      cpuClass: (detected.cpuClass as any) || "medium",
      cpuIsAppleSilicon: detected.cpuIsAppleSilicon || false,
      cpuCores: detected.cpuCores || 8,
      ram: detected.ram || 16,
      gpu: detected.gpu || "Integrated Graphic Adapter",
      vram: detected.vram || 4,
      gpuClass: (detected.gpuClass as any) || "integrated",
      gpus: detected.gpus || []
    };
    
    setSpecs(finalSpecs);
    setFormSpecs({
      os: (detected.os as any) || "windows",
      cpu: "",
      cpuClass: "medium",
      cpuIsAppleSilicon: false,
      cpuCores: 8,
      ram: "" as any,
      gpu: "",
      vram: "" as any,
      gpuClass: "nvidia",
      gpus: []
    });
    setHasSecondaryGpu(false);
  };

  const handleUpdateRam = (newRam: number) => {
    setSpecs(prev => {
      const isApple = prev.gpuClass === "apple_unified";
      const targetVram = isApple ? Math.round(newRam * 0.75) : prev.vram;
      const updatedGpus = prev.gpus.map(g => {
        if (g.isTarget) {
          return { ...g, vram: targetVram };
        }
        return g;
      });
      return {
        ...prev,
        ram: newRam,
        vram: targetVram,
        gpus: updatedGpus.length > 0 ? updatedGpus : [{
          name: prev.gpu,
          vram: targetVram,
          gpuClass: prev.gpuClass,
          isActive: true,
          isTarget: true,
          type: isApple ? "unified" as const : prev.gpuClass === "integrated" ? "integrated" as const : "discrete" as const
        }]
      };
    });
  };

  const handleUpdateVram = (newVram: number) => {
    setSpecs(prev => {
      const updatedGpus = prev.gpus.map(g => {
        if (g.isTarget) {
          return { ...g, vram: newVram };
        }
        return g;
      });
      return {
        ...prev,
        vram: newVram,
        gpus: updatedGpus.length > 0 ? updatedGpus : [{
          name: prev.gpu,
          vram: newVram,
          gpuClass: prev.gpuClass,
          isActive: true,
          isTarget: true,
          type: prev.gpuClass === "apple_unified" ? "unified" as const : prev.gpuClass === "integrated" ? "integrated" as const : "discrete" as const
        }]
      };
    });
  };

  const handleUpdateCpuCores = (cores: number) => {
    setSpecs(prev => ({ ...prev, cpuCores: cores }));
  };

  const handleUpdateGpuClass = (gpuClass: typeof specs.gpuClass) => {
    setSpecs(prev => {
      const defaultName = gpuClass === "nvidia" ? "NVIDIA GeForce RTX Studio (Custom)" :
                          gpuClass === "amd" ? "AMD Radeon Pro Series (Custom)" :
                          gpuClass === "apple_unified" ? "Apple Unified Silicon Graphics" : 
                          gpuClass === "intel_arc" ? "Intel Arc Graphics Premium" : "Integrated HD Graphics";
      const type = gpuClass === "apple_unified" ? "unified" as const : gpuClass === "integrated" ? "integrated" as const : "discrete" as const;
      const isApple = gpuClass === "apple_unified";
      const targetVram = isApple ? Math.round(prev.ram * 0.75) : prev.vram;
      
      const customGpu = {
        name: prev.gpu.includes("Detecting") ? defaultName : prev.gpu,
        vram: targetVram,
        gpuClass,
        isActive: true,
        isTarget: true,
        type
      };
      return {
        ...prev,
        gpuClass,
        vram: targetVram,
        gpu: customGpu.name,
        gpus: [customGpu],
        cpuIsAppleSilicon: isApple,
        cpuClass: isApple ? "apple_silicon" as const : prev.cpuClass
      };
    });
  };

  const handleUpdateOs = (os: typeof specs.os) => {
    setSpecs(prev => ({ ...prev, os }));
  };

  const handleOpenSpecsEditor = () => {
    setFormSpecs(specs);
    setHasSecondaryGpu(!!(specs.gpus && specs.gpus.length > 1));
    setIsEditingSpecs(true);
  };

  const handleApplyPreset = (preset: HardwarePreset) => {
    setSpecs(preset.specs);
    setFormSpecs(preset.specs);
    setHasSecondaryGpu(!!(preset.specs.gpus && preset.specs.gpus.length > 1));
    setIsEditingSpecs(false);
  };

  const handleApplyComputedSpecs = () => {
    const finalGpus: any[] = [];
    
    // Auto-detect inferred GPU brand classification based on GPU name string to keep inputs simple
    let inferredGpuClass = formSpecs.gpuClass || "integrated";
    const gpuLower = (formSpecs.gpu || "").toLowerCase();
    
    const isIntegrated = gpuLower.includes("integrated") || 
                         gpuLower.includes("uhd") || 
                         gpuLower.includes("iris") || 
                         gpuLower.includes("igpu") || 
                         gpuLower.includes("hd graphics") || 
                         gpuLower.includes("shared") || 
                         gpuLower.includes("610m") || 
                         gpuLower.includes("680m") || 
                         gpuLower.includes("780m") || 
                         (gpuLower.includes("radeon") && (gpuLower.includes("graphics") || gpuLower.includes("tm") || gpuLower.includes("vega")));

    if (isIntegrated) {
      inferredGpuClass = "integrated";
    } else if (gpuLower.includes("nvidia") || gpuLower.includes("rtx") || gpuLower.includes("gtx") || gpuLower.includes("geforce") || gpuLower.includes("quadro") || gpuLower.includes("tesla") || gpuLower.includes("a100") || gpuLower.includes("h100") || gpuLower.includes("l4")) {
      inferredGpuClass = "nvidia";
    } else if (gpuLower.includes("apple") || gpuLower.includes("m-series") || gpuLower.includes("m1") || gpuLower.includes("m2") || gpuLower.includes("m3") || gpuLower.includes("m4") || formSpecs.os === "macos") {
      inferredGpuClass = "apple_unified";
    } else if (gpuLower.includes("amd") || gpuLower.includes("radeon") || gpuLower.includes("rx") || gpuLower.includes("navi")) {
      inferredGpuClass = "amd";
    } else if (gpuLower.includes("arc") || gpuLower.includes("intel arc") || gpuLower.includes("b950") || gpuLower.includes("a770") || gpuLower.includes("a750")) {
      inferredGpuClass = "intel_arc";
    } else if (gpuLower.includes("intel") || gpuLower.includes("iris") || gpuLower.includes("uhd") || gpuLower.includes("hd graphics") || gpuLower.includes("integrated") || gpuLower.includes("igpu")) {
      inferredGpuClass = "integrated";
    }

    const isApple = inferredGpuClass === "apple_unified";
    const primaryVram = isApple ? Math.round(formSpecs.ram * 0.75) : formSpecs.vram;
    
    // 1. Primary target GPU
    const primaryGpuObj = {
      name: formSpecs.gpu || (inferredGpuClass === "nvidia" ? "NVIDIA GeForce GPU" : inferredGpuClass === "amd" ? "AMD Radeon GPU" : inferredGpuClass === "intel_arc" ? "Intel Arc GPU" : "Integrated Graphics Adapter"),
      vram: primaryVram,
      gpuClass: inferredGpuClass,
      isActive: true,
      isTarget: true,
      type: isApple ? "unified" as const : inferredGpuClass === "integrated" ? "integrated" as const : "discrete" as const
    };
    finalGpus.push(primaryGpuObj);

    // 2. Secondary Companion GPU
    if (hasSecondaryGpu && !isApple) {
      const existingCompanion = formSpecs.gpus?.find(g => !g.isTarget);
      const secondGpuObj = {
        name: existingCompanion?.name || "Intel HD/Iris Xe Graphics (Integrated Companion)",
        vram: existingCompanion?.vram || 2,
        gpuClass: existingCompanion?.gpuClass || "integrated",
        isActive: false,
        isTarget: false,
        type: "integrated" as const
      };
      finalGpus.push(secondGpuObj);
    }

    // Auto-estimate cpuCores based on the input CPU string to keep the form simple and intuitive
    let estimatedCpuCores = 8;
    const cpuLower = (formSpecs.cpu || "").toLowerCase();
    
    if (isApple) {
      if (cpuLower.includes("ultra")) {
        estimatedCpuCores = 24;
      } else if (cpuLower.includes("max")) {
        estimatedCpuCores = 16;
      } else if (cpuLower.includes("pro")) {
        estimatedCpuCores = 12;
      } else {
        estimatedCpuCores = 8;
      }
    } else {
      if (cpuLower.includes("threadripper") || cpuLower.includes("epyc") || cpuLower.includes("xeon")) {
        estimatedCpuCores = 64;
      } else if (cpuLower.includes("ryzen 9") || cpuLower.includes("i9-") || cpuLower.includes("7950x") || cpuLower.includes("7900x") || cpuLower.includes("13900") || cpuLower.includes("14900")) {
        estimatedCpuCores = 32;
      } else if (cpuLower.includes("ryzen 7") || cpuLower.includes("i7-") || cpuLower.includes("13700") || cpuLower.includes("14700") || cpuLower.includes("12700") || cpuLower.includes("5800x")) {
        estimatedCpuCores = 16;
      } else if (cpuLower.includes("ryzen 5") || cpuLower.includes("i5-") || cpuLower.includes("13600") || cpuLower.includes("14600") || cpuLower.includes("12600") || cpuLower.includes("5600x")) {
        estimatedCpuCores = 12;
      } else if (cpuLower.includes("ryzen 3") || cpuLower.includes("i3-") || cpuLower.includes("celeron") || cpuLower.includes("pentium")) {
        estimatedCpuCores = 4;
      } else {
        estimatedCpuCores = formSpecs.cpuCores || 8;
      }
    }

    let cpuClass: typeof specs.cpuClass = "medium";
    if (isApple) {
      cpuClass = "apple_silicon";
    } else if (estimatedCpuCores >= 32) {
      cpuClass = "enthusiast";
    } else if (estimatedCpuCores >= 16) {
      cpuClass = "high";
    } else if (estimatedCpuCores < 6) {
      cpuClass = "low";
    }

    const finalPayload: SystemSpecs = {
      ...formSpecs,
      gpuClass: inferredGpuClass,
      cpuCores: estimatedCpuCores,
      cpuClass,
      cpuIsAppleSilicon: isApple,
      vram: primaryVram,
      gpu: primaryGpuObj.name,
      gpus: finalGpus
    };

    setSpecs(finalPayload);
    setIsEditingSpecs(false);
  };

  // Auto-run scanner and fetch Hugging Face top 100 models on mount
  useEffect(() => {
    handleAutoDetect();

    let active = true;
    const fetchModels = async () => {
      try {
        setIsLoadingLiveModels(true);
        const res = await fetch("/api/top-models");
        if (!res.ok) throw new Error("Failed to load HF models");
        const data = await res.json();
        if (active) {
          if (data && Array.isArray(data.models) && data.models.length > 0) {
            setModelsList(data.models);
            setLastCacheUpdateAt(data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : "");
            
            // Set first item as default selected
            setSelectedModel(data.models[0]);
            if (data.models[0].formats && data.models[0].formats.length > 0) {
              const q4 = data.models[0].formats.find((f: any) => f.quant === "Q4_K_M");
              setSelectedFormat(q4 || data.models[0].formats[0]);
            }
          } else {
            setModelsList(MODELS_DATABASE);
            setCatalogSource("offline_curated");
          }
        }
      } catch (err) {
        console.error("Failed to load Hugging Face top models, defaulting to local list", err);
        if (active) {
          setModelsList(MODELS_DATABASE);
          setCatalogSource("offline_curated");
        }
      } finally {
        if (active) {
          setIsLoadingLiveModels(false);
        }
      }
    };
    fetchModels();
    return () => { active = false; };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isSending]);

  // Sync format selection options when selecting a new model
  useEffect(() => {
    if (selectedModel && selectedModel.formats.length > 0) {
      // Prefer Q4_K_M as standard default if available, else first
      const q4 = selectedModel.formats.find(f => f.quant === "Q4_K_M");
      setSelectedFormat(q4 || selectedModel.formats[0]);
    }
  }, [selectedModel]);

  // Custom Model Dynamic Simulator Logic & Math Calculations
  const getSimulatedQuantType = (bits: number): "Q4_K_M" | "Q8_0" | "FP16" => {
    if (bits === 8) return "Q8_0";
    if (bits >= 16) return "FP16";
    return "Q4_K_M";
  };

  const simulatedCustomFileSizeGb = analyzedResult
    ? parseFloat(((analyzedResult.parameterSize * analyzedResult.quantBits) / 8 + 0.5).toFixed(1))
    : 0;

  const simulatedCustomVramRequiredGb = parseFloat((simulatedCustomFileSizeGb + 1.8).toFixed(1));
  const simulatedCustomRamRequiredGb = parseFloat((simulatedCustomFileSizeGb + 2.5).toFixed(1));

  const simulatedCustomFormat: ModelFormat = {
    quant: getSimulatedQuantType(analyzedResult?.quantBits || 4),
    name: analyzedResult ? `${analyzedResult.quantBits}-bit Quantized` : "4-bit Quantized",
    fileSizeGb: simulatedCustomFileSizeGb,
    vramRequiredGb: simulatedCustomVramRequiredGb,
    ramRequiredGb: simulatedCustomRamRequiredGb,
    qualityScore: analyzedResult ? (analyzedResult.quantBits === 8 ? 98 : analyzedResult.quantBits === 16 ? 100 : 90) : 90
  };

  const simulatedCompatibilityResult = evaluateModelCompatibility(
    specs,
    "custom-simulation-id",
    analyzedResult?.name || "Custom Model",
    simulatedCustomFormat
  );

  const selectedCompatibilityResult = evaluateModelCompatibility(
    specs,
    selectedModel.id,
    selectedModel.name,
    selectedFormat
  );

  const handleAnalyzeCustomModel = async () => {
    setCustomFormError("");
    setAnalyzedResult(null);
    
    const trimInput = customModelInput.trim();
    if (!trimInput) {
      setCustomFormError("Please enter a model name first!");
      return;
    }
    
    setIsAnalyzingCustom(true);
    try {
      const res = await fetch("/api/analyze-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName: trimInput })
      });
      if (!res.ok) {
        throw new Error("Analysis failed");
      }
      const data = await res.json();
      setAnalyzedResult(data);
    } catch (err) {
      console.error(err);
      setCustomFormError("Could not complete AI analysis. Please check your internet connection.");
    } finally {
      setIsAnalyzingCustom(false);
    }
  };

  const handlePinCustomModel = () => {
    if (!analyzedResult) return;
    
    const formattedId = `custom-${Date.now()}`;
    const newModel: ModelDef = {
      id: formattedId,
      name: analyzedResult.name,
      creator: analyzedResult.creator,
      parameters: `${analyzedResult.parameterSize}B`,
      type: analyzedResult.useCase,
      description: analyzedResult.explanation || `Custom model found on Hugging Face. Param size: ${analyzedResult.parameterSize}B.`,
      popularCommand: analyzedResult.popularCommand || `ollama run ${analyzedResult.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      ollamaName: analyzedResult.popularCommand ? analyzedResult.popularCommand.replace("ollama run ", "") : `${analyzedResult.name.toLowerCase()}`,
      useCase: analyzedResult.useCase,
      lastUpdated: new Date().toISOString().substring(0, 7),
      formats: [simulatedCustomFormat]
    };

    setCustomModels(prev => [newModel, ...prev]);
    setSelectedModel(newModel);
    setSelectedFormat(simulatedCustomFormat);
    
    // Clear input bar and show pin feedback
    setCustomModelInput("");
    setCustomPinSuccess(true);
    setTimeout(() => {
      setCustomPinSuccess(false);
    }, 4000);
  };

  // Helper to determine user-friendly Fit Label and styling details
  const getFitStatusDetails = (result: CompatibilityResult) => {
    if (result.status === "full_gpu") {
      return {
        label: "Perfect",
        colorClass: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-[4px] font-semibold text-[10.5px] font-mono inline-block text-center shadow-sm"
      };
    } else if (result.status === "hybrid") {
      const isHigh = result.offloadPercentage >= 70;
      return {
        label: isHigh ? "Good" : "Marginal",
        colorClass: isHigh 
          ? "text-lime-400 bg-lime-500/10 border border-lime-500/25 px-2 py-0.5 rounded-[4px] font-semibold text-[10.5px] font-mono inline-block text-center shadow-sm"
          : "text-violet-400 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-[4px] font-semibold text-[10.5px] font-mono inline-block text-center shadow-sm"
      };
    } else if (result.status === "cpu_only") {
      return {
        label: "Marginal",
        colorClass: "text-violet-400 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-[4px] font-semibold text-[10.5px] font-mono inline-block text-center shadow-sm"
      };
    } else {
      return {
        label: "Incompatible",
        colorClass: "text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-[4px] font-semibold text-[10.5px] font-mono inline-block text-center shadow-sm"
      };
    }
  };

  const customFitDetails = getFitStatusDetails(simulatedCompatibilityResult);

  // Evaluate & calculate compatibility results for all models
  const activeBaseModels = catalogSource === "hf_top_100" ? modelsList : MODELS_DATABASE;
  const allModelsSource = [...activeBaseModels, ...customModels];

  const baseEvaluated = allModelsSource.flatMap(m => 
    m.formats.map(f => {
      const result = evaluateModelCompatibility(specs, m.id, m.name, f);
      const fitDetails = getFitStatusDetails(result);
      return {
        model: m,
        format: f,
        result,
        fitLabel: fitDetails.label
      };
    })
  );

  const filteredModels = baseEvaluated.filter(item => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" || 
      item.model.name.toLowerCase().includes(query) ||
      item.model.creator.toLowerCase().includes(query) ||
      item.model.description.toLowerCase().includes(query) ||
      item.format.quant.toLowerCase().includes(query);

    // 2. Use Case Filter
    const matchesUseCase = useCaseFilter === "All" || item.model.useCase === useCaseFilter;

    // 3. Fit Filter
    const matchesFit = fitFilter === "All" || item.fitLabel === fitFilter;

    return matchesSearch && matchesUseCase && matchesFit;
  });

  // Sort logic
  filteredModels.sort((a, b) => {
    if (sortBy === "date") {
      const dateA = a.model.lastUpdated || "2000-01";
      const dateB = b.model.lastUpdated || "2000-01";
      return dateB.localeCompare(dateA); // Newest first
    }
    if (sortBy === "name") {
      return a.model.name.localeCompare(b.model.name);
    }
    if (sortBy === "speed") {
      return b.result.estimatedTps - a.result.estimatedTps; // Fastest first
    }
    if (sortBy === "size") {
      return a.format.fileSizeGb - b.format.fileSizeGb; // Smallest first
    }
    return 0;
  });

  // Calculate global LLMFit score out of 100
  const calculateLLMFitScore = (): number => {
    let score = 15; // Base fallback
    
    // RAM contribution (Max 35 points)
    if (specs.ram >= 64) score += 35;
    else if (specs.ram >= 32) score += 30;
    else if (specs.ram >= 16) score += 22;
    else if (specs.ram >= 8) score += 12;
    else score += 4;

    // VRAM/GPU class contribution (Max 45 points)
    if (specs.gpuClass === "apple_unified") {
      const unifiedCap = specs.ram * 0.75;
      if (unifiedCap >= 32) score += 45;
      else if (unifiedCap >= 16) score += 38;
      else if (unifiedCap >= 10) score += 30;
      else score += 18;
    } else {
      if (specs.vram >= 24) score += 45;
      else if (specs.vram >= 16) score += 40;
      else if (specs.vram >= 12) score += 35;
      else if (specs.vram >= 8) score += 28;
      else if (specs.vram >= 6) score += 20;
      else if (specs.vram >= 4) score += 12;
      else score += 3;
    }

    // CPU/Processor contributor (Max 20 points)
    if (specs.cpuClass === "enthusiast" || specs.cpuClass === "apple_silicon") score += 20;
    else if (specs.cpuClass === "high") score += 16;
    else if (specs.cpuClass === "medium") score += 11;
    else score += 5;

    return Math.min(100, score);
  };

  const llmFitScore = calculateLLMFitScore();

  // Resource projections: 
  const getResourceProjections = () => {
    const fileSizeVal = selectedFormat.fileSizeGb;
    
    let isApple = specs.gpuClass === "apple_unified";
    let vramAlloc = 0;
    let ramAlloc = 0;

    if (isApple) {
      const usableUnified = specs.ram * 0.75;
      vramAlloc = Math.min(100, Math.round((fileSizeVal / usableUnified) * 100));
      ramAlloc = Math.min(100, Math.round((fileSizeVal / specs.ram) * 100));
    } else {
      if (specs.vram > 0.5) {
        vramAlloc = Math.min(100, Math.round((fileSizeVal / specs.vram) * 100));
        // RAM usage is safety overflow
        if (fileSizeVal > specs.vram) {
          ramAlloc = Math.min(100, Math.round(((fileSizeVal - specs.vram) / specs.ram) * 100));
        } else {
          ramAlloc = 10; // basic loader index
        }
      } else {
        // CPU fallback completely
        vramAlloc = 0;
        ramAlloc = Math.min(100, Math.round((fileSizeVal / specs.ram) * 100));
      }
    }

    return {
      vramPercent: vramAlloc,
      ramPercent: ramAlloc,
      cpuPercent: selectedFormat.fileSizeGb > 16 ? 45 : (selectedFormat.fileSizeGb > 8 ? 25 : 12)
    };
  };

  const projections = getResourceProjections();

  // Recommended backend selection
  const getRecommendedBackend = () => {
    if (specs.os === "macos" && specs.cpuIsAppleSilicon) {
      return {
        name: "Ollama (Metal Accelerated)",
        description: "Optimal performance on Apple Silicon. Metal leverages unified memory bandwidth seamlessly."
      };
    }
    if (specs.gpuClass === "nvidia") {
      return {
        name: "Ollama (CUDA Accelerated)",
        description: "CUDA cores provide maximum parallel execution capability for GGUF/exl2 models."
      };
    }
    if (specs.gpuClass === "amd" && specs.os === "linux") {
      return {
        name: "Ollama with ROCm Support",
        description: "Native ROCm driver provides near-native execution throughput for Radeon cards on Linux."
      };
    }
    return {
      name: "llama.cpp (CPU GGUF Fallback)",
      description: "Uses AVX2 vector optimizations to pipe computations across standard processor threads securely."
    };
  };

  const backendInfo = getRecommendedBackend();

  // trigger chat message API call
  const handleSendMessage = async (textToSend?: string) => {
    const rawMsg = textToSend || userInput;
    if (!rawMsg.trim()) return;

    setUserInput("");
    const newHistory = [...chatHistory, { role: "user" as const, content: rawMsg }];
    setChatHistory(newHistory);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemSpecs: specs,
          message: rawMsg,
          history: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error on back-channel chat handler");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setChatHistory([...newHistory, { role: "model", content: data.text }]);
    } catch (err: any) {
      setChatHistory([
        ...newHistory,
        {
          role: "model",
          content: `⚠️ **AI Advisor Connection Interrupted**: ${err.message || "Failed to reach adviser. Please verify your GEMINI_API_KEY is configured in Settings > Secrets."}`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Quick prompt helper
  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  return (
    <div className={`min-h-screen app-bg flex flex-col font-sans antialiased transition-colors duration-300 ${theme === "dark" ? "dark" : ""}`} id="main-view">
      {/* 1. Header block */}
      <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center ${theme === 'dark' ? 'bg-[#1e293b] border-slate-705 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'} p-3 sm:p-4 rounded-b-lg border-b shadow-xl gap-3 sm:gap-4 md:gap-0 transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-inner select-none">
            MF
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-none tracking-tight flex items-center gap-1.5">
              ModelFit Analyzer
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono tracking-normal px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO v2.4.0
              </span>
            </h1>
            <p className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1 sm:mt-0.5`}>Local LLM Compatibility & Hardware Optimization Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-800 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/40' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
            title="View Server Rate Limiting & Token Analytics"
          >
            <Activity className="w-4 h-4 text-indigo-500" />
            <span>API Analytics</span>
          </button>

          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750' 
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
            }`}
            title={theme === 'dark' ? "Switch to Pristine Light Mode" : "Switch to Rich Dark Luxury Canvas"}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className={`text-left sm:text-right ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-100 border-slate-200'} border rounded-lg px-3 py-1 sm:px-3.5 sm:py-1.5 shadow-inner w-auto`}>
            <span className="text-[9px] uppercase text-slate-500 font-extrabold tracking-widest block leading-none">System Status</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Inference Ready
            </span>
          </div>
        </div>
      </header>

      {/* Analytics Modal Dialog */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-3xl rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl'} flex flex-col max-h-[90vh] overflow-hidden`}>
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-indigo-600/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  📊
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    Server-Side Rate Limiting & Token Usage Analytics
                  </h3>
                  <p className="text-xs text-slate-400">Track API call frequency, estimated token consumption, and rate limits</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnalyticsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors font-mono text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {analyticsLoading && !analyticsData ? (
                <div className="py-12 text-center text-slate-400 font-mono animate-pulse">
                  Loading live server metrics...
                </div>
              ) : analyticsData ? (
                <>
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-950/40 border border-indigo-500/25 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total API Calls</span>
                      <span className="text-2xl font-bold font-mono text-indigo-400">{analyticsData.totalRequests}</span>
                      <span className="text-[10px] text-slate-500">Processed securely on server</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/40 border border-emerald-500/25 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Est. Token Consumption</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400">{analyticsData.totalTokensConsumed.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">Prompt + completion tokens</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-950/40 border border-amber-500/25 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Rate Limit Policy</span>
                      <span className="text-xl font-bold font-mono text-amber-400">{analyticsData.rateLimitMax} req / min</span>
                      <span className="text-[10px] text-slate-500">Anti-abuse bucket enforced</span>
                    </div>
                  </div>

                  {/* Endpoints Breakdown */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-300 font-mono text-xs uppercase tracking-wider">Requests by Endpoint</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(analyticsData.requestsByEndpoint || {}).map(([ep, count]) => (
                        <div key={ep} className="p-2.5 rounded bg-slate-950/50 border border-slate-800 flex items-center justify-between font-mono">
                          <span className="text-indigo-300 truncate">{ep}</span>
                          <span className="bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">{count} calls</span>
                        </div>
                      ))}
                      {Object.keys(analyticsData.requestsByEndpoint || {}).length === 0 && (
                        <div className="text-slate-500 italic p-2">No API requests recorded yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Request Logs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-300 font-mono text-xs uppercase tracking-wider">Recent Request Audit Log</h4>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleExportAnalyticsCSV}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline cursor-pointer"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={handleResetAnalytics}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                        >
                          Reset Analytics
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/75 max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="p-2.5">Time</th>
                            <th className="p-2.5">Endpoint</th>
                            <th className="p-2.5">Est. Tokens</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {analyticsData.requestLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="p-2.5 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                              <td className="p-2.5 text-indigo-300">{log.endpoint}</td>
                              <td className="p-2.5 text-slate-200">{log.tokensEstimated} tok</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.status === 200 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                  {log.status} {log.status === 429 ? 'Rate Limited' : 'OK'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {analyticsData.requestLogs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-500 italic">No request audit logs found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-rose-400 font-mono">
                  Failed to load analytics metrics from server.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="px-4 py-1.5 rounded bg-indigo-600 text-white font-mono text-xs hover:bg-indigo-500 cursor-pointer transition-colors"
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout containing content and sidebars */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 p-2 sm:p-4 overflow-x-hidden">
        
        {/* Left Side: System specs list and custom model checker */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Detailed specifications readout (Read Only & Custom Overrides) */}
          <div className="glass rounded-lg p-4 sm:p-5 flex flex-col gap-4" id="view-specs-readout">
            <div className="border-b border-slate-700 pb-3 flex justify-between items-start">
              <div className="flex-1 pr-2">
                <h2 className="grid-header text-indigo-400 font-bold">Detailed System Specifications</h2>
                <p className="text-[10.5px] text-indigo-300 font-medium mt-0.5 leading-normal">
                  {!isEditingSpecs 
                    ? "⚠️ If your reported CPU, RAM, or Graphics Card is incorrect, click \"Adjust Specs\" to customize them!"
                    : "Customize the settings below to match your exact machine specs."}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0 mt-0.5">
                {isEditingSpecs ? (
                  <button
                    onClick={() => setIsEditingSpecs(false)}
                    className="text-[9.5px] font-mono px-2 py-1 rounded border border-slate-800 text-slate-400 bg-slate-900 hover:bg-slate-800 hover:text-slate-200 cursor-pointer animate-fade-in font-medium transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={handleOpenSpecsEditor}
                    className="text-[9.5px] font-mono px-2 py-1 rounded transition-all border border-indigo-500/25 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 font-bold cursor-pointer"
                  >
                    ✎ Adjust Specs
                  </button>
                )}
              </div>
            </div>

            {isEditingSpecs ? (
              <div className="space-y-4 pt-1 animate-fade-in text-slate-200">
                {/* Hardware Preset Profiles */}
                <div className="space-y-2 bg-indigo-950/25 p-3 rounded-lg border border-indigo-500/25">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono tracking-wider text-indigo-300 uppercase font-bold flex items-center gap-1.5">
                      <span>⚡</span> Hardware Preset Profiles
                    </label>
                    <span className="text-[9px] font-mono text-slate-400">Instantly switch & compare</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {HARDWARE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="text-left p-2 rounded bg-slate-950/75 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                            {preset.name}
                          </span>
                          <span className="text-[8.5px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Tip */}
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded text-xs leading-relaxed text-indigo-200 space-y-1">
                  <p className="font-semibold text-indigo-300 flex items-center gap-1.5 font-mono text-[11px]">
                    ⚙️ MANUAL HARDWARE PORTAL
                  </p>
                  <p className="text-slate-350 text-[10.5px]">
                    Specify your exact system hardware underneath. Once saved, our compatibility matrix will recalculate local LLM hosting metrics immediately!
                  </p>
                </div>

                {/* OS selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">1. Operating System</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["windows", "macos", "linux"].map(os => (
                      <button
                        key={os}
                        type="button"
                        onClick={() => {
                          setFormSpecs(prev => {
                            const isMac = os === "macos";
                            let nextGpu = prev.gpu;
                            let nextGpuClass = prev.gpuClass;
                            if (isMac && !prev.gpu.toLowerCase().includes("apple") && !prev.gpu.toLowerCase().includes("m1") && !prev.gpu.toLowerCase().includes("m2") && !prev.gpu.toLowerCase().includes("m3") && !prev.gpu.toLowerCase().includes("m4") && !prev.gpu.toLowerCase().includes("m-series")) {
                              nextGpu = "Apple M3 Max Graphics";
                              nextGpuClass = "apple_unified";
                            } else if (!isMac && (prev.gpuClass === "apple_unified" || prev.gpu.toLowerCase().includes("apple"))) {
                              nextGpu = "NVIDIA GeForce RTX 4500 Ada Generation";
                              nextGpuClass = "nvidia";
                            }
                            return {
                              ...prev,
                              os: os as any,
                              gpuClass: nextGpuClass,
                              gpu: nextGpu,
                              cpuIsAppleSilicon: isMac,
                              gpus: isMac ? [] : prev.gpus
                            };
                          });
                          if (os === "macos") {
                            setHasSecondaryGpu(false);
                          }
                        }}
                        className={`py-1 text-xs font-mono capitalize rounded border cursor-pointer transition-all ${
                          formSpecs.os === os 
                            ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm"
                            : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                        }`}
                      >
                        {os}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Processor (CPU) Configuration */}
                <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold border-b border-slate-800 pb-1.5 mb-1">2. Processor (CPU) Model</label>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-450 uppercase">CPU Model Name</label>
                    <input
                      type="text"
                      value={formSpecs.cpu}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormSpecs(prev => ({ ...prev, cpu: val }));
                      }}
                      placeholder="e.g. AMD Ryzen 9 8940HX"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* System RAM selection */}
                <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold border-b border-slate-800 pb-1.5 mb-2">3. System Memory (RAM)</label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="relative w-full sm:w-32 shrink-0">
                      <input
                        type="number"
                        min="2"
                        max="1024"
                        value={formSpecs.ram || ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === "" ? "" as any : Number(raw);
                          setFormSpecs(prev => ({ ...prev, ram: val }));
                        }}
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono pr-8"
                        placeholder="e.g. 16"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold select-none">GB</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal font-sans">
                      Example: <strong>16</strong> (standard laptop), <strong>32</strong> or <strong>64</strong> (power workstation), <strong>128+</strong> (deep inference server).
                    </span>
                  </div>
                </div>

                {/* Primary GPU configuration */}
                <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold border-b border-slate-800 pb-1.5 mb-1 flex items-center justify-between">
                    <span>4. Primary GPU Model Details</span>
                    <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-black">★ INFERENCE TARGET</span>
                  </label>
                  <div className="space-y-1.5">
                    <label className="block text-[9.5px] font-mono text-slate-450 uppercase">Graphics Card Name</label>
                    <input
                      type="text"
                      value={formSpecs.gpu}
                      onChange={(e) => {
                        const val = e.target.value;
                        const lowerVal = val.toLowerCase();
                        let inferredGpuClass: typeof formSpecs.gpuClass = "nvidia";
                        const isIntegrated = lowerVal.includes("integrated") || 
                                             lowerVal.includes("uhd") || 
                                             lowerVal.includes("iris") || 
                                             lowerVal.includes("igpu") || 
                                             lowerVal.includes("hd graphics") || 
                                             lowerVal.includes("shared") || 
                                             lowerVal.includes("610m") || 
                                             lowerVal.includes("680m") || 
                                             lowerVal.includes("780m") || 
                                             (lowerVal.includes("radeon") && (lowerVal.includes("graphics") || lowerVal.includes("tm") || lowerVal.includes("vega")));

                        if (isIntegrated) {
                          inferredGpuClass = "integrated";
                        } else if (lowerVal.includes("nvidia") || lowerVal.includes("rtx") || lowerVal.includes("gtx") || lowerVal.includes("geforce") || lowerVal.includes("quadro") || lowerVal.includes("tesla") || lowerVal.includes("a100") || lowerVal.includes("h100") || lowerVal.includes("l4")) {
                          inferredGpuClass = "nvidia";
                        } else if (lowerVal.includes("apple") || lowerVal.includes("m-series") || lowerVal.includes("m1") || lowerVal.includes("m2") || lowerVal.includes("m3") || lowerVal.includes("m4") || formSpecs.os === "macos") {
                          inferredGpuClass = "apple_unified";
                        } else if (lowerVal.includes("amd") || lowerVal.includes("radeon") || lowerVal.includes("rx") || lowerVal.includes("navi")) {
                          inferredGpuClass = "amd";
                        } else if (lowerVal.includes("arc") || lowerVal.includes("intel arc") || lowerVal.includes("b950") || lowerVal.includes("a770") || lowerVal.includes("a750")) {
                          inferredGpuClass = "intel_arc";
                        }
                        
                        setFormSpecs(prev => ({
                          ...prev,
                          gpu: val,
                          gpuClass: inferredGpuClass
                        }));
                      }}
                      placeholder="e.g. NVIDIA GeForce RTX 4060 Laptop GPU"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {formSpecs.gpuClass === "apple_unified" ? (
                    <div className="p-2 bg-indigo-950/20 border border-indigo-550/10 rounded text-[10px] text-indigo-300 leading-normal">
                      ℹ️ On Apple M-Series Macs, Graphics Memory is shared with System RAM. Under Mac hardware rules, available VRAM scales dynamically up to 75% of your total Memory allocation.
                    </div>
                  ) : formSpecs.gpuClass === "integrated" ? (
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
                      <label className="block text-[9.5px] font-mono text-slate-450 uppercase mb-1">Allocated iGPU VRAM (Shared System RAM)</label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative w-full sm:w-32 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="64"
                            value={formSpecs.vram || ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === "" ? "" as any : Number(raw);
                              setFormSpecs(prev => ({ ...prev, vram: val }));
                            }}
                            className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono pr-8"
                            placeholder="e.g. 4"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold select-none">GB</span>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-normal font-sans">
                          ℹ️ Integrated GPUs pool memory from System RAM. Laptop drivers typically allow allocating <strong>up to 50%</strong> of system RAM as available memory for AI model execution.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
                      <label className="block text-[9.5px] font-mono text-slate-450 uppercase mb-1">Dedicated GPU VRAM</label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative w-full sm:w-32 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="128"
                            value={formSpecs.vram || ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === "" ? "" as any : Number(raw);
                              setFormSpecs(prev => ({ ...prev, vram: val }));
                            }}
                            className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono pr-8"
                            placeholder="e.g. 8"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold select-none">GB</span>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-normal font-sans">
                          Example: <strong>6</strong> or <strong>8</strong> (mid-tier), <strong>12</strong> or <strong>16</strong> (high-end), <strong>24+</strong> (enthusiast).
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional option: 2nd GPU companion setup */}
                {formSpecs.gpuClass !== "apple_unified" && formSpecs.gpuClass !== "integrated" && (
                  <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={hasSecondaryGpu}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setHasSecondaryGpu(isChecked);
                          setFormSpecs(prev => {
                            const existingGpus = prev.gpus || [];
                            const primaryGpu = existingGpus.find(g => g.isTarget) || {
                              name: prev.gpu,
                              vram: prev.vram,
                              gpuClass: prev.gpuClass,
                              isActive: true,
                              isTarget: true,
                              type: "discrete" as const
                            };
                            
                            if (isChecked) {
                              const companionGpu = existingGpus.find(g => !g.isTarget) || {
                                name: "",
                                vram: "" as any,
                                gpuClass: "integrated" as const,
                                isActive: false,
                                isTarget: false,
                                type: "integrated" as const
                              };
                              return {
                                ...prev,
                                gpus: [primaryGpu, companionGpu]
                              };
                            } else {
                              return {
                                ...prev,
                                gpus: [primaryGpu]
                              };
                            }
                          });
                        }}
                        className="rounded text-indigo-600 border-slate-700 bg-slate-950 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Include Secondary/iGPU Companion</span>
                    </label>

                    {hasSecondaryGpu && (
                      <div className="pt-2 pl-3 border-l border-indigo-500/20 space-y-2.5 animate-fade-in">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-mono text-slate-455 uppercase">Secondary Integrated GPU Adapter Name</label>
                          <input
                            type="text"
                            value={formSpecs.gpus?.find(g => !g.isTarget)?.name || ""}
                            onChange={(e) => {
                              const n = e.target.value;
                              const lowerVal = n.toLowerCase();
                              let inferredClass: "integrated" | "nvidia" | "amd" | "intel_arc" | "apple_unified" = "integrated";
                              
                              const isIntegrated = lowerVal.includes("integrated") || 
                                                   lowerVal.includes("uhd") || 
                                                   lowerVal.includes("iris") || 
                                                   lowerVal.includes("igpu") || 
                                                   lowerVal.includes("hd graphics") || 
                                                   lowerVal.includes("shared") || 
                                                   lowerVal.includes("610m") || 
                                                   lowerVal.includes("680m") || 
                                                   lowerVal.includes("780m") || 
                                                   (lowerVal.includes("radeon") && (lowerVal.includes("graphics") || lowerVal.includes("tm") || lowerVal.includes("vega")));

                              if (isIntegrated) {
                                inferredClass = "integrated";
                              } else if (lowerVal.includes("nvidia") || lowerVal.includes("rtx") || lowerVal.includes("gtx") || lowerVal.includes("geforce") || lowerVal.includes("quadro") || lowerVal.includes("tesla")) {
                                inferredClass = "nvidia";
                              } else if (lowerVal.includes("amd") || lowerVal.includes("radeon") || lowerVal.includes("rx") || lowerVal.includes("navi")) {
                                inferredClass = "amd";
                              } else if (lowerVal.includes("arc") || lowerVal.includes("intel arc")) {
                                inferredClass = "intel_arc";
                              }

                              setFormSpecs(prev => {
                                const currentGpus = prev.gpus || [];
                                const updated = currentGpus.map(g => {
                                  if (!g.isTarget) return { name: n, vram: g.vram, gpuClass: inferredClass, isActive: false, isTarget: false, type: inferredClass === "integrated" ? "integrated" as const : "discrete" as const };
                                  return g;
                                });
                                return {
                                  ...prev,
                                  gpus: updated.length > 1 ? updated : [
                                    currentGpus.find(g => g.isTarget) || { name: prev.gpu, vram: prev.vram, gpuClass: prev.gpuClass, isActive: true, isTarget: true, type: "discrete" },
                                    { name: n, vram: 0.5, gpuClass: inferredClass, isActive: false, isTarget: false, type: inferredClass === "integrated" ? "integrated" as const : "discrete" as const }
                                  ]
                                };
                              });
                            }}
                            placeholder="e.g. AMD Radeon(TM) 610M"
                            className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-mono text-slate-455 uppercase">Companion VRAM (MB)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="32768"
                              value={
                                (() => {
                                  const compVram = formSpecs.gpus?.find(g => !g.isTarget)?.vram;
                                  if (compVram === undefined || compVram === "" || isNaN(Number(compVram))) {
                                    return "";
                                  }
                                  return Math.round(Number(compVram) * 1024);
                                })()
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                const mbVal = raw === "" ? "" as any : Number(raw);
                                const gbVal = raw === "" ? "" as any : mbVal / 1024;
                                setFormSpecs(prev => {
                                  const updated = (prev.gpus || []).map(g => {
                                    if (!g.isTarget) return { ...g, vram: gbVal };
                                    return g;
                                  });
                                  return { ...prev, gpus: updated };
                                });
                              }}
                              className="w-full bg-slate-950 text-white border border-slate-800 rounded pl-2.5 pr-8 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 font-bold select-none">MB</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Apply button */}
                <button
                  onClick={handleApplyComputedSpecs}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-md text-xs transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer mt-2 leading-none border border-indigo-500/40"
                >
                  ✓ Set Specs & Compute Compatibility
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* OS info */}
                <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-lg border border-slate-750">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-300">Operating System</span>
                  </div>
                  <span className="text-xs font-mono uppercase bg-slate-900 text-white font-black px-2 py-0.5 rounded border border-slate-700">
                    {specs.os}
                  </span>
                </div>

                {/* CPU info */}
                <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-750 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-300">Processor (CPU)</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/10 px-2 py-0.5 rounded">
                      {specs.cpuCores} Threads
                    </span>
                  </div>
                  <p className="text-xs text-indigo-250 font-mono mt-1 break-words">{specs.cpu}</p>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
                    <span>Architecture Tier</span>
                    <span className="capitalize font-bold text-white">{specs.cpuClass.replace("_", " ")}</span>
                  </div>
                </div>

                {/* Graphics chipset info (Supports Dual/Multi GPU configurations) */}
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">Graphics Core & VRAM</span>
                    </div>
                    <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/20">
                      {specs.gpus && specs.gpus.length > 1 ? "DUAL-GPU DETECTED" : "SINGLE GPU"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {specs.gpus && specs.gpus.length > 0 ? (
                      specs.gpus.map((gpuItem, idx) => {
                        const isBestInference = gpuItem.isTarget;
                        return (
                          <div key={idx} className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all duration-300 ${
                            isBestInference 
                              ? "bg-indigo-950/35 border-indigo-500/40 shadow-sm shadow-indigo-500/5 ring-1 ring-indigo-500/20" 
                              : "bg-slate-900/50 border-slate-800/80 opacity-75 hover:opacity-95"
                          }`}>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[11px] font-mono font-medium text-slate-100 break-words leading-tight flex-1">
                                {gpuItem.name}
                              </span>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {isBestInference ? (
                                  <span className="text-[8px] font-mono tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    ★ AI INFERENCE TARGET
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-mono tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-850 text-slate-450 border border-slate-750">
                                    Secondary / Idle
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1 text-[10px] font-mono border-t border-slate-800/40">
                              <span className="text-slate-400">Class: <strong className="text-slate-300 capitalize">{gpuItem.gpuClass === "apple_unified" ? "Unified Memory" : gpuItem.gpuClass}</strong></span>
                              <span className="text-indigo-300 font-bold">
                                {gpuItem.vram >= 1 
                                  ? `${gpuItem.vram} GB VRAM` 
                                  : `${Math.round(gpuItem.vram * 1024)} MB VRAM`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded text-xs space-y-1.5">
                        <p className="text-indigo-250 font-mono break-words">{specs.gpu}</p>
                        <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
                          <span>Dedicated VRAM</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {specs.vram >= 1 
                              ? `${specs.vram} GB` 
                              : `${Math.round(specs.vram * 1024)} MB`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {specs.gpus && specs.gpus.length > 1 && (
                    <div className="bg-indigo-950/25 border border-indigo-500/15 rounded-md p-2.5 text-[9.5px] leading-relaxed text-indigo-300 space-y-1.5">
                      <p>💡 <strong>Intelligent Platform Multi-GPU Logic:</strong> We detected multiple graphics adapters. To ensure realistic hosting projections, the compatibility score and memory metrics automatically target your more capable GPU (labeled as <strong>★ AI INFERENCE TARGET</strong>) rather than the basic integrated browser renderer.</p>
                      <p className="text-[9px] text-indigo-400">Local model players like Ollama and LM Studio automatically route workloads directly to your high-VRAM discrete GPU when active.</p>
                    </div>
                  )}
                </div>

                {/* System RAM info */}
                <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-750 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <HardDrive className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-300">System memory (RAM)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {specs.ram} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Inference Pool Reservation</span>
                    <span className="font-mono font-black text-rose-300">~{Math.round(specs.ram * 0.9)} GB Limit</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LLM Fit score - relocated below hardware specs */}
          <div className="glass rounded-lg p-4 sm:p-5 flex flex-col justify-between border border-indigo-500/20" id="llm-fit-performance-score">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                LLMFit System Score
              </h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-white tracking-tight">{llmFitScore}</span>
                <span className="text-slate-400 text-sm">/ 100</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    llmFitScore > 80 ? "bg-emerald-400" : llmFitScore > 50 ? "bg-indigo-500" : "bg-amber-400"
                  }`}
                  style={{ width: `${llmFitScore}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Your PC exceeds local hardware metrics for <strong className="text-slate-200">{Math.round(llmFitScore * 0.9 + 5)}%</strong> of standard consumer AI models below 14B.
              </p>
            </div>
          </div>

          {/* Interactive Hugging Face & Custom Model Analyzer */}
          <div className="glass rounded-lg p-4 sm:p-5 flex flex-col gap-4 border border-indigo-550/10" id="custom-model-checker-card">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 rotate-6 animate-pulse" />
                <h2 className="grid-header text-indigo-400 text-sm font-bold">AI Model Checker</h2>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Spotted an LLM online that isn't listed? Type its name below (e.g. Llama 3 8B, DeepSeek R1 1.5B). Our Companion AI will check your compatibility!
              </p>
            </div>

            <div className="space-y-4">
              {/* Input section */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Gemma 2 9B, Granite 3.0" 
                    value={customModelInput}
                    onChange={(e) => {
                      setCustomModelInput(e.target.value);
                      if (customFormError) setCustomFormError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAnalyzeCustomModel();
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-750 hover:border-slate-655 focus:border-indigo-400 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono transition-colors outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-505/20 text-center"
                    disabled={isAnalyzingCustom}
                  />
                  <button
                    onClick={handleAnalyzeCustomModel}
                    disabled={isAnalyzingCustom}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:text-indigo-400 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer select-none flex items-center justify-center min-w-[80px]"
                  >
                    {isAnalyzingCustom ? (
                      <Loader className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : (
                      "Check"
                    )}
                  </button>
                </div>
                {customFormError && (
                  <p className="text-[10px] text-rose-400 font-mono">⚠️ {customFormError}</p>
                )}
              </div>

              {/* Loader message */}
              {isAnalyzingCustom && (
                <div className="p-4 bg-slate-950/40 rounded-lg border border-slate-850/60 flex flex-col items-center justify-center text-center py-6 gap-3">
                  <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-200">Consulting AI Companion Knowledge...</p>
                    <p className="text-[9.5px] text-slate-500 font-mono">Retrieving model metrics and parameters</p>
                  </div>
                </div>
              )}

              {/* Result output when analyzed */}
              {!isAnalyzingCustom && analyzedResult && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-2.5 text-[11px]">
                    
                    {/* Header Spec Info */}
                    <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider">{analyzedResult.creator}</span>
                        <h4 className="text-xs font-bold text-slate-100 leading-tight">{analyzedResult.name}</h4>
                      </div>
                      <span className={customFitDetails.colorClass}>{customFitDetails.label}</span>
                    </div>

                    {/* Technical details decoded */}
                    <div className="grid grid-cols-3 gap-2 font-mono py-1 text-center border-b border-slate-900 pb-2">
                      <div className="flex flex-col bg-slate-900/40 p-1.5 rounded">
                        <span className="text-slate-550 text-[8px] uppercase font-bold text-slate-400">Parameters</span>
                        <strong className="text-indigo-300 font-bold text-[11px] mt-0.5">{analyzedResult.parameterSize}B</strong>
                      </div>
                      <div className="flex flex-col bg-slate-900/40 p-1.5 rounded">
                        <span className="text-slate-550 text-[8px] uppercase font-bold text-slate-400">Est. Size</span>
                        <strong className="text-indigo-300 font-bold text-[11px] mt-0.5">{simulatedCustomFileSizeGb.toFixed(1)} GB</strong>
                      </div>
                      <div className="flex flex-col bg-slate-900/40 p-1.5 rounded">
                        <span className="text-slate-550 text-[8px] uppercase font-bold text-slate-400 font-bold">Est. Speed</span>
                        <strong className="text-emerald-400 font-bold text-[11px] mt-0.5">{simulatedCompatibilityResult.estimatedTps} TPS</strong>
                      </div>
                    </div>

                    {/* Friendly Companion explanation */}
                    <div className="text-[10.5px] text-slate-300 leading-relaxed bg-slate-900/30 p-2 rounded">
                      💡 <strong>About this model:</strong> {analyzedResult.explanation}
                    </div>

                    {/* Calculated Details */}
                    <div className="text-[10.5px] text-slate-350 leading-relaxed pt-1">
                      ⚡ <strong>How it runs here:</strong> {simulatedCompatibilityResult.memoryMessage}
                    </div>
                  </div>

                  {/* Pin simulation trigger */}
                  <button
                    onClick={handlePinCustomModel}
                    className="w-full bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 font-bold py-2 px-3 rounded-md text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none mt-1"
                    id="btn-pin-model"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Compare on Matrix Table
                  </button>

                  {customPinSuccess && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10.5px] rounded-md text-center transition-all duration-300 font-medium font-mono" id="pin-feedback">
                      🎉 Pinned successfully! Check the main matrix table.
                    </div>
                  )}
                </div>
              )}

              {/* Empty state prompt */}
              {!isAnalyzingCustom && !analyzedResult && null}
            </div>
          </div>

        </aside>

        {/* Right Columns: Main Compatibility Table, Resource Projections, and AI Chat Assistant */}
        <main className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Compatibility table */}
          <div className="glass rounded-lg flex flex-col overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-705/80 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-900/40">
              <div className="space-y-2 flex-1 w-full max-w-xl min-w-[280px]">
                <div className="flex items-center gap-2">
                  <h2 className="grid-header text-indigo-400 leading-none">Model Compatibility Matrix</h2>
                  {isLoadingLiveModels && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-300 font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded animate-pulse">
                      <Loader className="w-3 h-3 animate-spin" /> Fetching Hugging Face List...
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Click any row below to view detailed hardware allocation charts and custom deployment commands.</p>
                
                {/* Dynamic Explainer answering the user's questions about sources and factors */}
                <div className="text-[10px] leading-relaxed text-slate-300 bg-slate-950/50 p-2.5 rounded-md border border-slate-800/80 space-y-1">
                  <div>
                    🌐 <strong className="text-indigo-300">How this list of models is compiled:</strong> Sourced dynamically via the official <strong className="text-white">Hugging Face Model Hub Registry</strong>. The catalog compiles and tracks the top 50 most active models sorted on the platform's official <strong className="text-white">Trending Velocity Metascores</strong>.
                  </div>
                  <div>
                    📊 <strong className="text-indigo-300">Compatibility Factors Analyzed:</strong> Calculated instantly for each model version based on:
                    <ul className="list-disc list-inside ml-2 text-slate-400 mt-0.5 space-y-0.5">
                      <li>Model Parameter Weight Size (extracted using NLP heuristics)</li>
                      <li>Precision Quants (4-bit, 8-bit, FP16) mapped to estimated quantized filesystems</li>
                      <li>Allocation split overhead: VRAM allocation margins (GPU) vs. fallback RAM reserves (CPU) available in your machine</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Weekly Cache Updates & Legend Controls */}
              <div className="flex flex-col gap-2 shrink-0 xl:items-end w-full xl:w-auto">
                <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded bg-indigo-950/60 text-indigo-305 border border-indigo-500/15 shadow-sm">
                    <Clock className="w-2.5 h-2.5 text-indigo-405" />
                    Updates: <strong className="text-white font-semibold">Weekly (Hugging Face Top 50 Trending)</strong>
                    {lastCacheUpdateAt && (
                      <span className="text-[8.5px] text-slate-400 ml-1">({lastCacheUpdateAt})</span>
                    )}
                  </span>

                  <div className="flex gap-2 text-[10px] pl-2 border-l border-slate-700/80">
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> GPU</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span> Hyb</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span> CPU</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal styled interactive filter bar */}
            <div className="p-2.5 sm:p-3 pb-3 sm:pb-3.5 border-b border-slate-707/80 grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-950/40">
              {/* Search box */}
              <div className="relative flex flex-col gap-1">
                <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase">Search Models</span>
                <input
                  type="text"
                  placeholder="Type to search (e.g., Llama)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-750 hover:border-slate-655 focus:border-indigo-400 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono transition-colors focus:ring-1 focus:ring-indigo-500/20 outline-none placeholder:text-slate-600 shadow-inner"
                />
              </div>

              {/* Use Case filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase">Use Case [U]</span>
                <select
                  value={useCaseFilter}
                  onChange={(e) => setUseCaseFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-750 hover:border-slate-655 focus:border-indigo-400 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500/20 cursor-pointer outline-none transition-colors"
                >
                  <option value="All">All Use Cases</option>
                  <option value="Reasoning">Reasoning</option>
                  <option value="General">General Purpose</option>
                  <option value="Multimodal">Multimodal (Vision/Voice)</option>
                  <option value="Coding">Software & Coding</option>
                  <option value="Lightweight">Lightweight / Fast</option>
                </select>
              </div>

              {/* Fit filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase">Fit [f] Filter</span>
                <select
                  value={fitFilter}
                  onChange={(e) => setFitFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-750 hover:border-slate-655 focus:border-indigo-400 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500/20 cursor-pointer outline-none transition-colors"
                >
                  <option value="All">All Fits</option>
                  <option value="Perfect">Perfect (Full GPU Accel)</option>
                  <option value="Good">Good (High GPU Hybrid)</option>
                  <option value="Marginal">Marginal (Low GPU / CPU)</option>
                  <option value="Incompatible">Incompatible</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase">Sort [s] By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-750 hover:border-slate-655 focus:border-indigo-400 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500/20 cursor-pointer outline-none transition-colors"
                >
                  <option value="date">Release Date 🔻</option>
                  <option value="name">Model Name (A-Z)</option>
                  <option value="speed">Inference Speed (est.)</option>
                  <option value="size">Disk Storage Required</option>
                </select>
              </div>
            </div>

            {/* Matrix result grid */}
            <div className="overflow-x-auto overflow-y-auto max-h-[480px] lg:max-h-[540px] w-full">
              {filteredModels.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-full">
                  <thead className="bg-[#1e293b]/70 sticky top-0 border-b border-slate-700/80 z-10 font-mono text-[10px] uppercase text-slate-400 select-none">
                    <tr>
                      <th className="p-2 sm:p-3 pl-3 sm:pl-4">Model & Provider</th>
                      <th className="p-2 sm:p-3">Disk Space</th>
                      <th className="p-2 sm:p-3">tok/s* (Est.)</th>
                      <th className="p-2 sm:p-3 hidden sm:table-cell">Date</th>
                      <th className="p-2 sm:p-3">Fit</th>
                      <th className="p-2 sm:p-3 pr-3 sm:pr-4 text-right hidden md:table-cell">Use Case</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredModels.map(({ model, format, result }) => {
                      const isSelected = selectedModel.id === model.id && selectedFormat.quant === format.quant;
                      const fitDetails = getFitStatusDetails(result);

                      return (
                        <tr 
                          key={`${model.id}-${format.quant}`}
                          onClick={() => {
                            setSelectedModel(model);
                            setSelectedFormat(format);
                          }}
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer text-xs ${
                            isSelected ? "bg-indigo-950/70 hover:bg-indigo-950/80 border-l-4 border-indigo-505 shadow-md" : ""
                          }`}
                          id={`row-${model.id}-${format.quant}`}
                        >
                          <td className="p-2 sm:p-3 pl-3 sm:pl-4 max-w-[140px] sm:max-w-[210px] truncate">
                            <div className="font-bold text-slate-105 flex items-center gap-1.5 flex-wrap">
                              {isSelected && (
                                <span className="text-indigo-400 animate-pulse text-[10px] select-none mr-0.5">▶</span>
                              )}
                              <span>{model.name}</span>
                              {(model as any).hfDownloads !== undefined && (
                                <span className="inline-flex items-center text-[8.5px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-mono scale-[0.95]" title="Hugging Face Weekly Downloads">
                                  ⬇️ {((model as any).hfDownloads).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-405 font-mono mt-0.5">
                              {model.creator} • <span className="text-indigo-300 font-semibold">{model.parameters} params</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 font-mono text-slate-300 whitespace-nowrap">{format.fileSizeGb.toFixed(1)} GB</td>
                          <td className="p-2 sm:p-3 font-mono">
                            {result.estimatedTps > 0 ? (
                              <span className={result.estimatedTps > 20 ? "text-emerald-400 font-bold" : "text-sky-305 font-bold"}>
                                ~{result.estimatedTps.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 font-mono text-slate-405 text-[11px] hidden sm:table-cell">
                            {model.lastUpdated || "2026-06"}
                          </td>
                          <td className="p-2 sm:p-3">
                            <span className={fitDetails.colorClass}>
                              {fitDetails.label}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 pr-3 sm:pr-4 text-right hidden md:table-cell">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-mono tracking-wide text-indigo-305 bg-indigo-950/30 border border-indigo-900/40">
                              {model.useCase || "General"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center space-y-2">
                  <p className="text-sm font-mono text-slate-400">🚨 No model configurations found matching your active filters.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setUseCaseFilter("All");
                      setFitFilter("All");
                    }}
                    className="text-xs font-mono bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-all"
                  >
                    Clear Active Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Points 3 and 4: Approachable Non-Technical Selected Model fitting report */}
          <div className="glass rounded-lg border border-indigo-500/25 p-4 sm:p-5 space-y-4 shadow-xl shadow-slate-950/20" id="selected-model-approachable-report">
            <div className="border-b border-slate-700/60 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[9.5px] font-mono tracking-wider font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded shadow-sm inline-block">
                  🎯 Active Option Analysis
                </span>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-1 flex-wrap font-sans">
                  <span>{selectedModel.name}</span>
                  <span className="text-slate-400 font-normal">({selectedFormat.name.split("(")[0].trim()})</span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                💾 File memory footprint: <strong className="text-white">{selectedFormat.fileSizeGb.toFixed(1)} GB</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Point 3 - Hosting Pool Allocation Level */}
              <div className="p-3.5 bg-indigo-950/20 border border-slate-800 rounded-lg space-y-2 flex flex-col justify-between hover:border-slate-705 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Local Hosting Pool Level</span>
                  </div>
                  <h4 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                    🏢 {selectedCompatibilityResult.hostingTierName || "Host Level Evaluation"}
                  </h4>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans mt-1">
                    {selectedCompatibilityResult.hostingTierDesc || "Loading level details..."}
                  </p>
                </div>
                <div className="pt-2 text-[9.5px] text-slate-500 border-t border-slate-850 flex items-center justify-between">
                  <span>Resource allocation structure</span>
                  <span className="font-semibold text-slate-300">
                    {selectedCompatibilityResult.status === "full_gpu" ? "100% Secure GPU" : 
                     selectedCompatibilityResult.status === "hybrid" ? `${selectedCompatibilityResult.offloadPercentage}% Graphics / Fallback` : 
                     selectedCompatibilityResult.status === "cpu_only" ? "100% Safe CPU Fallback" : "Not compatible"}
                  </span>
                </div>
              </div>

              {/* Point 4 - Typing Speed Analogy */}
              <div className="p-3.5 bg-indigo-950/20 border border-slate-800 rounded-lg space-y-2 flex flex-col justify-between hover:border-slate-705 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Everyday Generation Speed</span>
                  </div>
                  <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    {selectedCompatibilityResult.speedPaceSymbol || "⏱️"} {selectedCompatibilityResult.speedPacePhrase || "Calculating pace..."}
                  </h4>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans mt-1">
                    {selectedCompatibilityResult.speedPaceDesc || "Checking speed rating..."}
                  </p>
                </div>
                <div className="pt-2 text-[9.5px] text-slate-500 border-t border-slate-850 flex items-center justify-between">
                  <span>Word Output prediction rate</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {selectedCompatibilityResult.estimatedTps > 0 
                      ? `~${selectedCompatibilityResult.estimatedTps} words per second` 
                      : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>

            {/* Non-technical friendly dynamic advisory footer */}
            {(() => {
              const status = selectedCompatibilityResult.status;
              const offload = selectedCompatibilityResult.offloadPercentage || 0;
              
              let title = "💡 Friendly Hardware Tip";
              let description = "";
              let borderColor = "border-indigo-500/15";
              let textColor = "text-indigo-400";
              let bgColor = "bg-slate-950/40";

              if (status === "full_gpu") {
                title = "🚀 Perfect Match: 100% Graphics Accelerated!";
                borderColor = "border-emerald-500/20";
                textColor = "text-emerald-400";
                bgColor = "bg-emerald-950/10";
                description = `Excellent choice! This AI model fits fully inside your computer's high-speed graphics card. You'll experience lightning-fast responses because your system doesn't have to wait on slower system memory pools. Ready to roll!`;
              } else if (status === "hybrid") {
                const isHigh = offload >= 70;
                title = isHigh 
                  ? "⚡ Co-Pilot Setup: Fast Shared Processing"
                  : "💡 Dual-Engine Setup: Shared Memory";
                borderColor = isHigh ? "border-sky-500/20" : "border-violet-500/20";
                textColor = isHigh ? "text-sky-400" : "text-violet-400";
                bgColor = isHigh ? "bg-sky-950/10" : "bg-violet-950/10";
                description = isHigh
                  ? `Most of this model runs inside your dedicated graphics memory, keeping responses highly fluid. A small remainder spills over safely to system memory, giving you a wonderful balance of smartness and speed.`
                  : `this model's file size splits your resources. About ${offload}% fits in your graphics memory, and the rest overflows into system memory. It will run perfectly, but because the two memory pools must coordinate back and forth, text will generate at a moderate, reading-friendly pace.`;
              } else if (status === "cpu_only") {
                title = "🐌 Standard Engine: CPU Fallback";
                borderColor = "border-amber-500/20";
                textColor = "text-amber-400";
                bgColor = "bg-amber-950/10";
                description = `Since this model is quite heavy, it overfills your graphics card entirely and relies on your computer's general CPU processor. It is 100% safe and highly capable, but it will feel like a steady, patient typist.`;
              } else if (status === "out_of_memory") {
                title = "⚠️ Resource Wall: Out of Memory";
                borderColor = "border-rose-500/20";
                textColor = "text-rose-400";
                bgColor = "bg-rose-950/15";
                description = `This option requires more combined memory than your computer currently has available. Running it might cause system slowdowns or software freezes. We highly recommend selecting a smaller model or a lighter format from the list for a smooth experience!`;
              }

              return (
                <div className={`p-4 sm:p-5 border ${borderColor} ${bgColor} rounded-lg text-sm leading-relaxed text-slate-300 space-y-2 sm:shadow-inner transition-all duration-300`}>
                  <p className={`font-bold ${textColor} flex items-center gap-1.5 font-sans text-sm sm:text-base`}>
                    <span>{title}</span>
                  </p>
                  <p className="text-[13px] sm:text-sm leading-relaxed text-slate-200">
                    {description}
                  </p>
                </div>
              );
            })()}

          </div>

          {/* Bottom stats panel: Peak projections (optimized standalone view) */}
          <div className="glass rounded-lg p-4 sm:p-5 space-y-3" id="peak-resource-projections">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Peak Resource Allocations</h3>
            
            <div className="space-y-2 mt-1">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Est. Peak Memory (VRAM)</span>
                  <span className="font-mono text-slate-200">{projections.vramPercent}% ({selectedFormat.fileSizeGb.toFixed(1)} GB)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${projections.vramPercent > 90 ? "bg-rose-500" : "bg-indigo-500"}`} 
                    style={{ width: `${projections.vramPercent}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Est. CPU Multi-threading</span>
                  <span className="font-mono text-slate-200">{projections.cpuPercent}% load</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${projections.cpuPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Chat Advisor Console powered by Gemini */}
          <div className="glass rounded-lg border border-indigo-500/20 p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Friendly AI Companion</h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-705 font-mono">
                Companion Ready
              </span>
            </div>
 
            {/* Quick questions suggestion chips */}
            <div className="flex flex-wrap gap-1.5 text-[9.5px]">
              <button 
                onClick={() => handleQuickPrompt("Can you explain my computer's specs in incredibly simple language, with everyday analogies?")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-slate-300"
                id="chip-get-started"
              >
                🌱 Explain my computer simply
              </button>
              <button 
                onClick={() => handleQuickPrompt("Explain VRAM and GGUF quantization in a simple everyday analogy (like a table, pantry, or desk)")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-slate-300"
                id="chip-vram-simple"
              >
                🍿 VRAM analogy (Desk Space)
              </button>
              <button 
                onClick={() => handleQuickPrompt("If I wanted to upgrade my computer in the future to run models faster, what's typical to upgrade first?")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-slate-300"
                id="chip-fun-usecases"
              >
                ⚡ Upgrades advice
              </button>
            </div>
 
            {/* Messages box */}
            <div 
              ref={chatContainerRef}
              className="bg-slate-950/75 rounded-lg p-3 max-h-[180px] min-h-[130px] overflow-y-auto space-y-3 text-xs border border-slate-850"
              id="chat-box"
            >
              {chatHistory.map((msg, index) => (
                <div 
                   key={index} 
                  className={`flex flex-col gap-1 p-2 rounded max-w-[90%] ${
                    msg.role === "user" 
                      ? "bg-slate-800/70 border-l-2 border-indigo-500 self-end ml-auto" 
                      : "bg-slate-900 border-l-2 border-emerald-500 self-start mr-auto"
                  }`}
                >
                  <p className="text-[9px] uppercase font-bold text-slate-500 font-mono">
                    {msg.role === "user" ? "You" : "AI Companion (Gemini)"}
                  </p>
                  <div className="text-slate-200 mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-1.5 text-slate-450 p-2 italic text-[11px] font-mono">
                  <Loader className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Companion is styling user-friendly feedback...
                </div>
              )}
            </div>
 
            {/* Input send bar */}
            <div className="flex gap-2">
              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask me anything, e.g. 'What is VRAM?' or 'Will my PC struggle?'..."
                className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200"
                id="input-msg"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={isSending || !userInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded text-xs transition-colors flex items-center justify-center gap-1 shrink-0"
                id="btn-send"
              >
                <Send className="w-3" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* Footer system details */}
      <footer className="mt-auto bg-[#0f172a] text-center p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>ModelFit Local Deploy Sandbox v2.4.0 • Built with High-Density dark optimization metrics</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI advice powered by server-side Gemini 3.5-Flash
          </span>
        </div>
      </footer>
    </div>
  );
}
