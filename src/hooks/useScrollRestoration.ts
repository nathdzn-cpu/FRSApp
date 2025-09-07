import { useEffect } from "react";

export function useScrollRestoration() {
  useEffect(() => {
    let savedY = window.scrollY;

    function handleBlur() {
      savedY = window.scrollY;
      sessionStorage.setItem("lastScrollY", String(savedY));
    }

    function handleFocus() {
      const y = sessionStorage.getItem("lastScrollY");
      if (y) {
        window.scrollTo(0, parseInt(y, 10));
      }
    }

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}