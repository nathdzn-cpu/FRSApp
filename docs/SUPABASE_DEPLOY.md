# Supabase Edge Function Deployment Guide

This guide outlines the steps to authenticate your Supabase CLI, link your project, set necessary secrets, and deploy your Edge Functions.

## Prerequisites

*   **Supabase Project:** You need an existing Supabase project.
*   **Node.js and npm:** Ensure you have Node.js and npm installed.

## Deployment Steps

1.  **Create a Personal Access Token (PAT)**
    *   Go to your Supabase Dashboard.
    *   Navigate to `Account` → `Access Tokens`.
    *   Click "New token" to generate a new Personal Access Token. Copy this token.

2.  **Install Supabase CLI (if not already installed)**
    ```bash
    npm i -g supabase
    ```

3.  **Log in to Supabase CLI**
    Run the login command and paste your PAT when prompted.
    ```bash
    npm run sb:login
    ```

4.  **Link to your Supabase Project**
    This command links your local repository to your Supabase project using its reference ID.
    ```bash
    npm run sb:link
    ```

5.  **Set Edge Function Secrets**
    Your Edge Functions might need access to Supabase environment variables (like `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`). Set these secrets once.
    **Important:** Replace `<your_service_role_key>` and `<your_anon_public_key>` with your actual keys from your Supabase project settings.
    ```bash
    export SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
    export SUPABASE_ANON_KEY=<your_anon_public_key>
    npm run sb:secrets
    ```
    *(Note: For local development, you might also need to set `VITE_SUPABASE_KEY` in your `.env.local` file for the client-side app.)*

6.  **Deploy the Edge Functions**
    This will deploy the `admin-daily-check-items` and `driver-daily-check-submit` functions.
    ```bash
    npm run sb:deploy:daily
    ```

7.  **Verify Deployment**
    List your deployed functions to ensure they are active.
    ```bash
    npm run sb:list
    ```
    You should see both functions with a deployed version.

## Common Gotchas

*   **Wrong Workspace:** Ensure you run all `supabase` commands from the root of your repository, where the `supabase/` folder is located.
*   **Missing PAT:** If `supabase login` wasn't successfully completed in your environment, deployment will fail with an "access token not found" error.
*   **Unlinked Project:** If `supabase link` wasn't run (or was run for a different project), the CLI won't know your project reference.
*   **Secrets Not Set:** Functions that read `Deno.env.get('YOUR_SECRET_KEY')` will crash at runtime if you forgot to set them using `supabase secrets set`.
*   **Node Imports in Edge Functions:** Supabase Edge Functions run on Deno. Ensure your function code uses Deno-compatible imports (e.g., `https://deno.land/...` or `https://esm.sh/...`), not Node-only packages.

---