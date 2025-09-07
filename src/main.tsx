import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabaseClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClient and QueryClientProvider

// Create a client for TanStack Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}> {/* Wrap with QueryClientProvider */}
        <App />
      </QueryClientProvider>
    </SessionContextProvider>
  </React.StrictMode>
);