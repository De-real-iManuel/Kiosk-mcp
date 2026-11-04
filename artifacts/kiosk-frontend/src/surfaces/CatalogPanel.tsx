"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProducts,
  useCreateProduct,
  usePatchProduct,
  useDeleteProduct,
  useServices,
  useCreateService,
  usePatchService,
  useDeleteService,
} from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: string | null;
  available: boolean;
  imageUrl?: string | null;
  quantity?: string | null;
  currencyCode?: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  available: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_LIMIT = 5;

// ─── Services tab ─────────────────────────────────────────────────────────────

function ServicesTab({ businessId }: { businessId: string }) {
  const query = useServices(businessId);
  const create = useCreateService(businessId);
  const patch = usePatchService(businessId);
  const del = useDeleteService(businessId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const services = (query.data ?? []) as Service[];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        price: price.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setPrice("");
          setAdding(false);
          toast.success("Service added");
        },
        onError: () => toast.error("Could not add service."),
      },
    );
  }

  function handleToggle(svc: Service) {
    patch.mutate(
      { serviceId: svc.id, available: !svc.available },
      { onError: () => toast.error("Could not update service.") },
    );
  }

  function handleDelete(svc: Service) {
    del.mutate(svc.id, {
      onSuccess: () => toast.success("Service removed"),
      onError: () => toast.error("Could not remove service."),
    });
  }

  if (query.isLoading)
    return <p className="py-4 text-[12px] text-[#777064]">Loading…</p>;

  return (
    <div className="space-y-2 pt-3">
      {services.length === 0 && !adding && (
        <p className="text-[12px] text-[#777064]">
          No services yet. Add what you offer so AI agents can find them.
        </p>
      )}

      {services.map((svc) => (
        <div
          key={svc.id}
          className="flex items-start justify-between gap-3 border border-black/8 bg-white p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug">{svc.name}</p>
            {svc.description && (
              <p className="mt-0.5 text-[11px] text-[#625D53] line-clamp-2">
                {svc.description}
              </p>
            )}
            {svc.price && (
              <p className="mt-1 mono text-[11px] font-semibold">{svc.price}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleToggle(svc)}
              className="text-[#777064] hover:text-[#12110F] transition-colors"
              title={svc.available ? "Mark unavailable" : "Mark available"}
              aria-label={svc.available ? "Mark unavailable" : "Mark available"}
            >
              {svc.available ? (
                <ToggleRight size={18} className="text-[#47745F]" />
              ) : (
                <ToggleLeft size={18} />
              )}
            </button>
            <button
              onClick={() => handleDelete(svc)}
              className="text-[#9C493F] hover:text-[#7a3830] transition-colors"
              title="Remove service"
              aria-label="Remove service"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form
          onSubmit={handleAdd}
          className="border border-black/15 bg-[#FAFAF8] p-3 space-y-2"
        >
          <input
            required
            autoFocus
            className="surface-input !min-h-9 !py-2 text-[13px]"
            placeholder="Service name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="surface-input !min-h-9 !py-2 text-[13px]"
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="surface-input !min-h-9 !py-2 text-[13px]"
            placeholder="Price, e.g. ₦3,500 (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="surface-button !min-h-8 !px-3 !text-[12px]"
            >
              {create.isPending ? "Saving…" : "Save service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setName("");
                setDescription("");
                setPrice("");
              }}
              className="surface-button surface-button-light !min-h-8 !px-3 !text-[12px]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#625D53] hover:text-[#12110F] transition-colors pt-1"
        >
          <Plus size={13} /> Add service
        </button>
      )}
    </div>
  );
}

// ─── Products tab ─────────────────────────────────────────────────────────────

function ProductsTab({ businessId }: { businessId: string }) {
  const query = useProducts(businessId);
  const create = useCreateProduct(businessId);
  const patch = usePatchProduct(businessId);
  const del = useDeleteProduct(businessId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adding, setAdding] = useState(false);

  const products = (query.data ?? []) as Product[];
  const atLimit = products.length >= FREE_LIMIT;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        price: price.trim() || undefined,
        quantity: quantity.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setPrice("");
          setQuantity("");
          setAdding(false);
          toast.success("Product added");
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { code?: string; limit?: number } };
          if (apiErr?.data?.code === "QUOTA_EXCEEDED") {
            toast.error(
              `Free plan limit: ${apiErr.data.limit} products max. Upgrade to add more.`,
            );
          } else {
            toast.error("Could not add product.");
          }
          setAdding(false);
        },
      },
    );
  }

  function handleToggle(p: Product) {
    patch.mutate(
      { productId: p.id, available: !p.available },
      { onError: () => toast.error("Could not update product.") },
    );
  }

  function handleDelete(p: Product) {
    del.mutate(p.id, {
      onSuccess: () => toast.success("Product removed"),
      onError: () => toast.error("Could not remove product."),
    });
  }

  if (query.isLoading)
    return <p className="py-4 text-[12px] text-[#777064]">Loading…</p>;

  return (
    <div className="space-y-2 pt-3">
      {atLimit && (
        <div className="flex items-start gap-2 border border-[#D1786B]/30 bg-[#D1786B]/5 p-3">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-[#D1786B]" />
          <p className="text-[11px] text-[#9C493F]">
            Free plan: {FREE_LIMIT} products max.{" "}
            <span className="font-semibold">
              Upgrade your plan to add more.
            </span>
          </p>
        </div>
      )}

      {products.length === 0 && !adding && (
        <p className="text-[12px] text-[#777064]">
          No products yet. Add items so AI agents can browse your catalogue.
        </p>
      )}

      {products.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between gap-3 border border-black/8 bg-white p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug">{p.name}</p>
            {p.description && (
              <p className="mt-0.5 text-[11px] text-[#625D53] line-clamp-2">
                {p.description}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {p.price && (
                <span className="mono text-[11px] font-semibold">
                  {p.price} {p.currencyCode ?? "NGN"}
                </span>
              )}
              {p.quantity && (
                <span className="text-[11px] text-[#777064]">
                  Qty: {p.quantity}
                </span>
              )}
              {!p.available && (
                <span className="text-[11px] text-[#9C493F]">Unavailable</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleToggle(p)}
              className="text-[#777064] hover:text-[#12110F] transition-colors"
              title={p.available ? "Mark unavailable" : "Mark available"}
              aria-label={p.available ? "Mark unavailable" : "Mark available"}
            >
              {p.available ? (
                <ToggleRight size={18} className="text-[#47745F]" />
              ) : (
                <ToggleLeft size={18} />
              )}
            </button>
            <button
              onClick={() => handleDelete(p)}
              className="text-[#9C493F] hover:text-[#7a3830] transition-colors"
              title="Remove product"
              aria-label="Remove product"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {!atLimit &&
        (adding ? (
          <form
            onSubmit={handleAdd}
            className="border border-black/15 bg-[#FAFAF8] p-3 space-y-2"
          >
            <input
              required
              autoFocus
              className="surface-input !min-h-9 !py-2 text-[13px]"
              placeholder="Product name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="surface-input !min-h-9 !py-2 text-[13px]"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="surface-input !min-h-9 !py-2 text-[13px]"
                placeholder="Price, e.g. ₦2,500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <input
                className="surface-input !min-h-9 !py-2 text-[13px]"
                placeholder="Quantity (optional)"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={create.isPending || !name.trim()}
                className="surface-button !min-h-8 !px-3 !text-[12px]"
              >
                {create.isPending ? "Saving…" : "Save product"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setName("");
                  setDescription("");
                  setPrice("");
                  setQuantity("");
                }}
                className="surface-button surface-button-light !min-h-8 !px-3 !text-[12px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#625D53] hover:text-[#12110F] transition-colors pt-1"
          >
            <Plus size={13} /> Add product{" "}
            <span className="text-[#A49D90]">
              ({products.length}/{FREE_LIMIT} free)
            </span>
          </button>
        ))}
    </div>
  );
}

// ─── Catalog Panel (exported) ─────────────────────────────────────────────────

interface CatalogPanelProps {
  businessId: string;
  hasProductsCapability: boolean;
}

export function CatalogPanel({
  businessId,
  hasProductsCapability,
}: CatalogPanelProps) {
  const [tab, setTab] = useState<"services" | "products">("services");

  return (
    <div
      className="mt-5 border border-black/10 bg-[#F2EDE4] p-4"
      data-testid={`catalog-panel-${businessId}`}
    >
      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <p className="eyebrow text-[#777064]">Catalogue</p>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("services")}
            className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
              tab === "services"
                ? "bg-[#12110F] text-[#EDE7DC]"
                : "text-[#777064] hover:text-[#12110F]"
            }`}
          >
            Services
          </button>
          {hasProductsCapability && (
            <button
              onClick={() => setTab("products")}
              className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
                tab === "products"
                  ? "bg-[#12110F] text-[#EDE7DC]"
                  : "text-[#777064] hover:text-[#12110F]"
              }`}
            >
              Products
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      {tab === "services" && <ServicesTab businessId={businessId} />}
      {tab === "products" && hasProductsCapability && (
        <ProductsTab businessId={businessId} />
      )}

      {!hasProductsCapability && tab === "services" && (
        <p className="mt-3 text-[11px] text-[#A49D90]">
          Enable the &quot;Product catalogue&quot; capability to add products.
        </p>
      )}
    </div>
  );
}
