/**
 * Surfaces - barrel re-export.
 *
 * This file re-exports the public page components from their own modules.
 * Each component file in ./surfaces/ owns its own imports and logic.
 *
 * File map:
 *   surfaces/MarketplacePage.tsx      - public marketplace listing + business detail
 *   surfaces/CreateBusinessSurface.tsx - business creation onboarding form
 *   surfaces/DashboardPage.tsx         - owner dashboard (OwnerCard, analytics, etc.)
 *   surfaces/AuthSurface.tsx           - sign-in / sign-up surfaces
 *
 * WindowMark is also exported here because App.tsx imports it directly.
 */

export {
  MarketplacePage,
  BusinessDetailPage,
} from "./surfaces/MarketplacePage";
export { CreateBusinessSurface } from "./surfaces/CreateBusinessSurface";
export { DashboardPage } from "./surfaces/DashboardPage";
export { AuthSurface } from "./surfaces/AuthSurface";
export { WindowMark } from "./surfaces/MarketplacePage";
