# Plan: Full Admin and Member Surface Separation

**Generated**: March 18, 2026  
**Estimated Complexity**: High

## Overview
This plan separates GymRank into two fully distinct products within the same Next.js codebase:

- `localhost:3000/` becomes the member-facing product for gym-goers
- `localhost:3000/admin` becomes the owner/staff-facing product for gym operations

The goal is not only a visual split. It is a full separation of:

- layouts and navigation
- route trees and entry points
- auth flows and default redirects
- backend action boundaries
- role-based authorization rules
- shared UI assumptions between member and admin experiences

The approach is to keep shared domain logic only where it is truly business-layer code, while making route, auth, and control surfaces explicit and non-overlapping. The result should be that a gym-goer never touches admin UI or admin URLs in normal flow, and an admin never relies on member navigation or member shells to access management features.

## Current State Summary
- Member experience currently lives under `/member`
- Admin/staff experience currently lives under `/app`
- Auth defaults now resolve users toward `/app`, `/app/onboarding`, or `/member` based on membership and metadata
- There is already some route-level separation, but it is incomplete because:
  - public entry points still expose both products from the same top-level marketing surface
  - auth pages are still shared
  - admin and member surfaces still share some actions
  - admin URLs use `/app` instead of `/admin`
  - backend authorization still depends heavily on route context and current helpers instead of explicit permission contracts

## Prerequisites
- Existing Next.js 16.1.7 App Router project with Cache Components enabled
- Existing Supabase auth, proxy session refresh, and role model
- Working knowledge of the current role model:
  - `owner`
  - `staff`
  - `member`
- Agreement that some business logic can remain shared in `lib/app/*`, but route, auth, and action entry points must be split

## Separation Principles
- Member product owns `/`
- Admin product owns `/admin`
- No cross-navigation links between member shell and admin shell
- Auth entry points are separate:
  - member auth routes
  - admin auth routes
- Route groups and layouts are distinct and do not reuse each other’s navigation components
- Member-safe actions and admin-only actions have separate server entry points even if they call shared lower-level helpers
- Authorization is explicit at the action and helper level, not implied by route location

## Sprint 1: Route and Shell Architecture Split
**Goal**: Move the app to the final URL model and remove route-level ambiguity.

**Demo/Validation**:
- Open `http://localhost:3000/` and see the member product
- Open `http://localhost:3000/admin` and see the admin product
- Confirm there are no shell-level links between member and admin navigation
- Confirm direct navigation to the wrong surface redirects based on role

### Task 1.1: Define Final Route Map
- **Location**: [plan.md](C:\Users\juliu\Documents\gymrank\plan.md), [member-ux-ui-plan.md](C:\Users\juliu\Documents\gymrank\member-ux-ui-plan.md), [member-ux-screen-spec.md](C:\Users\juliu\Documents\gymrank\member-ux-screen-spec.md)
- **Description**: Document the final route ownership map and treat `/app` as deprecated. Define exact admin and member URL replacements.
- **Complexity**: 3
- **Dependencies**: None
- **Acceptance Criteria**:
  - `/` is member home
  - `/admin` is admin home
  - `/member/*` either migrates to `/` equivalents or is temporarily redirected
  - `/app/*` either migrates to `/admin/*` equivalents or is temporarily redirected
- **Validation**:
  - Route map reviewed against all current files under `app/`

### Task 1.2: Create Distinct Top-Level Route Trees
- **Location**: `app/page.tsx`, `app/admin/**`, `app/(member)/**` or equivalent new route grouping
- **Description**: Rebuild the route tree so the member product sits at `/` and child member pages live directly under the root product namespace, while admin pages live under `/admin`.
- **Complexity**: 7
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Member pages no longer depend on `/member/*` as the canonical product path
  - Admin pages no longer depend on `/app/*` as the canonical product path
  - Temporary redirects preserve existing deep links during migration
- **Validation**:
  - `npm run build`
  - manual route verification for representative member/admin pages

### Task 1.3: Split Layout Ownership Completely
- **Location**: `app/layout.tsx`, `app/admin/layout.tsx`, root member layout files, `components/app/*`, `components/member/*`
- **Description**: Ensure member and admin layouts are independent in structure, design language, and navigation ownership. No cross-surface nav links.
- **Complexity**: 6
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - member shell contains only member navigation and member framing
  - admin shell contains only admin navigation and admin framing
  - no "switch to member/admin" buttons remain in either shell
- **Validation**:
  - visual inspection on mobile and desktop
  - grep for cross-surface shell links

### Task 1.4: Build Mobile Navigation Contracts for Both Surfaces
- **Location**: `components/member/*`, `components/app/*`
- **Description**: Finalize touch-friendly bottom nav or mobile header patterns for both products so the split remains clean on small screens.
- **Complexity**: 5
- **Dependencies**: Task 1.3
- **Acceptance Criteria**:
  - member nav is optimized for consumer use
  - admin nav is optimized for operational workflows
  - both are usable at mobile breakpoints without sidebars
- **Validation**:
  - responsive verification at mobile, tablet, desktop widths

## Sprint 2: Auth Flow Separation
**Goal**: Make auth entry points and post-auth behavior product-specific instead of shared.

**Demo/Validation**:
- Member login starts from member auth pages and lands in the member product
- Admin login starts from admin auth pages and lands in the admin product
- Wrong-surface auth attempts are corrected by server-side redirects

### Task 2.1: Create Separate Member and Admin Auth Namespaces
- **Location**: `app/auth/*`, new `app/admin/auth/*`, new member auth entry points
- **Description**: Split shared auth pages into distinct admin/member entry points with product-specific copy, redirects, and defaults.
- **Complexity**: 6
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - member auth pages do not mention admin dashboard concepts
  - admin auth pages do not mention gym-goer product concepts
  - links between login/sign-up/reset flows stay inside the same auth namespace
- **Validation**:
  - manual checks of each auth screen

### Task 2.2: Replace Generic Post-Auth Redirect Resolver with Product-Aware Resolver
- **Location**: `lib/app/auth-redirect.ts`, auth route handlers/pages
- **Description**: Resolve post-auth destinations based on both explicit login entry point and explicit role authorization. Avoid single shared redirect assumptions.
- **Complexity**: 6
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - member login defaults to member surface
  - admin login defaults to admin surface
  - owner without gym lands in admin onboarding, not member home
  - members cannot land in admin by default
- **Validation**:
  - login redirect matrix test by role and entry point

### Task 2.3: Split Join and Invite Workflows by Product Intent
- **Location**: `app/join/[slug]/page.tsx`, new member onboarding/join support routes
- **Description**: Ensure gym-goer invitation and join flows are fully member-product aligned, and admin invite/provisioning flows remain admin-side only.
- **Complexity**: 5
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - gym-goer join QR and invite flows resolve into member auth and member home
  - admin provisioning flows resolve into admin auth and admin workspace
- **Validation**:
  - manual flow test for new member, pending member, active member

### Task 2.4: Separate Reset Password and Confirmation UX by Product
- **Location**: `app/auth/confirm/route.ts`, password reset pages/forms, new admin/member variants if needed
- **Description**: Remove shared assumptions in confirmation and password reset flows so users return to the correct product after account mutations.
- **Complexity**: 4
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - password reset completes into the right product
  - email confirmation completes into the right product
- **Validation**:
  - manual or mocked flow validation

## Sprint 3: Backend Hardening and Explicit Permissions
**Goal**: Make permissions explicit in backend entry points so role enforcement does not depend on route shape.

**Demo/Validation**:
- Member account cannot invoke admin-only actions
- Staff/owner cannot accidentally hit member-only actions that should not apply to them
- Action names and modules clearly express audience

### Task 3.1: Audit Current Server Actions by Audience
- **Location**: `app/app/**/actions.ts`, any new member action files, `lib/app/*`
- **Description**: Categorize every action as `member-only`, `admin-only`, `shared-domain`, or `needs split`.
- **Complexity**: 5
- **Dependencies**: None
- **Acceptance Criteria**:
  - action inventory exists
  - every action has explicit audience classification
- **Validation**:
  - checklist review across all action files

### Task 3.2: Create Explicit Permission Guard Helpers
- **Location**: `lib/app/server.ts`, possibly `lib/app/permissions.ts`
- **Description**: Replace implicit route assumptions with explicit helpers such as:
  - `requireAdminUser()`
  - `requireOwnerOrStaffGym()`
  - `requireMemberUser()`
  - `requireAdminPermission(permission)`
  - `requireMemberPermission(permission)`
- **Complexity**: 7
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - all server actions rely on explicit permission helpers
  - guards return coherent redirect/error behavior
- **Validation**:
  - direct action review
  - negative-path testing

### Task 3.3: Split Shared Action Entry Points into Member and Admin Modules
- **Location**: current `app/app/**/actions.ts`, new `app/admin/**/actions.ts`, new member action modules
- **Description**: Keep shared business logic in lower-level helpers, but expose separate action modules for admin and member use. Example:
  - member reward redemption action entry point
  - admin reward catalog management action entry point
- **Complexity**: 8
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - no mixed audience action files remain for surface-level behavior
  - mutation paths are audience-specific and auditable
- **Validation**:
  - code review of imports and module boundaries

### Task 3.4: Define Explicit Permission Matrix by Role
- **Location**: new `docs/permissions-matrix.md` or plan appendix, `lib/app/permissions.ts`
- **Description**: Encode which roles may perform which actions and view which routes.
- **Complexity**: 4
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - permission matrix covers `owner`, `staff`, `member`
  - route and action guards align with the matrix
- **Validation**:
  - spot-check route/action behavior against matrix

### Task 3.5: Add Deny-by-Default for Admin Routes
- **Location**: `app/admin/layout.tsx` or equivalent guard layer
- **Description**: Ensure all admin routes default to blocked unless explicit admin permission is present.
- **Complexity**: 5
- **Dependencies**: Sprint 1, Task 3.2
- **Acceptance Criteria**:
  - member hitting `/admin/*` gets redirected away
  - unattached member never sees admin UI
- **Validation**:
  - route tests and manual navigation checks

## Sprint 4: Fine-Tune Existing UI and Remove Cross-Surface Leakage
**Goal**: Clean up the already implemented surfaces so the split feels intentional everywhere.

**Demo/Validation**:
- No shared wording, CTAs, or visual framing between products
- No leaked admin terms inside member experience
- No leaked member-product terms inside admin experience

### Task 4.1: Remove Cross-Surface Links and Labels
- **Location**: `components/app/*`, `components/member/*`, `app/page.tsx`, auth pages
- **Description**: Remove or relocate any remaining links, labels, badges, or wording that cross-connects the products.
- **Complexity**: 4
- **Dependencies**: Sprint 1, Sprint 2
- **Acceptance Criteria**:
  - no admin shell links to member shell
  - no member shell links to admin shell
  - public landing page clearly separates product entry points
- **Validation**:
  - grep for `/app`, `/member`, `/admin` references in shell/navigation files

### Task 4.2: Bring Admin Pages Up to the New Shell Standard
- **Location**: `app/admin/**/page.tsx` equivalents, migrated admin pages
- **Description**: Refine the existing admin pages so they visually match the stronger admin shell rather than feeling like legacy internal forms inside a new frame.
- **Complexity**: 7
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - admin pages share spacing, card language, hierarchy, and mobile behavior
  - admin pages feel operational and consistent
- **Validation**:
  - visual review across at least 5 representative admin pages

### Task 4.3: Normalize Member Pages Around the Member Product Pattern
- **Location**: root member pages after route move
- **Description**: Fine-tune member pages so they consistently read as the gym-goer product, not admin pages adapted for members.
- **Complexity**: 6
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - member pages consistently use member copy, hierarchy, and touch patterns
  - waiting-state, active member, and no-gym states are coherent
- **Validation**:
  - mobile and desktop UI review

### Task 4.4: Separate Shared Styling Tokens Where Needed
- **Location**: `app/globals.css`, any new product-specific CSS modules or utility wrappers
- **Description**: If necessary, introduce product-specific style tokens or wrappers so member and admin themes do not drift back toward each other.
- **Complexity**: 5
- **Dependencies**: Task 4.2, Task 4.3
- **Acceptance Criteria**:
  - admin and member products have distinct visual systems
  - changes to one surface do not accidentally restyle the other
- **Validation**:
  - side-by-side UI inspection

## Sprint 5: Migration, Compatibility, and Cleanup
**Goal**: Finish the separation without breaking existing links or user expectations.

**Demo/Validation**:
- legacy URLs redirect cleanly
- old login flows still land in correct product
- no orphaned route trees remain

### Task 5.1: Add Redirects from Legacy Routes
- **Location**: old `/app/*` and `/member/*` routes or redirect shims
- **Description**: Preserve compatibility while moving canonical routes to `/admin/*` and `/`.
- **Complexity**: 6
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - legacy admin deep links redirect to `/admin/*`
  - legacy member deep links redirect to new member routes
- **Validation**:
  - redirect matrix test

### Task 5.2: Remove Deprecated Surface Assumptions
- **Location**: auth forms, marketing page, helpers, docs
- **Description**: Remove hardcoded `/app` and `/member` assumptions once redirects and new route ownership are stable.
- **Complexity**: 5
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - canonical route references point to `/` and `/admin`
  - helper functions and CTAs use final route ownership
- **Validation**:
  - grep for deprecated canonical references

### Task 5.3: Update Documentation and Roadmap Status
- **Location**: `plan.md`, member UX plan/spec docs, auth docs if any
- **Description**: Document the new product split and route ownership.
- **Complexity**: 3
- **Dependencies**: Task 5.2
- **Acceptance Criteria**:
  - docs reflect the final split
  - team can understand where member vs admin features belong
- **Validation**:
  - manual doc review

## Testing Strategy
- Route-level validation:
  - member user -> `/`
  - member user denied from `/admin/*`
  - admin/staff user -> `/admin`
  - admin/staff user denied from member shell routes when canonical split is complete
- Auth flow validation:
  - member login
  - admin login
  - sign-up with `member`
  - sign-up with `owner`
  - email confirmation
  - password reset
- Permission validation:
  - member cannot call admin mutations
  - staff can access staff-safe admin actions
  - owner can access owner-only actions
- Responsive validation:
  - mobile widths for admin shell
  - mobile widths for member shell
  - tablet layout handoff
  - desktop layout
- Build validation:
  - `npm run lint`
  - `npm run build`

## Potential Risks & Gotchas
- **Legacy route breakage**
  - Risk: existing links, bookmarks, or QR routes may rely on `/app` or `/member`
  - Mitigation: add redirect shims before removing old route ownership

- **Action leakage despite UI split**
  - Risk: a member may still invoke an imported admin action
  - Mitigation: explicit permission guards and split action entry points

- **Owner with no gym edge case**
  - Risk: owner lands in member waiting state or generic root
  - Mitigation: keep explicit admin onboarding resolution in auth and route guards

- **Pending or unattached member edge case**
  - Risk: unattached members get redirected into admin onboarding or a broken dashboard
  - Mitigation: preserve a dedicated member waiting state at the root member product

- **Surface drift over time**
  - Risk: new pages reintroduce cross-links and shared assumptions
  - Mitigation: document ownership rules and enforce them in code review

- **Permission mismatch between UI and RLS**
  - Risk: UI denies correctly but database policies still allow or block unexpectedly
  - Mitigation: review action guards and RLS assumptions together during Sprint 3

## Rollback Plan
- Keep legacy `/app` and `/member` redirects until the new route tree is stable
- Ship route changes behind incremental commits:
  - route tree changes
  - auth split
  - permission hardening
  - UI cleanup
- If regressions appear:
  - restore previous post-auth redirect behavior temporarily
  - keep admin shell/member shell split but re-enable legacy route aliases
  - revert action-module split independently from layout changes if needed

## Recommended Execution Order
1. Finalize route ownership and redirect map
2. Move canonical admin routes to `/admin`
3. Move canonical member routes to `/`
4. Split auth entry points
5. Harden permission guards and action boundaries
6. Fine-tune admin and member visuals
7. Remove legacy assumptions and update docs
