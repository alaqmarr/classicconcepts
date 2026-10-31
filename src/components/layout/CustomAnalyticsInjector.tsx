"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

interface CustomAnalyticsInjectorProps {
  googleAnalyticsId?: string | null;
  headScripts?: string | null;
  bodyScripts?: string | null;
}

export function CustomAnalyticsInjector({
  googleAnalyticsId,
  headScripts,
  bodyScripts,
}: CustomAnalyticsInjectorProps) {
  const pathname = usePathname();
  const injectedHeadRef = useRef(false);
  const injectedBodyRef = useRef(false);

  // Lightweight client-side session page-visit tracking (zero cookie bloat, skips bots)
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    try {
      const storageKey = "cc_visited_paths";
      const raw = sessionStorage.getItem(storageKey);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (visited.includes(pathname)) return;

      const updated = [...visited.slice(-99), pathname];
      sessionStorage.setItem(storageKey, JSON.stringify(updated));

      const payload = JSON.stringify({ path: pathname });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics", blob);
      } else {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [pathname]);

  // Dynamically execute any <script> tags included in headScripts on the client
  useEffect(() => {
    if (!headScripts || injectedHeadRef.current) return;
    injectedHeadRef.current = true;

    try {
      const container = document.createElement("div");
      container.innerHTML = headScripts;

      Array.from(container.children).forEach((node) => {
        if (node.tagName === "SCRIPT") {
          const s = document.createElement("script");
          Array.from(node.attributes).forEach((attr) =>
            s.setAttribute(attr.name, attr.value)
          );
          if (node.textContent) {
            s.textContent = node.textContent;
          }
          document.head.appendChild(s);
        } else {
          document.head.appendChild(node.cloneNode(true));
        }
      });
    } catch (e) {
      console.error("Failed to inject custom head scripts:", e);
    }
  }, [headScripts]);

  // Dynamically execute any <script> tags included in bodyScripts on the client
  useEffect(() => {
    if (!bodyScripts || injectedBodyRef.current) return;
    injectedBodyRef.current = true;

    try {
      const container = document.createElement("div");
      container.innerHTML = bodyScripts;

      Array.from(container.children).forEach((node) => {
        if (node.tagName === "SCRIPT") {
          const s = document.createElement("script");
          Array.from(node.attributes).forEach((attr) =>
            s.setAttribute(attr.name, attr.value)
          );
          if (node.textContent) {
            s.textContent = node.textContent;
          }
          document.body.appendChild(s);
        } else {
          document.body.appendChild(node.cloneNode(true));
        }
      });
    } catch (e) {
      console.error("Failed to inject custom body scripts:", e);
    }
  }, [bodyScripts]);

  const cleanGaId = googleAnalyticsId?.trim();

  return (
    <>
      {cleanGaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${cleanGaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${cleanGaId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
