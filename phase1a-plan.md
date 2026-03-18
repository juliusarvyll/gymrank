# Phase 1A Execution Plan

Plan source: `plan.md`
Scope: Implement missing or partial Phase 1A engagement features in the current GymRank codebase.

## Overview

Phase 1A in `plan.md` covers:
- Challenge system improvements
- Leaderboards and competition improvements
- Community features
- Rewards system completion
- Refinement and stability

Current audit baseline:
- Challenge creation/join exists, but there is no challenge leaderboard or progress-focused UI.
- Leaderboards only expose a single gym member XP board.
- Community only supports shoutouts and a feed.
- Rewards baseline exists, but no additional Phase 1A work is required unless integration gaps surface.

## Tasks

### T1: Challenge Progress And Completion UX
- **status**: completed
- **depends_on**: []
- **locations**:
  - `app/app/challenges/page.tsx`
  - `app/app/challenges/actions.ts`
  - `lib/app/checkins.ts`
  - `app/app/notifications/actions.ts`
- **description**:
  Expand the challenge experience so members and staff can see challenge progress, leaderboard-like participant standings, and clearer completion/reward outcomes. Keep changes within the existing challenge domain.
- **acceptance_criteria**:
  - Challenge page shows participant progress for existing challenges
  - Staff can see a challenge participant board from the challenge screen
  - Completion state is visible in the UI
  - Reward integration remains functional for challenge completion
- **validation**:
  - `npm run build`
  - `npm run lint`
- **work_log**:
  - Added per-challenge participant boards, progress bars, completion badges, and staff completion actions on the challenge screen.
  - Wired challenge completion notifications and page revalidation into challenge and check-in flows.
  - Validation passed for `npm run build`; `npm run lint` still reports an unrelated unused variable in `app/app/classes/page.tsx`, which is outside T1 scope.

### T2: Expanded Leaderboards
- **status**: pending
- **depends_on**: []
- **locations**:
  - `app/app/leaderboards/page.tsx`
  - `app/app/classes/page.tsx`
  - `lib/app/queries.ts`
- **description**:
  Replace the single leaderboard view with multiple leaderboard modes that better match Phase 1A: XP, streaks, check-ins, class attendance, and challenge standings where practical from existing schema.
- **acceptance_criteria**:
  - Leaderboards page offers multiple ranking modes
  - Gym leaderboard includes XP, streak, and check-in views
  - Class attendance leaderboard is represented using existing attendance data
  - Challenge leaderboard data is surfaced or linked from leaderboard UX
- **validation**:
  - `npm run build`
  - `npm run lint`
- **work_log**:
  - Pending

### T3: Community Social Features
- **status**: pending
- **depends_on**: []
- **locations**:
  - `app/app/community/page.tsx`
  - `app/app/community/actions.ts`
  - `supabase/schema.sql`
  - `supabase/migrations`
- **description**:
  Add missing social features for the community feed using minimally invasive schema additions and UI improvements. Focus on reactions and comments, which are the clearest missing Phase 1A items from the current implementation.
- **acceptance_criteria**:
  - Members can react to activity feed items
  - Members can add comments to activity feed items
  - Community page displays reactions/comments counts or lists
  - New schema changes are captured in a migration
- **validation**:
  - `npm run build`
  - `npm run lint`
- **work_log**:
  - Pending

### T4: Phase 1A Integration And Verification
- **status**: pending
- **depends_on**: [T1, T2, T3]
- **locations**:
  - `plan.md`
  - `phase1a-plan.md`
  - `app/app`
- **description**:
  Integrate the parallel Phase 1A feature work, reconcile any overlap, update plan documentation, and verify the app remains stable.
- **acceptance_criteria**:
  - All Phase 1A tasks are integrated without regressions
  - `plan.md` remains aligned with actual implementation status
  - Build and lint pass after integration
- **validation**:
  - `npm run build`
  - `npm run lint`
- **work_log**:
  - Pending

## Execution Log

- Wave 1: T1, T2, T3
- Wave 2: T4
