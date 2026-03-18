# Plan: Member UX UI

**Generated**: March 18, 2026
**Estimated Complexity**: High

## Overview
Build a dedicated gym-goer web experience on top of the existing Next.js + Supabase platform without re-implementing business logic. The plan assumes the current `/app` area remains the staff/admin workspace, and a new member-facing surface is introduced for gym-goers with a lighter shell, role-aware navigation, and direct wiring to already implemented server actions and domain functions.

The implementation approach is:
- keep the current Supabase schema, RLS, and server actions as the source of truth
- expose only member-safe actions in the member UX
- avoid duplicate business logic by extracting shared query/action helpers where needed
- separate admin and member navigation/layouts so the UX matches the user role

## Product Direction
The member UX should feel like “Strava for gyms”, not a stripped-down admin console.

This means the UI should prioritize:
- an activity-first home feed over management tables
- personal momentum signals like streaks, XP, recent check-ins, challenge progress, and earned rewards
- strong social proof through community activity, comments, reactions, and member highlights
- mobile-first navigation and fast one-tap actions
- identity and progress surfaces that feel motivating, not back-office

This also means the member experience should avoid:
- admin language such as “command center”, “manage”, or “settings” as the dominant framing
- forms and dense tables as the primary interaction model
- exposing staff-only controls in mixed pages
- burying social/activity content behind administrative summaries

## Prerequisites
- Existing auth, active gym resolution, and Supabase SSR setup remain intact
- Current staff/admin routes under `app/app/**` stay functional during the migration
- Existing member-safe functions are reused:
  - `app/app/profile/actions.ts`
  - `app/app/challenges/actions.ts`
  - `app/app/rewards/actions.ts`
  - `app/app/community/actions.ts`
  - `app/app/notifications/actions.ts`
  - `app/app/checkins/actions.ts`
  - `lib/app/checkins.ts`
  - `lib/app/queries.ts`
- Existing staff-only functions stay hidden from the member UX unless explicitly refactored into shared domain helpers

## Sprint 1: Member Surface Architecture
**Goal**: Establish a dedicated member-facing route structure, shell, and role-based entry flow without changing business behavior.
**Demo/Validation**:
- Login as a gym-goer and land on the member surface, not the admin shell
- Login as staff/owner and remain on the admin surface
- Member navigation only shows member-safe sections

### Task 1.1: Audit member-safe versus staff-only actions
- **Location**: `app/app/**/actions.ts`, `lib/app/checkins.ts`, `lib/app/queries.ts`
- **Description**: Produce an explicit action matrix that labels each existing action as member-safe, staff-only, or mixed. Document where member pages can call current actions directly and where a thin wrapper or shared helper is needed.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Every existing server action used by the current app is classified
  - Member-safe actions are mapped to target member pages
  - Staff-only actions are excluded from the member route plan
- **Validation**:
  - Manual review of action matrix against current files

### Task 1.2: Define member route namespace and shell
- **Location**: `app/member/**` or `app/(member)/**`, `components/app/**`
- **Description**: Introduce a dedicated member route surface with its own layout, navigation, header copy, and mobile-friendly information architecture. Keep admin `/app` isolated to avoid mixed-role clutter.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Member route structure is agreed and scaffolded
  - Shared auth and active gym resolution are reused
  - Member shell excludes admin-only links such as analytics, gym settings, member management, and network admin controls
- **Validation**:
  - Navigate the member shell as an authenticated member
  - Confirm no admin-only navigation appears

### Task 1.3: Add role-aware post-login routing
- **Location**: `components/login-form.tsx`, auth redirect helpers, `lib/app/server.ts` or a new auth routing helper
- **Description**: Route authenticated users to the correct default surface based on membership role. Members should land on the member dashboard; staff/owners should continue to land on `/app`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Members default to the member UX after login
  - Staff and owners default to the current admin workspace
  - Explicit `next` redirects still work when safe
- **Validation**:
  - Manual login tests for member and staff accounts
  - Verify direct protected-route redirects still resolve correctly

### Task 1.4: Create shared page-state primitives
- **Location**: `components/member/**` or `components/app/**`
- **Description**: Add reusable member-facing primitives for loading, empty states, status cards, reward/challenge tiles, activity feed items, personal progress summaries, and mobile bottom/top navigation. These should sit on top of the existing design system, not replace it, and should support a Strava-like activity-first presentation.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Shared UI primitives exist for member pages
  - Empty/loading/error states are defined for all planned surfaces
  - Components are responsive and usable on mobile-first layouts
- **Validation**:
  - Visual smoke test on desktop and mobile breakpoints

## Sprint 2: Core Member Workflows
**Goal**: Ship the primary gym-goer experience using existing functions with minimal backend changes.
**Demo/Validation**:
- A member can open their dashboard, see progress, check in, join a challenge, redeem a reward, and update their profile
- No admin-only actions are available

### Task 2.1: Build member home dashboard
- **Location**: `app/member/page.tsx`, shared query helpers in `lib/app/queries.ts`
- **Description**: Create an activity-first member home page that behaves more like a personal training timeline than an admin dashboard. Show current streak, XP, recent check-ins, joined challenges, reward readiness, unread notifications, and social activity. Reuse existing stats and activity queries rather than creating new member-specific tables.
- **Dependencies**: Sprint 1 complete
- **Acceptance Criteria**:
  - Home page feels like a training/activity feed, not an operations dashboard
  - Dashboard shows member-specific summary data only
  - Data comes from current `profiles`, `member_stats`, `checkins`, `challenge_participants`, and `notifications`
  - No admin metrics such as gym-wide member count or analytics cards are shown
- **Validation**:
  - Manual data verification against live member records
  - Snapshot or visual regression test if present in repo conventions

### Task 2.2: Build member check-in UX
- **Location**: `app/member/checkins/page.tsx`, `app/member/checkins/qr/page.tsx`, `app/member/checkins/qr/[token]/page.tsx`
- **Description**: Expose self-check-in flows for gym-goers using the existing `createCheckin`, `createCheckinToken`, and `consumeCheckinToken` logic. The member UX should present a clean self-service flow rather than the current staff-oriented check-in page.
- **Dependencies**: Task 1.2, Task 1.3
- **Acceptance Criteria**:
  - Member can record a self check-in
  - Member can generate and use QR token flows
  - The UX does not expose manual check-in for other users
- **Validation**:
  - Manual self check-in test
  - Manual QR token generation and consume flow

### Task 2.3: Build challenge participation UX
- **Location**: `app/member/challenges/page.tsx`, `app/app/challenges/actions.ts`, `lib/app/queries.ts`
- **Description**: Create a member-focused challenges page that surfaces discoverable challenges, progress, participation state, and completion status while reusing `joinChallenge`. Staff creation/completion controls must be removed from this surface.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Member sees joinable and joined challenges
  - Progress and completion state are visible
  - Only member-safe action is exposed
- **Validation**:
  - Join challenge flow works end-to-end
  - Existing challenge progress updates still surface correctly

### Task 2.4: Build rewards catalog and redemption UX
- **Location**: `app/member/rewards/page.tsx`, `app/app/rewards/actions.ts`
- **Description**: Create a member rewards page that shows XP balance, reward affordability, stock state, and redemption history. Reuse `redeemReward`; do not expose create/update fulfillment controls.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Rewards list shows XP cost and current affordance
  - Redemption works through the current action
  - Fulfillment state is visible, but staff fulfillment controls are hidden
- **Validation**:
  - Redeem reward flow updates XP and redemption history
  - Out-of-stock and insufficient-XP states are handled cleanly

### Task 2.5: Build member profile and progress UX
- **Location**: `app/member/profile/page.tsx`, `app/app/profile/actions.ts`, `lib/app/queries.ts`
- **Description**: Create a member profile page that reuses `updateProfile` and current stats, but presents them as a personal progress page. Include XP, streaks, activity summary, and placeholders for future leveling/badges if not yet fully implemented.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Member can update profile name
  - Stats are presented as personal progress, not admin reporting
  - Missing features like levels/badges are represented without fake data
- **Validation**:
  - Profile update persists
  - Stats match current `member_stats` records

## Sprint 3: Social, Notifications, and Engagement Polish
**Goal**: Complete the member loop with community, notifications, and UX polish tied to already implemented engagement logic.
**Demo/Validation**:
- A member can react/comment in the community feed, read notifications, and move through the app cleanly on mobile and desktop

### Task 3.1: Build member community feed
- **Location**: `app/member/community/page.tsx`, `app/app/community/actions.ts`
- **Description**: Create a member-facing community feed that reuses `postShoutout`, `toggleActivityReaction`, and `addActivityComment`. The page should frame the experience around participation and social proof, not administration.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - Feed renders recent activity for the active gym
  - Members can like and comment
  - Posting a shoutout is available if product wants peer-to-peer recognition in v1
- **Validation**:
  - Like/unlike works
  - Comment submission works
  - Shoutout posting behavior is confirmed against product intent

### Task 3.2: Build member notifications inbox
- **Location**: `app/member/notifications/page.tsx`, `app/app/notifications/actions.ts`
- **Description**: Expose notifications in a member-first inbox, reusing `markNotificationRead` and current challenge/reward/retention notification records.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Unread/read state is visible
  - Mark-as-read works
  - Notification copy and grouping match member expectations
- **Validation**:
  - Manual read-state update test
  - Verify notifications still revalidate correctly

### Task 3.3: Add member navigation and engagement shortcuts
- **Location**: member layout components, shared nav components
- **Description**: Add fast actions and route-level UX polish such as “Check in now”, “Open QR”, “View active challenge”, “Redeem reward”, and “Unread notifications”. Optimize for mobile-first member usage and a Strava-like rhythm where the most important actions and activity are always close to the home surface.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - Member navigation is shorter and task-driven
  - Primary actions are reachable within one tap/click
  - Current admin wording like “command center” is removed from member views
- **Validation**:
  - Manual UX walk-through on narrow and wide screens

### Task 3.4: Align permissions and visibility across reused functions
- **Location**: member pages, `app/app/**/actions.ts`, possibly extracted helpers under `lib/app/**`
- **Description**: Ensure member pages only call actions that are safe for gym-goers, and refactor mixed pages where the same file currently contains both staff and member controls. Extract shared helper functions if page-level actions are too coupled to admin UI assumptions.
- **Dependencies**: Tasks 3.1-3.3
- **Acceptance Criteria**:
  - Member routes do not expose staff forms or fields
  - Any reused action has the right permission guard
  - Shared logic extraction reduces duplication where needed
- **Validation**:
  - Manual permission tests with member and staff users
  - Code review of shared helper boundaries

## Sprint 4: Hardening, Validation, and Release Readiness
**Goal**: Make the member UX production-safe, testable, and easy to ship incrementally.
**Demo/Validation**:
- End-to-end member flows pass against a real gym/member dataset
- Admin and member experiences coexist without route confusion

### Task 4.1: Add route protection and role guard tests
- **Location**: auth helpers, route tests, E2E tests if available
- **Description**: Test that members cannot access staff-only pages and that staff/admin users are not broken by the new member surface.
- **Dependencies**: Sprint 3 complete
- **Acceptance Criteria**:
  - Member access to admin-only routes is handled intentionally
  - Staff access to member routes is either allowed or redirected by policy
  - Redirect behavior is deterministic after login
- **Validation**:
  - Automated integration or E2E coverage for role routing

### Task 4.2: Add member flow smoke tests
- **Location**: test suite path matching current repo conventions
- **Description**: Add coverage for login, dashboard load, self check-in, QR flow, challenge join, reward redemption, profile update, notification read, and community reactions/comments.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Core member flows have repeatable automated validation
  - Test fixtures cover at least one member and one staff user
- **Validation**:
  - CI or local test run passes

### Task 4.3: Populate seed/demo data for member walkthroughs
- **Location**: existing seed scripts or new seed fixtures
- **Description**: Create realistic gym-goer demo data so the new UX can be reviewed without empty states everywhere. Include XP, joined challenges, reward eligibility, community activity, and notifications.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - Demo accounts exist for member and staff roles
  - Demo data lights up all major member pages
- **Validation**:
  - Manual walkthrough using seeded accounts

### Task 4.4: Prepare incremental rollout and rollback
- **Location**: routing/config documentation, release checklist
- **Description**: Ship the member UX behind a controlled route rollout, with clear rollback steps if auth routing or reused actions create regressions.
- **Dependencies**: Tasks 4.1-4.3
- **Acceptance Criteria**:
  - Rollout order is documented
  - Fallback route behavior is documented
  - Admin UX can continue operating if member UX is paused
- **Validation**:
  - Manual rollback simulation in staging or local dev

## Testing Strategy
- Use existing auth/session flow with separate member and staff test accounts
- Validate every member-facing page against real Supabase-backed data, not mocked-only state
- Test both direct route visits and post-login redirects
- Add regression coverage for reused server actions so member UX changes do not break admin flows
- Verify mobile and desktop layouts for member pages
- Validate permissions explicitly:
  - member can self check-in, join challenge, redeem reward, react/comment, update profile, mark notifications read
  - member cannot create challenge, create reward, manage redemptions, manage gyms, access analytics, or add other members

## Potential Risks & Gotchas
- The current `/app` shell is explicitly admin-oriented. Reusing it for members would produce poor UX and accidental admin exposure.
- “Strava for gyms” is a product direction, not a literal clone. The UI should borrow the activity-feed, momentum, and personal progress patterns without pretending the product is endurance-sport tracking.
- Some existing pages mix staff and member concerns in the same route. Shared business logic may need extraction before the member surface can stay clean.
- Current login defaults to `/app`, so post-login role routing is a real integration point, not just a UI change.
- “User profile with levels and badges” is only partially implemented today. The member UX must not invent level/badge behavior that the backend does not yet support.
- Challenge progress exists, but challenge invitations and time-based leaderboard filters are still missing. The member plan should treat those as follow-on items unless explicitly added to scope.
- Community posting rules are product-sensitive. If peer-to-peer shoutouts are not desired in v1, `postShoutout` should remain staff-only even though the current action itself does not enforce that distinction.
- Networks/inter-gym functionality exists structurally, but the live project has little real data. Member-facing network views should be deferred or clearly labeled as phase-two member work.

## Rollback Plan
- Keep admin `/app` routes unchanged while developing the member surface in a separate namespace
- Ship role-aware login routing only after member pages are functional; before that, keep default redirects unchanged
- If member UX causes regressions, disable role redirect and remove links to the member surface while preserving all underlying actions and schema
- If shared helper extraction causes issues, revert to current action boundaries and reintroduce reuse more narrowly
