import { LLM } from "@/types"

const DFT_PLATORM_LINK = "http://localhost:8000/docs/overview"

// DFT Models (UPDATED 11/26/25) -----------------------------
const DFT: LLM = {
  modelId: "dft-1",
  modelName: "DFT-1",
  provider: "dft",
  hostedId: "dft-1",
  platformLink: DFT_PLATORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 5,
    outputCost: 15
  }
}

export const DFT_LLM_LIST: LLM[] = [DFT]
