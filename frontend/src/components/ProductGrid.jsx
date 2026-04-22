import ProductCard from './ProductCard'
import { useProducts } from '../hooks/useProducts'

export default function ProductGrid() {
  const { products, orgs, loading, error, activeOrgId, setActiveOrgId } = useProducts()

  return (
    <div>
      {/* Header + org filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-white font-semibold text-base">
          Products
          <span className="ml-2 text-sm text-gray-500 font-normal">({products.length})</span>
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveOrgId(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              !activeOrgId
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All Orgs
          </button>
          {orgs.map((o) => (
            <button
              key={o.orgId}
              onClick={() => setActiveOrgId(o.orgId)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeOrgId === o.orgId
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
          <span className="w-4 h-4 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
          Loading products…
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <span className="text-5xl mb-3">📦</span>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Start the backend to load the catalogue</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.productId} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
