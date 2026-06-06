"use client"

import type { AetherLinkApiSdk } from "@aetherlink/core"
import { createContext, useContext } from "react"

const SdkContext = createContext<AetherLinkApiSdk | null>(null)

export function SdkProvider({
  sdk,
  children,
}: {
  sdk: AetherLinkApiSdk
  children: React.ReactNode
}) {
  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>
}

export function useSdk(): AetherLinkApiSdk {
  const sdk = useContext(SdkContext)
  if (!sdk) {
    throw new Error("useSdk must be used within a SdkProvider")
  }
  return sdk
}
