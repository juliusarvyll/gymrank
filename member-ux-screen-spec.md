# Member UX Screen Spec

**Generated**: March 18, 2026
**Product Direction**: Strava for gyms
**Surface**: Member-facing web app on top of the existing Next.js + Supabase stack

## Purpose
This document translates [member-ux-ui-plan.md](C:\Users\juliu\Documents\gymrank\member-ux-ui-plan.md) into a concrete information architecture and screen-by-screen build spec.

The target outcome is a member experience that feels:
- activity-first
- social
- progress-driven
- mobile-biased
- lightweight and fast

The target outcome is not:
- an admin dashboard for gym members
- a literal clone of Strava
- a separate backend rewrite

## UX Principles
- Home is a feed, not a control panel.
- The fastest actions should be visible on first paint.
- Personal progress should be emotional and legible in under five seconds.
- Social proof should feel ambient across the product, not locked in one tab.
- Each screen should have one primary action and one supporting action at most.
- Admin concepts must never dominate member language.

## Technical Principles
- Reuse current server actions and domain helpers whenever permissions already fit.
- Prefer server-rendered pages with small Suspense islands for dynamic sections.
- Parallelize independent data fetches with `Promise.all`.
- Keep serialization light across server/client boundaries.
- Avoid heavy client bundles on the member surface unless interaction requires them.
- Design the member route tree separately from `/app` so admin and member UX do not fight each other.

## Proposed Route Map
- `/member`
  - Home feed
- `/member/check-in`
  - One-tap check-in
- `/member/check-in/qr`
  - Personal QR code
- `/member/check-in/qr/[token]`
  - QR consume confirmation
- `/member/challenges`
  - Discover, joined, completed
- `/member/rewards`
  - Catalog and redemption history
- `/member/community`
  - Activity feed, likes, comments, shoutouts if enabled
- `/member/notifications`
  - Inbox
- `/member/profile`
  - Identity, progress, stats

## Navigation Model
### Mobile Primary Nav
- `Home`
- `Check-In`
- `Challenges`
- `Community`
- `Profile`

### Desktop Primary Nav
- `Home`
- `Check-In`
- `Challenges`
- `Rewards`
- `Community`
- `Notifications`
- `Profile`

### Persistent Quick Actions
- `Check in now`
- `Show QR`
- `View active challenge`
- `Redeem reward`

## Shared Layout Spec
### Member Shell
- Top area:
  - gym identity
  - current streak
  - unread notification indicator
- Main body:
  - single-column by default on mobile
  - two-column only when supporting context adds value on desktop
- Bottom nav on mobile:
  - icon + label
- No left-side admin rail
- No “command center” copy

### Shared Components
- `MemberShell`
- `MemberTopBar`
- `MemberBottomNav`
- `QuickActionBar`
- `ProgressHero`
- `ActivityCard`
- `ChallengeCard`
- `RewardCard`
- `StatPill`
- `EmptyState`
- `MemberSectionHeader`

## Screen Specs
## 1. Member Home
**Route**: `/member`
**Goal**: Give the member immediate motivation and a clear next action.

### Information Hierarchy
1. Progress hero
2. Quick actions
3. Today/this week progress
4. Activity feed
5. Active challenge summary
6. Reward readiness

### Above-the-Fold Modules
- `ProgressHero`
  - profile name
  - current streak
  - total XP
  - most recent check-in time
- `QuickActionBar`
  - check in now
  - show QR
  - active challenge
- `ThisWeekSummary`
  - check-ins this week
  - classes attended
  - challenge participation count

### Lower Modules
- `FeedPreview`
  - 5-10 recent gym activity items
- `ActiveChallengePreview`
  - current joined challenge
  - progress value
  - completion state
- `RewardsPreview`
  - top 2 redeemable or near-redeemable rewards
- `NotificationsPreview`
  - latest unread item if any

### Data Sources
- `profiles`
- `member_stats`
- `checkins`
- `activity_events`
- `challenge_participants`
- `notifications`
- `rewards` and `reward_redemptions`

### Existing Functions to Reuse
- query helpers in [lib/app/queries.ts](C:\Users\juliu\Documents\gymrank\lib\app\queries.ts)
- active gym + auth in [lib/app/server.ts](C:\Users\juliu\Documents\gymrank\lib\app\server.ts)

### Performance Notes
- Split feed preview and reward preview into separate async sections behind Suspense if needed.
- Start dashboard summary queries in parallel.

## 2. Check-In
**Route**: `/member/check-in`
**Goal**: Let the member check in instantly with zero admin noise.

### Information Hierarchy
1. Primary CTA
2. Current check-in state
3. Backup QR path
4. Recent visits

### Modules
- `CheckInHero`
  - primary button: `Check in now`
  - status text: “Last checked in today at 6:12 PM” or equivalent
- `QRShortcutCard`
  - button to open QR route
- `RecentCheckInsList`
  - compact recent visits

### Existing Functions to Reuse
- `createCheckin` in [app/app/checkins/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\checkins\actions.ts)
- `recordCheckin` and challenge side-effects in [lib/app/checkins.ts](C:\Users\juliu\Documents\gymrank\lib\app\checkins.ts)

### UX Constraints
- Do not show member selection dropdown.
- Do not show verification fields.
- If a user already checked in today, show confirmation state rather than punishing duplicate taps.

## 3. Personal QR
**Route**: `/member/check-in/qr`
**Goal**: Present the member’s QR code as a clean wallet-like pass.

### Information Hierarchy
1. QR code
2. expiry state
3. fallback human-readable token link
4. refresh CTA if needed

### Modules
- `QrPassCard`
- `ExpiryNotice`
- `RefreshQrButton`

### Existing Functions to Reuse
- `createCheckinToken` in [lib/app/checkins.ts](C:\Users\juliu\Documents\gymrank\lib\app\checkins.ts)
- current QR generation route logic from [app/app/checkins/qr/page.tsx](C:\Users\juliu\Documents\gymrank\app\app\checkins\qr\page.tsx)

### UX Constraints
- The page should feel like a membership pass, not a diagnostics screen.

## 4. QR Consume Confirmation
**Route**: `/member/check-in/qr/[token]`
**Goal**: Confirm the check-in with immediate progress feedback.

### Modules
- success state:
  - check-in confirmed
  - streak delta
  - XP earned if relevant
- failure state:
  - clear issue
  - retry path

### Existing Functions to Reuse
- `consumeCheckinToken` in [lib/app/checkins.ts](C:\Users\juliu\Documents\gymrank\lib\app\checkins.ts)
- route behavior from [app/app/checkins/qr/[token]/page.tsx](C:\Users\juliu\Documents\gymrank\app\app\checkins\qr\[token]\page.tsx)

## 5. Challenges
**Route**: `/member/challenges`
**Goal**: Make challenges feel like social training goals, not admin records.

### Tabs
- `Active`
- `Available`
- `Completed`

### Card Structure
- challenge name
- time window
- progress bar or progress number
- join state
- reward XP
- top participants preview or progress positioning

### Existing Functions to Reuse
- `joinChallenge` in [app/app/challenges/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\challenges\actions.ts)
- standings/query logic in [lib/app/queries.ts](C:\Users\juliu\Documents\gymrank\lib\app\queries.ts)

### UI Notes
- Replace admin challenge creation form with discovery cards.
- Use progress-forward design:
  - “2 check-ins left”
  - “Top 12% this week”
  - “Completed”

## 6. Rewards
**Route**: `/member/rewards`
**Goal**: Turn rewards into an aspirational store, not an inventory table.

### Sections
- `Ready to redeem`
- `Almost there`
- `Redemption history`

### Reward Card
- reward name
- XP cost
- stock state
- affordability state
- redeem CTA

### Existing Functions to Reuse
- `redeemReward` in [app/app/rewards/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\rewards\actions.ts)

### UI Notes
- Use visual states:
  - available
  - locked by XP
  - out of stock
  - pending fulfillment
- Do not expose reward creation or fulfillment controls.

## 7. Community
**Route**: `/member/community`
**Goal**: Be the social heartbeat of the gym.

### Feed Composition
- check-ins
- streak milestones
- challenge joins/completions
- shoutouts

### Feed Item Actions
- like
- comment
- optional shoutout composer

### Existing Functions to Reuse
- `toggleActivityReaction` in [app/app/community/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\community\actions.ts)
- `addActivityComment` in [app/app/community/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\community\actions.ts)
- `postShoutout` in [app/app/community/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\community\actions.ts)

### UI Notes
- Feed items should feel like athlete updates translated to gym behavior:
  - “Julius kept a 5-day streak alive”
  - “Ava completed March Sprint”
  - “Coach Mike shouted out the 6 AM class”
- Prefer cards and stacked content over data grids.

## 8. Notifications
**Route**: `/member/notifications`
**Goal**: Provide a clean inbox for meaningful gym updates.

### Groups
- `Unread`
- `Earlier`

### Notification Types
- challenge completion
- retention nudges
- rewards status
- other gym engagement notifications

### Existing Functions to Reuse
- `markNotificationRead` in [app/app/notifications/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\notifications\actions.ts)

### UI Notes
- Each notification should have a destination CTA when possible.
- Avoid admin-style badges as the primary visual language.

## 9. Profile
**Route**: `/member/profile`
**Goal**: Make the member feel seen and progressing.

### Information Hierarchy
1. identity header
2. progress summary
3. streak and attendance stats
4. edit profile
5. future-facing badges/levels section

### Existing Functions to Reuse
- `updateProfile` in [app/app/profile/actions.ts](C:\Users\juliu\Documents\gymrank\app\app\profile\actions.ts)

### UI Notes
- Current backend lacks full levels/badges implementation, so present these carefully:
  - “Badges coming soon”
  - “Level system in progress”
- Do not fabricate level math.

## Action Wiring Matrix
### Directly Reusable for Member UX
- `updateProfile`
- `createCheckin`
- `joinChallenge`
- `redeemReward`
- `toggleActivityReaction`
- `addActivityComment`
- `markNotificationRead`
- `createCheckinToken`
- `consumeCheckinToken`

### Reusable With UI Filtering Only
- challenge page queries
- rewards page queries
- community page queries
- profile page queries

### Staff-Only, Must Not Appear in Member UX
- `createChallenge`
- `completeChallenge`
- `createReward`
- `updateRedemptionStatus`
- member management actions
- gym settings actions
- analytics actions
- network admin actions

## Build Order
1. Member shell and role-aware routing
2. Home + check-in
3. Challenges + rewards
4. Community + notifications
5. Profile polish
6. Tests, seed data, rollout

## Vercel / Next.js Implementation Notes
- Keep page entrypoints synchronous when possible and push async work into nested server components behind Suspense.
- Start independent member queries together.
- Keep activity feed and reward/challenge side modules as separate async islands if they slow first paint.
- Avoid large client components for the feed unless interaction strictly requires them.
- Prefer direct imports for any icon-heavy member UI package usage.
- Keep the member shell lean and avoid importing admin-only components into it.

## Acceptance Walkthrough
### Member Journey
1. Member logs in
2. Lands on `/member`
3. Sees streak, XP, active challenge, and community momentum
4. Taps `Check in now`
5. Returns to home and sees updated progress
6. Opens challenge, joins or tracks progress
7. Opens rewards, redeems if eligible
8. Reads community and reacts/comments
9. Reviews notifications
10. Updates profile

### Success Criteria
- The member experience feels like a fitness social app, not internal software.
- Every primary member action maps to already implemented backend behavior.
- Members never see staff-only forms or routes.
- Mobile navigation feels first-class.

## Open Product Decisions
- Whether members can create shoutouts in v1 or only react/comment
- Whether `Rewards` should be primary nav or live as a home sub-entry on mobile
- Whether inter-gym/network features are hidden completely in v1 member UX
