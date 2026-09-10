-- Backfill for the two-layer access model, as SQL.
--
-- This is a line-for-line equivalent of prisma/backfill-access.ts, for hosts
-- where there is no shell to run the TypeScript version — paste it into
-- phpMyAdmin's SQL tab. Run it once, immediately after the ProjectMember and
-- ClientAssignment tables are created (the `build` script's `prisma db push`
-- creates them).
--
-- Without it, src/lib/access.ts scopes every read through membership and
-- admins bypass that scoping, so the owner sees a working app while everyone
-- else signs in to an empty one.
--
-- Like the TypeScript version, this deliberately grants MORE access than the
-- final intent: every existing user is assigned to every client in their
-- workspace, so shipping access control changes nothing anyone can see on day
-- one. Access then narrows deliberately, when an admin removes an assignment,
-- rather than by surprise.
--
-- Safe to run more than once. Both statements are INSERT IGNORE against the
-- tables' unique keys, so a second run inserts nothing.
--
-- Note on `id`: Prisma generates cuids in the client, so these columns have no
-- database default and the ids must be built here. They are derived from the
-- row's own foreign keys, which makes them deterministic — a re-run computes
-- the same id for the same pair rather than a new one that the unique key then
-- rejects.

-- 1. Every project owner becomes a lead on the project they own.
--    The join to `User` both skips NULL owners and, unlike a bare
--    `ownerId IS NOT NULL`, skips owners whose user row no longer exists —
--    INSERT IGNORE would otherwise swallow those as foreign key warnings.
INSERT IGNORE INTO `ProjectMember` (`id`, `projectId`, `userId`, `role`)
SELECT
  CONCAT('bfm_', p.`id`, '_', u.`id`),
  p.`id`,
  u.`id`,
  'lead'
FROM `Project` p
JOIN `User` u ON u.`id` = p.`ownerId`;

-- 2. Every user is assigned to every client in their own workspace, so that
--    nothing disappears when scoping goes live.
INSERT IGNORE INTO `ClientAssignment` (`id`, `clientId`, `userId`)
SELECT
  CONCAT('bfc_', c.`id`, '_', u.`id`),
  c.`id`,
  u.`id`
FROM `User` u
JOIN `Client` c ON c.`workspaceId` = u.`workspaceId`
WHERE u.`workspaceId` IS NOT NULL;

-- Expected result: one row per owned project, and one row per user per client
-- in their workspace. To confirm:
--   SELECT COUNT(*) FROM `ProjectMember`;
--   SELECT COUNT(*) FROM `ClientAssignment`;
