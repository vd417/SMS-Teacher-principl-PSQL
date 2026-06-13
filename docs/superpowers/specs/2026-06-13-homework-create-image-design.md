# Create Homework with Image Attachment — Design

**Date:** 2026-06-13
**Status:** Approved

## Goal

Let a teacher create a new homework (assignment) from the app, including an
optional image attachment (from photo library or camera). The image is stored
on-device only (mock data layer); there is no real backend call.

Today `AssignmentsScreen` is read-only — it lists homework via
`repos.assignments.list()`. There is no create flow. The Exams module already
has the full create pattern (`ExamsRepository.create` + `useCreateExam` +
`ExamNewScreen`); we mirror it.

## Requirements

- New "New Homework" form screen, reached from a ＋ action on the Assignments header.
- Fields: **title**, **class**, **due date**, **description**, **image** (optional).
- Image source: **photo library or camera** (camera falls back to file picker on web).
- Persisted on-device via the mock repository + AsyncStorage.
- Created homework appears immediately in the Assignments list (optimistic).
- Cards show the attached image thumbnail and description when present.

## Design

### Dependency

- Add `expo-image-picker` (installed via `npx expo install` for SDK-54 compatibility).
  Use `launchImageLibraryAsync` / `launchCameraAsync` with permission requests.
  On web, camera is unavailable and the action falls back to the library/file picker.

### Data model (`src/data/domain/index.ts`)

- Extend `Assignment` with optional `description?: string` and `imageUri?: string`.

### Repository contract (`src/data/repositories/types.ts`)

- Add `NewAssignmentInput { title; classId; dueDate; description?; imageUri? }`.
- Add `create(input: NewAssignmentInput): Promise<Assignment>` to `AssignmentsRepository`.

### Mock repo (`src/data/mock/assignments.repo.ts`)

- Implement `create` mirroring `mockExams.create`:
  - derive `className`/`subject`/`totalStudents` from the class (`classId`),
  - `id = genId('asgn')`, `submissionsCount = 0`, `status = 'active'`,
  - `unshift` into `store.tables.assignments`, then `persist('assignments')`,
  - store `description` and `imageUri` as given (picker URI: data URI on web, file URI on native).

### HTTP repo (`src/data/http/assignments.repo.ts`)

- Add a matching `create` (POST `/assignments`) so the interface is satisfied.
  Not exercised in mock mode. Extend `AssignmentDTO`/mappers with `description`,
  `image_uri` as optional.

### Mutation hook (`src/features/assignments/hooks.ts`)

- Add `useCreateAssignment` with optimistic insert into the `assignments` query
  cache, rollback on error, invalidate on settle (mirrors `useCreateExam`).

### Validation (`src/validation/schemas.ts`)

- `assignmentSchema`: `title` min 3, `classId` required, `dueDate` required,
  `description` optional, `imageUri` optional. Export `AssignmentSchemaType`.

### UI

`src/screens/AssignmentNewScreen.tsx` (new) — mirrors `ExamNewScreen`:

- Title (text), Class (chips from `useClasses`), Due date (text `YYYY-MM-DD`),
  Description (multiline), Image picker row.
- Image row: a button that opens an action sheet — _Photo Library_ / _Take Photo_
  (Take Photo hidden/falls back on web) — then shows a thumbnail preview with a
  remove (✕) control.
- Submit → `useCreateAssignment.mutate` → success Toast → `goBack()`.

`src/screens/AssignmentsScreen.tsx`:

- Add a ＋ button via `ScreenHeader.rightComponent` → navigates to `AssignmentNewScreen`.
- Render the image thumbnail and description on a card when present.

### Navigation

- Add `AssignmentNewScreen: undefined` to `HomeStackParamList`
  (`src/navigation/types.ts`) and register the screen in the Home stack
  (`src/navigation/MainTabNavigator.tsx`).

## Testing

- Unit: `mockAssignments.create` (derives class fields, prepends, persists, keeps
  image/description) and `assignmentSchema` (valid/invalid cases).
- Manual (web, Chrome via CDP): open New Homework, fill fields, pick an image,
  submit, confirm it appears at the top of the list with the thumbnail.

## Out of scope

- Real image upload to a server; multiple attachments; editing/deleting homework;
  image cropping/compression.
