# Welcome to your Dyad Haulage App (Web Office Side)

This application provides the "Office" web interface for a simulated Haulage App.
It uses React, Vite, TypeScript, and Tailwind CSS with shadcn/ui components.
Supabase integration is set up, but all backend interactions (database, RLS, Edge Functions) are currently **simulated** using client-side mock data.

## Quick Start

1.  **Install Dependencies:**
    ```bash
    pnpm i
    ```
    (Note: The original prompt mentioned a monorepo with `pnpm --filter web dev`, but this project is a single React/Vite app. `pnpm i` will install all dependencies for this project.)

2.  **Set up Supabase Environment Variable:**
    Create a file named `.env.local` in the root of this project (next to `package.json`).
    Add your Supabase Anon Key to it:
    ```
    VITE_SUPABASE_KEY="YOUR_ACTUAL_SUPABASE_ANON_KEY"
    ```
    (Replace `"YOUR_ACTUAL_SUPABASE_ANON_KEY"` with your real Supabase public (anon) key. This file is ignored by Git.)

3.  **Run the Development Server:**
    ```bash
    pnpm dev
    ```
    The app will be available at `http://localhost:8080` (or another port if 8080 is in use).

## Simulated User Roles

This application simulates user roles (Admin, Office, Driver) for demonstration purposes. You can switch between roles on the Dashboard page to see how the UI and data visibility change.

*   **Admin:** Can see all job details (including price), access Admin Checklists and Admin User Management pages.
*   **Office:** Can see all job details (including price), but cannot access Admin pages.
*   **Driver:** Can only see jobs assigned to them, and the "Price" column is hidden. Cannot access Admin pages.

**To switch roles:** On the Dashboard (`/`), use the "View as:" dropdown in the top right corner.

## Implemented Features (Client-side Simulation)

*   **Dashboard (`/`):**
    *   Displays a table of jobs.
    *   Jobs are sorted by status (active first) and date.
    *   Unallocated jobs are highlighted yellow.
    *   "Price" column is hidden for the 'Driver' role.
    *   "Open" button navigates to job details.
*   **Job Detail (`/jobs/:id`):**
    *   Shows job reference, date, status, assigned driver, and price (conditionally).
    *   Tabs for "Timeline" (job events), "Stops" (collection/delivery points), and "PODs" (proof of delivery images).
    *   Action buttons (visible for Office/Admin):
        *   "Assign Driver": Allows assigning a driver to the job.
        *   "Request POD": Simulates sending a POD request.
        *   "Export PDF": Simulates generating and opening a PDF report.
        *   "Clone Job": Simulates duplicating the job and its stops.
        *   "Cancel Job": Simulates cancelling the job.
*   **Drivers List (`/drivers`):**
    *   Lists all drivers with their truck registration, last known location, and last job status.
*   **Admin Checklist Editor (`/admin/checklists`):**
    *   (Admin role only) Allows selecting and editing the JSON structure of daily checklists.
    *   Simulates saving changes and logging audit events.
*   **Admin User Management (`/admin/users`):**
    *   (Admin role only) Lists users, allows creating new users, editing their roles, and simulating disabling users.
    *   Simulates logging audit events for user creation/updates.

**Note on Backend:** All interactions with Supabase (fetching data, creating/updating records, calling Edge Functions) are currently **simulated** using client-side mock data and placeholder functions in `src/lib/supabase.ts`. In a real application, these would be replaced with actual Supabase API calls and HTTP requests to your deployed Edge Functions.