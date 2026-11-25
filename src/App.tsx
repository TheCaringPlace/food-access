import { lazy, Suspense, useEffect } from "react";
import { useLocationData } from "./hooks/useLocationData";
import { LoadingState } from "./components/LoadingState";

const LocationFinder = lazy(() => import("./components/LocationFinder"));

function App({
  locationsUrl = "/locations.json",
  syncUrl = true,
  includeStructuredData = true,
  includeTitle = true,
}: {
  locationsUrl?: string;
  syncUrl?: boolean;
  includeStructuredData?: boolean;
  includeTitle?: boolean;
} = {}) {
  const { locations, loading, error } = useLocationData(locationsUrl);

  useEffect(() => {
    if (!includeStructuredData || loading || error) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.foodAccessPoints = "structured-data";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Food Access Points",
      numberOfItems: locations.length,
      itemListElement: locations.map((location, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Place",
          name: location.name,
          description: `${location.type}. Days open: ${location.days_open}. Hours: ${location.times_open}.`,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.address,
            addressLocality: location.city,
            addressRegion: location.state,
            postalCode: location.zip,
            addressCountry: "US",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      })),
    });
    document.head.append(script);

    return () => script.remove();
  }, [error, includeStructuredData, loading, locations]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <LoadingState className="min-h-screen" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 text-sm text-red-700" role="alert">
        {error}
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <LoadingState className="min-h-screen" />
        </main>
      }
    >
      <LocationFinder locations={locations} syncUrl={syncUrl} includeTitle={includeTitle} />
    </Suspense>
  );
}

export default App;
