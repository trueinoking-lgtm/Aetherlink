"use client"

import { createContext, useContext, useState } from "react"
import type { JobSite } from "@aetherlink/core"

/** Legacy F2A hook — stubbed for AetherLink (scraper sites removed). */
export const SitesContext = createContext<{
  isLoading: boolean
  sites: JobSite[]
  siteLogos: Record<number, string>
  siteMap: Record<number, JobSite>
  reloadSites: () => Promise<void>
}>({
  isLoading: false,
  sites: [],
  siteLogos: {},
  siteMap: {},
  reloadSites: async () => {},
})

export const useSites = () => {
  const sites = useContext(SitesContext)
  if (sites === undefined) {
    throw new Error("useSites must be used within a SitesProvider")
  }
  return sites
}

export const SitesProvider = ({
  sites: initialSites,
  children,
}: React.PropsWithChildren<{
  sites: JobSite[]
}>) => {
  const [sites] = useState<JobSite[]>(initialSites)
  const siteLogos = Object.fromEntries(
    sites.map((site) => [site.id, site.logo_url])
  )
  const siteMap = Object.fromEntries(sites.map((site) => [site.id, site]))

  return (
    <SitesContext.Provider
      value={{
        isLoading: false,
        sites,
        siteLogos,
        siteMap,
        reloadSites: async () => {},
      }}
    >
      {children}
    </SitesContext.Provider>
  )
}
