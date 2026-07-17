import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  muniDisplay,
  STATUS_COLORS,
  STATUS_DRAW_ORDER,
  statusOf,
} from "../lib/format.js";

// Marathon County, roughly. Used before data arrives and as a fallback.
const COUNTY_CENTER = [44.9, -89.77];

const LEGEND = [
  ["closed", "Closed — obligations continue"],
  ["open", "Open case"],
  ["offsite", "Off-site record"],
];

export default function SiteMap({ sites, selected, onSelect }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const haloRef = useRef(null);

  useEffect(() => {
    const map = L.map(divRef.current, {
      center: COUNTY_CENTER,
      zoom: 10,
      // Scroll-zoom stays off until the reader clicks in, so the widget
      // never hijacks the article scroll.
      scrollWheelZoom: false,
      attributionControl: true,
    });
    map.on("focus click", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();

    // Open cases render last so they sit on top where markers crowd.
    // Decorate with the status key once per site, then sort by rank.
    const ordered = sites
      .map((site) => [statusOf(site).key, site])
      .sort(([a], [b]) => STATUS_DRAW_ORDER[a] - STATUS_DRAW_ORDER[b]);

    for (const [key, site] of ordered) {
      if (site.lat == null || site.lon == null) continue;
      const marker = L.circleMarker([site.lat, site.lon], {
        radius: key === "open" ? 8 : 6,
        color: "#20312d",
        weight: 1,
        fillColor: STATUS_COLORS[key],
        fillOpacity: 0.85,
      });
      marker.bindTooltip(
        `<span class="site-tip__name">${escapeHtml(site.name)}</span>` +
          `<span class="site-tip__sub">${escapeHtml(site.brrts)} · ${escapeHtml(
            muniDisplay(site.muni)
          )}</span>`,
        { className: "site-tip", direction: "top", offset: [0, -6] }
      );
      marker.on("click", () => onSelect(site));
      marker.addTo(group);
    }

    if (sites.length) {
      const bounds = L.latLngBounds(
        sites.filter((site) => site.lat != null).map((site) => [site.lat, site.lon])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.12), { maxZoom: 14 });
      }
    }
  }, [sites, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (haloRef.current) {
      haloRef.current.remove();
      haloRef.current = null;
    }
    if (!selected || selected.lat == null) return;
    haloRef.current = L.circleMarker([selected.lat, selected.lon], {
      radius: 13,
      color: STATUS_COLORS[statusOf(selected).key],
      weight: 3,
      fill: false,
      interactive: false,
    }).addTo(map);
    map.panTo([selected.lat, selected.lon]);
  }, [selected]);

  return (
    <div className="mapcard">
      <div
        ref={divRef}
        className="mapcard__map"
        role="region"
        aria-label="Map of contamination sites with continuing obligations in Marathon County"
      />
      <div className="mapcard__legend">
        {LEGEND.map(([key, label]) => (
          <span className="legend__item" key={key}>
            <span
              className="legend__dot"
              style={{ background: STATUS_COLORS[key] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
