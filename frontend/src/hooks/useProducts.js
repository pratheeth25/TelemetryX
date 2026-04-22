import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { getProducts, getOrgs } from '../services/api'

/**
 * Loads products and orgs from the REST API and keeps
 * the Zustand store in sync. Returns loading/error state.
 */
export function useProducts() {
  const products      = useStore((s) => s.products)
  const setProducts   = useStore((s) => s.setProducts)
  const orgs          = useStore((s) => s.orgs)
  const setOrgs       = useStore((s) => s.setOrgs)
  const activeOrgId   = useStore((s) => s.activeOrgId)
  const setActiveOrgId = useStore((s) => s.setActiveOrgId)
  const activeProductId   = useStore((s) => s.activeProductId)
  const setActiveProductId = useStore((s) => s.setActiveProductId)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getProducts(activeOrgId || undefined), getOrgs()])
      .then(([prodRes, orgRes]) => {
        if (cancelled) return
        setProducts(prodRes.products || [])
        setOrgs(orgRes.orgs || [])
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId])

  // Derived: products filtered by active org (already filtered server-side,
  // but kept here for instant switching in case store already has data)
  const filteredProducts = activeOrgId
    ? products.filter((p) => p.orgId === activeOrgId)
    : products

  return {
    products: filteredProducts,
    orgs,
    loading,
    error,
    activeOrgId,
    setActiveOrgId,
    activeProductId,
    setActiveProductId,
  }
}
