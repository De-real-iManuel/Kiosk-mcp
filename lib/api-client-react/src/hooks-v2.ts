/**
 * V2 React Query hooks for the structured Kiosk API.
 * These supplement the orval-generated hooks with support for
 * the new structured business schema (capabilities, products, services, categories).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// --- Categories --------------------------------------------------------------

export function useCategories(): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => customFetch<unknown[]>("/api/categories"),
  });
}

// --- Dashboard businesses (V2) -----------------------------------------------

export function useMyBusinessesV2(): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: ["businesses-v2"],
    queryFn: () => customFetch<unknown[]>("/api/businesses"),
  });
}

export function useBusinessV2(id: string): UseQueryResult<unknown> {
  return useQuery({
    queryKey: ["business", id],
    queryFn: () => customFetch<unknown>(`/api/businesses/${id}`),
    enabled: !!id,
  });
}

// --- Create / Update ---------------------------------------------------------

export function useCreateBusinessV2(): UseMutationResult<
  unknown,
  Error,
  Record<string, unknown>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      customFetch<unknown>("/api/businesses", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["businesses-v2"] }),
  });
}

export function useUpdateBusinessV2(
  id: string,
): UseMutationResult<unknown, Error, Record<string, unknown>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      customFetch<unknown>(`/api/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses-v2"] });
      qc.invalidateQueries({ queryKey: ["business", id] });
    },
  });
}

// --- Publish ------------------------------------------------------------------

export function usePublishBusinessV2(
  id: string,
): UseMutationResult<
  unknown,
  Error,
  { published: boolean; externalMcpUrl?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { published: boolean; externalMcpUrl?: string }) =>
      customFetch<unknown>(`/api/businesses/${id}/publish`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses-v2"] });
      qc.invalidateQueries({ queryKey: ["business", id] });
    },
  });
}

// --- Capabilities -------------------------------------------------------------

export function useCapabilities(businessId: string): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: ["capabilities", businessId],
    queryFn: () =>
      customFetch<unknown[]>(`/api/businesses/${businessId}/capabilities`),
    enabled: !!businessId,
  });
}

export function useUpsertCapability(businessId: string): UseMutationResult<
  unknown,
  Error,
  {
    capability: string;
    enabled: boolean;
    configuration?: Record<string, unknown>;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      capability,
      enabled,
      configuration,
    }: {
      capability: string;
      enabled: boolean;
      configuration?: Record<string, unknown>;
    }) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/capabilities/${capability}`,
        {
          method: "PUT",
          body: JSON.stringify({ enabled, configuration }),
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["capabilities", businessId] }),
  });
}

export function useDeleteCapability(
  businessId: string,
): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (capability: string) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/capabilities/${capability}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["capabilities", businessId] }),
  });
}

// --- Products ----------------------------------------------------------------

export function useProducts(businessId: string): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: ["products", businessId],
    queryFn: () =>
      customFetch<unknown[]>(`/api/businesses/${businessId}/products`),
    enabled: !!businessId,
  });
}

export function useCreateProduct(
  businessId: string,
): UseMutationResult<unknown, Error, Record<string, unknown>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      customFetch<unknown>(`/api/businesses/${businessId}/products`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", businessId] }),
  });
}

export function usePatchProduct(
  businessId: string,
): UseMutationResult<
  unknown,
  Error,
  { productId: string } & Record<string, unknown>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...body
    }: { productId: string } & Record<string, unknown>) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/products/${productId}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", businessId] }),
  });
}

export function useDeleteProduct(
  businessId: string,
): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/products/${productId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["products", businessId] }),
  });
}

// --- Services ----------------------------------------------------------------

export function useServices(businessId: string): UseQueryResult<unknown[]> {
  return useQuery({
    queryKey: ["services", businessId],
    queryFn: () =>
      customFetch<unknown[]>(`/api/businesses/${businessId}/services`),
    enabled: !!businessId,
  });
}

export function useCreateService(
  businessId: string,
): UseMutationResult<unknown, Error, Record<string, unknown>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      customFetch<unknown>(`/api/businesses/${businessId}/services`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["services", businessId] }),
  });
}

export function usePatchService(
  businessId: string,
): UseMutationResult<
  unknown,
  Error,
  { serviceId: string } & Record<string, unknown>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceId,
      ...body
    }: { serviceId: string } & Record<string, unknown>) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/services/${serviceId}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["services", businessId] }),
  });
}

export function useDeleteService(
  businessId: string,
): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      customFetch<unknown>(
        `/api/businesses/${businessId}/services/${serviceId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["services", businessId] }),
  });
}

// --- Delete business ---------------------------------------------------------

export function useDeleteBusiness(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) =>
      customFetch<unknown>(`/api/businesses/${businessId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses-v2"] });
      qc.invalidateQueries({ queryKey: ["/api/businesses"] });
    },
  });
}

// --- Onboarding feedback ----------------------------------------------------

export function useSubmitFeedback(
  businessId: string,
): UseMutationResult<unknown, Error, Record<string, unknown>> {
  return useMutation({
    mutationFn: (answers: Record<string, unknown>) =>
      customFetch<unknown>(`/api/businesses/${businessId}/feedback`, {
        method: "POST",
        body: JSON.stringify(answers),
      }),
  });
}

// --- Marketplace (V2) ---------------------------------------------------------

export function useMarketplaceSearch(params: {
  search?: string;
  city?: string;
  category?: string;
}): UseQueryResult<unknown[]> {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["marketplace", params],
    queryFn: () =>
      customFetch<unknown[]>(`/api/marketplace${query ? `?${query}` : ""}`),
  });
}

export function useMarketplaceBusiness(slug: string): UseQueryResult<unknown> {
  return useQuery({
    queryKey: ["marketplace-business", slug],
    queryFn: () => customFetch<unknown>(`/api/marketplace/${slug}`),
    enabled: !!slug,
  });
}
