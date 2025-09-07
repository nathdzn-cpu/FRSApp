import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabaseClient';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <App />
    </SessionContextProvider>
  </React.StrictMode>
);