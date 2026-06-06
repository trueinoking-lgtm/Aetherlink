"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { Link, WebPageRuntimeData } from "@aetherlink/core"

type LinksContextType = {
  isLoading: boolean
  links: Link[]
  linkMap: Record<number, Link>
  createLink: (
    newLink: Pick<Link, "title" | "url"> & {
      html: string
      webPageRuntimeData: WebPageRuntimeData
      force: boolean
    }
  ) => Promise<Link>
  updateLink: (
    linkId: number,
    data: { title: string; url: string }
  ) => Promise<void>
  removeLink: (linkId: number) => Promise<void>
  reloadLinks: () => Promise<void>
}

/** Legacy F2A hook — stubbed for AetherLink (scraper links removed). */
export const LinksContext = createContext<LinksContextType>({
  isLoading: false,
  links: [],
  linkMap: {},
  createLink: async () => {
    throw new Error("Links are not supported in AetherLink")
  },
  updateLink: async () => {
    throw new Error("Links are not supported in AetherLink")
  },
  removeLink: async () => {
    throw new Error("Links are not supported in AetherLink")
  },
  reloadLinks: async () => {},
})

export const useLinks = () => {
  const context = useContext(LinksContext)
  if (context === undefined) {
    throw new Error("useLinks must be used within a LinksProvider")
  }
  return context
}

export const LinksProvider = ({
  links: initialLinks,
  children,
}: React.PropsWithChildren<{
  links: Link[]
}>) => {
  const [links] = useState<Link[]>(initialLinks)
  const linkMap = useMemo(
    () => Object.fromEntries(links.map((link) => [link.id, link])),
    [links]
  )

  return (
    <LinksContext.Provider
      value={{
        isLoading: false,
        links,
        linkMap,
        createLink: async () => {
          throw new Error("Links are not supported in AetherLink")
        },
        updateLink: async () => {
          throw new Error("Links are not supported in AetherLink")
        },
        removeLink: async () => {
          throw new Error("Links are not supported in AetherLink")
        },
        reloadLinks: async () => {},
      }}
    >
      {children}
    </LinksContext.Provider>
  )
}
