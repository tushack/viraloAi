import { useEffect, useState } from "react";

const NAVIGATION_EVENT = "viralo:navigation";

const DEFAULT_TITLE =
  "Viralo AI – AI Content Research & Creator Intelligence";

const DEFAULT_DESCRIPTION =
  "Discover trending content ideas, analyze YouTube competitors, validate video concepts, and create complete creator-ready content packs with Viralo AI.";

const PUBLIC_ROUTE_META = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: "website",
  },
  "/help": {
    title: "Help & Legal | Viralo AI",
    description:
      "Find Viralo AI support, company information, contact details, privacy information, and service terms.",
    type: "website",
  },
  "/about": {
    title: "About Viralo AI | Creator Intelligence Platform",
    description:
      "Learn how Viralo AI helps creators and social-media teams research trends, validate ideas, analyze competitors, and plan content.",
    type: "article",
  },
  "/contact": {
    title: "Contact Viralo AI | Product, Billing & Account Support",
    description:
      "Contact Viralo AI for product support, account help, billing questions, privacy requests, partnerships, and business enquiries.",
    type: "website",
  },
  "/terms": {
    title: "Terms of Service | Viralo AI",
    description:
      "Read the Viralo AI terms covering accounts, subscriptions, acceptable use, creator responsibilities, and platform access.",
    type: "article",
  },
  "/privacy": {
    title: "Privacy Policy | Viralo AI",
    description:
      "Learn how Viralo AI collects, uses, stores, protects, and deletes account, creator-workspace, and payment-status information.",
    type: "article",
  },
  "/refund-cancellation": {
    title: "Refund & Cancellation Policy | Viralo AI",
    description:
      "Read the Viralo AI refund window, cancellation process, eligibility conditions, request procedure, and expected payment-provider timelines.",
    type: "article",
  },
};

const PRIVATE_ROUTE_META = {
  "/verify-email": {
    title: "Verify Email | Viralo AI",
    description: "Verify your Viralo AI account email.",
  },
  "/onboarding": {
    title: "Creator Onboarding | Viralo AI",
    description: "Set up your Viralo AI creator profile.",
  },
  "/dashboard": {
    title: "Creator Dashboard | Viralo AI",
    description: "Your personalized Viralo AI creator dashboard.",
  },
  "/fresh-topics": {
    title: "Fresh Topics | Viralo AI",
    description: "Discover content opportunities for your creator niche.",
  },
  "/trends": {
    title: "Trend Research | Viralo AI",
    description: "Research current creator and YouTube trends.",
  },
  "/competitors": {
    title: "Competitor Analysis | Viralo AI",
    description: "Analyze public creator and YouTube competitor signals.",
  },
  "/saved-ideas": {
    title: "Saved Ideas | Viralo AI",
    description: "Manage your saved creator ideas.",
  },
  "/history": {
    title: "Research History | Viralo AI",
    description: "Review your Viralo AI research history.",
  },
  "/settings": {
    title: "Account Settings | Viralo AI",
    description: "Manage your Viralo AI account and workspace settings.",
  },
  "/data-privacy": {
    title: "Data & Privacy Controls | Viralo AI",
    description: "Manage or delete your Viralo AI account data.",
  },
  "/payment": {
    title: "Plans & Subscription | Viralo AI",
    description: "Review Viralo AI plans and subscription access.",
  },
  "/checkout": {
    title: "Secure Checkout | Viralo AI",
    description: "Complete your Viralo AI subscription payment.",
  },
  "/payment/success": {
    title: "Pro Plan Active | Viralo AI",
    description: "Your Viralo AI Pro plan status.",
  },
  "/payment/failed": {
    title: "Payment Status | Viralo AI",
    description: "Review or retry your Viralo AI payment.",
  },
  "/content-pack": {
    title: "Content Pack | Viralo AI",
    description: "Build a creator-ready content pack.",
  },
  "/saved-thumbnails": {
    title: "Saved Thumbnails | Viralo AI",
    description: "Manage your saved creator thumbnails.",
  },
  "/profile": {
    title: "Creator Profile | Viralo AI",
    description: "Manage your Viralo AI creator profile.",
  },
  "/viral-check": {
    title: "Viral Check | Viralo AI",
    description: "Validate your creator content packaging.",
  },
  "/media-export": {
    title: "YouTube Downloader & Media Export | Viralo AI",
    description: "Use your Viralo AI media export workspace.",
  },
  "/admin": {
    title: "Admin | Viralo AI",
    description: "Viralo AI administration.",
  },
};

function normalizePath(pathname) {
  const cleaned = String(pathname || "/")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "");

  return cleaned || "/";
}

function getSiteOrigin() {
  const configuredOrigin = String(
    import.meta.env.VITE_SITE_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const currentOrigin = window.location.origin;
  const hostname = window.location.hostname;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return "https://viraloai.com";
  }

  return currentOrigin.replace(/\/+$/, "");
}

function setNamedMeta(name, content) {
  let element = document.head.querySelector(
    `meta[name="${name}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setPropertyMeta(property, content) {
  let element = document.head.querySelector(
    `meta[property="${property}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(url) {
  let element = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

function replaceStructuredData(data) {
  document.head
    .querySelectorAll(
      'script[type="application/ld+json"][data-viralo-route-seo="true"]'
    )
    .forEach((element) => element.remove());

  if (!data) return;

  const script = document.createElement("script");

  script.type = "application/ld+json";
  script.dataset.viraloRouteSeo = "true";
  script.textContent = JSON.stringify(data);

  document.head.appendChild(script);
}

function createPublicStructuredData({
  path,
  title,
  description,
  canonicalUrl,
  siteOrigin,
}) {
  const webpage = {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    isPartOf: {
      "@id": `${siteOrigin}/#website`,
    },
    about: {
      "@id": `${siteOrigin}/#organization`,
    },
  };

  const graph = [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: `${siteOrigin}/`,
      name: "Viralo AI",
      description: DEFAULT_DESCRIPTION,
      publisher: {
        "@id": `${siteOrigin}/#organization`,
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Viralo AI",
      url: `${siteOrigin}/`,
      logo: `${siteOrigin}/favicon.png`,
      email: "support@viraloai.com",
    },
    webpage,
  ];

  if (path !== "/") {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${siteOrigin}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title.replace(/\s*\|\s*Viralo AI.*$/i, ""),
          item: canonicalUrl,
        },
      ],
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function useCurrentPath() {
  const [path, setPath] = useState(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const updatePath = () => {
      setPath(
        normalizePath(window.location.pathname)
      );
    };

    const originalPushState =
      window.history.pushState;
    const originalReplaceState =
      window.history.replaceState;

    const patchedPushState = function patchedPushState(
      ...args
    ) {
      const result = originalPushState.apply(this, args);

      window.dispatchEvent(
        new Event(NAVIGATION_EVENT)
      );

      return result;
    };

    const patchedReplaceState =
      function patchedReplaceState(...args) {
        const result = originalReplaceState.apply(
          this,
          args
        );

        window.dispatchEvent(
          new Event(NAVIGATION_EVENT)
        );

        return result;
      };

    window.history.pushState = patchedPushState;
    window.history.replaceState =
      patchedReplaceState;

    window.addEventListener("popstate", updatePath);
    window.addEventListener(
      NAVIGATION_EVENT,
      updatePath
    );

    updatePath();

    return () => {
      if (
        window.history.pushState ===
        patchedPushState
      ) {
        window.history.pushState =
          originalPushState;
      }

      if (
        window.history.replaceState ===
        patchedReplaceState
      ) {
        window.history.replaceState =
          originalReplaceState;
      }

      window.removeEventListener(
        "popstate",
        updatePath
      );

      window.removeEventListener(
        NAVIGATION_EVENT,
        updatePath
      );
    };
  }, []);

  return path;
}

export default function GlobalSeo() {
  const path = useCurrentPath();

  useEffect(() => {
    const siteOrigin = getSiteOrigin();
    const publicMeta = PUBLIC_ROUTE_META[path];
    const privateMeta = PRIVATE_ROUTE_META[path];

    const metadata =
      publicMeta ||
      privateMeta || {
        title: "Page Not Found | Viralo AI",
        description:
          "The requested Viralo AI page could not be found.",
        type: "website",
      };

    const isPublic = Boolean(publicMeta);
    const canonicalUrl =
      path === "/"
        ? `${siteOrigin}/`
        : `${siteOrigin}${path}`;

    const imageUrl = `${siteOrigin}/og-image.png`;
    const robotsValue = isPublic
      ? "index,follow,max-image-preview:large"
      : "noindex,nofollow,noarchive";

    document.title = metadata.title;

    setNamedMeta(
      "description",
      metadata.description
    );

    setNamedMeta("robots", robotsValue);
    setNamedMeta("googlebot", robotsValue);
    setCanonical(canonicalUrl);

    setPropertyMeta(
      "og:type",
      metadata.type || "website"
    );
    setPropertyMeta("og:site_name", "Viralo AI");
    setPropertyMeta("og:locale", "en_US");
    setPropertyMeta("og:title", metadata.title);
    setPropertyMeta(
      "og:description",
      metadata.description
    );
    setPropertyMeta("og:url", canonicalUrl);
    setPropertyMeta("og:image", imageUrl);
    setPropertyMeta(
      "og:image:secure_url",
      imageUrl
    );
    setPropertyMeta("og:image:type", "image/png");
    setPropertyMeta("og:image:width", "1200");
    setPropertyMeta("og:image:height", "630");
    setPropertyMeta(
      "og:image:alt",
      "Viralo AI creator intelligence platform"
    );

    setNamedMeta(
      "twitter:card",
      "summary_large_image"
    );
    setNamedMeta("twitter:title", metadata.title);
    setNamedMeta(
      "twitter:description",
      metadata.description
    );
    setNamedMeta("twitter:image", imageUrl);
    setNamedMeta(
      "twitter:image:alt",
      "Viralo AI creator intelligence platform"
    );

    replaceStructuredData(
      isPublic
        ? createPublicStructuredData({
          path,
          title: metadata.title,
          description: metadata.description,
          canonicalUrl,
          siteOrigin,
        })
        : null
    );
  }, [path]);

  return null;
}
