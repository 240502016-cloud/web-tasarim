import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { OturumSaglayici } from "./baglam/OturumBaglami";
import "./styles/stil.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OturumSaglayici>
          <App />
          <Toaster position="top-center" />
        </OturumSaglayici>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
