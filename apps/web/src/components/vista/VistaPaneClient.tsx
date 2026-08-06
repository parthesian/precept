"use client";

import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

export function VistaPaneClient({
  filmSlug,
  placeSlug,
}: {
  filmSlug?: string;
  placeSlug?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<maplibregl.Map | null>(null);
  const { selection, setSelection, filters } = useSelectionStore();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const filmLocations = useQuery({
    queryKey: ["film-locations", filmSlug],
    queryFn: () => api.getFilmLocations(filmSlug!),
    enabled: Boolean(filmSlug),
  });

  const allPlaces = useQuery({
    queryKey: ["places"],
    queryFn: () => api.getPlaces("?limit=200"),
    enabled: !filmSlug,
  });

  const placeDetail = useQuery({
    queryKey: ["place", placeSlug],
    queryFn: () => api.getPlace(placeSlug!),
    enabled: Boolean(placeSlug),
  });

  const markers = useMemo(() => {
    if (filmSlug && filmLocations.data) {
      return filmLocations.data
        .filter((l) =>
          filters.locationRelationship
            ? l.relationship === filters.locationRelationship
            : true
        )
        .map((l) => ({
          id: l.place.id,
          slug: l.place.slug,
          name: l.place.name,
          lat: l.place.lat,
          lng: l.place.lng,
          relationship: l.relationship,
          doubling: l.is_doubling_for,
          scene: l.scene_description,
        }));
    }
    return (allPlaces.data ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      relationship: "filmed_at" as const,
      doubling: null,
      scene: p.notes,
    }));
  }, [filmSlug, filmLocations.data, allPlaces.data, filters.locationRelationship]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-87.65, 41.88],
      zoom: 3,
    });
    mapObj.current = map;
    return () => {
      map.remove();
      mapObj.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    const markerEls: maplibregl.Marker[] = [];
    for (const m of markers) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-marker ${m.relationship}`;
      el.title = m.name;
      el.setAttribute("aria-label", m.name);
      el.onclick = () => {
        setSelectedPlaceId(m.id);
        setSelection({ type: "place", id: m.id, slug: m.slug, label: m.name });
      };
      markerEls.push(new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map));
    }

    if (markers.length) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 300 });
    }

    const doubling = markers.filter((m) => m.doubling);
    const features = doubling
      .map((m) => {
        const target =
          markers.find((x) => x.id === m.doubling) ||
          (allPlaces.data ?? []).find((p) => p.id === m.doubling);
        if (!target) return null;
        return {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [m.lng, m.lat],
              ["lng" in target ? target.lng : 0, "lat" in target ? target.lat : 0],
            ],
          },
        };
      })
      .filter(Boolean);

    const sourceId = "doubling";
    const onLoad = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: features as any,
        });
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: features as any },
        });
        map.addLayer({
          id: "doubling-line",
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#c4943a",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
      }
    };
    if (map.isStyleLoaded()) onLoad();
    else map.once("load", onLoad);

    return () => {
      markerEls.forEach((m) => m.remove());
    };
  }, [markers, allPlaces.data, setSelection]);

  const activePlace =
    placeDetail.data ||
    markers.find((m) => m.id === selectedPlaceId) ||
    (selection?.type === "place" ? markers.find((m) => m.id === selection.id) : null);

  return (
    <div className="vista-pane">
      <header className="pane-header">
        <h1>Vista</h1>
        <p className="muted">
          {filmSlug
            ? `Locations for ${filmSlug.replace(/-/g, " ")}`
            : placeSlug
              ? placeDetail.data?.name ?? placeSlug
              : "Filming & setting map"}
        </p>
      </header>
      <div className="vista-body">
        <div ref={mapRef} className="map-canvas" />
        <aside className="place-panel">
          {placeDetail.data ? (
            <>
              <h2>{placeDetail.data.name}</h2>
              <p className="muted">
                {[placeDetail.data.locality, placeDetail.data.region, placeDetail.data.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <h3>Films</h3>
              <ul>
                {(placeDetail.data.films ?? []).map((f: any) => (
                  <li key={f.id}>
                    <Link href={`/homage/film/${f.slug}`}>{f.title}</Link>
                    <span className="muted"> · {f.location.relationship}</span>
                    {f.location.is_doubling_for ? (
                      <span className="badge">doubling</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : activePlace ? (
            <>
              <h2>{"name" in activePlace ? activePlace.name : "Place"}</h2>
              <p className="muted">{"scene" in activePlace ? activePlace.scene : null}</p>
              {"slug" in activePlace ? (
                <Link href={`/vista/place/${activePlace.slug}`}>Open place</Link>
              ) : null}
            </>
          ) : (
            <p className="empty-invite">Select a marker to see every film that used this place.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
