import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  muniDisplay,
  STATUS_COLORS,
  STATUS_DRAW_ORDER,
  statusOf,
  titleCase,
} from "../lib/format.js";
import { PFAS_COPY, pfasResultOf } from "../pfasCopy.js";

// Marathon County, roughly. Used before data arrives and as a fallback.
const COUNTY_CENTER = [44.9, -89.77];

const LEGEND = [
  ["closed", "Closed — obligations continue"],
  ["open", "Open case"],
  ["offsite", "Off-site record"],
];

// Selection halo accent for water systems (category fills vary; pending is
// white, so the halo uses the fixed PFAS accent from the design system).
const PFAS_ACCENT = "#6d4e9c";

export default function SiteMap({
  sites,
  selected,
  onSelect,
  pfasSystems,
  showPfas,
  onTogglePfas,
  selectedPfas,
  onSelectPfas,
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const haloRef = useRef(null);
  const pfasMarkersRef = useRef(null);
  const pfasHaloRef = useRef(null);

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
    pfasMarkersRef.current = L.layerGroup().addTo(map);
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

  // Municipal water systems: a separate toggleable overlay, never mixed
  // into the site marker group. Diamonds (divIcons) so the layer reads as
  // different-in-kind from the site circles even without color; they sit
  // in Leaflet's marker pane, above the 300-odd site circles — acceptable
  // for 16 sparse, toggleable markers.
  useEffect(() => {
    const group = pfasMarkersRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showPfas) return;

    const ordered = (pfasSystems ?? [])
      .map((system) => [pfasResultOf(system), system])
      .sort(([a], [b]) => a.rank - b.rank);

    for (const [r, system] of ordered) {
      if (system.lat == null || system.lon == null) continue;
      const marker = L.marker([system.lat, system.lon], {
        icon: L.divIcon({
          className: "pfas-pin",
          html: `<span class="pfas-pin__diamond" style="background:${r.color}"></span>`,
          iconSize: [15, 15],
        }),
        keyboard: false,
      });
      marker.bindTooltip(
        `<span class="site-tip__name">${escapeHtml(titleCase(system.name))}</span>` +
          `<span class="site-tip__sub">${escapeHtml(
            PFAS_COPY.tooltipSub(r.short)
          )}</span>`,
        { className: "site-tip", direction: "top", offset: [0, -8] }
      );
      marker.on("click", () => onSelectPfas(system));
      marker.addTo(group);
    }
  }, [pfasSystems, showPfas, onSelectPfas]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pfasHaloRef.current) {
      pfasHaloRef.current.remove();
      pfasHaloRef.current = null;
    }
    if (!selectedPfas || selectedPfas.lat == null || !showPfas) return;
    pfasHaloRef.current = L.circleMarker([selectedPfas.lat, selectedPfas.lon], {
      radius: 14,
      color: PFAS_ACCENT,
      weight: 3,
      fill: false,
      interactive: false,
    }).addTo(map);
    map.panTo([selectedPfas.lat, selectedPfas.lon]);
  }, [selectedPfas, showPfas]);

  // Legend rows only for categories present in the data, in rank order —
  // the legend grows on its own if a new (vetted) category ever appears.
  const pfasLegend = useMemo(() => {
    const present = new Map();
    for (const system of pfasSystems ?? []) {
      const r = pfasResultOf(system);
      present.set(r.key, r);
    }
    return [...present.values()].sort((a, b) => a.rank - b.rank);
  }, [pfasSystems]);

  return (
    <div className="mapcard">
      <div
        ref={divRef}
        className="mapcard__map"
        role="region"
        aria-label={
          showPfas
            ? PFAS_COPY.mapAriaWithPfas
            : "Map of contamination sites with continuing obligations in Marathon County"
        }
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
        <label className="legend__toggle">
          <input
            type="checkbox"
            checked={showPfas}
            onChange={(e) => onTogglePfas(e.target.checked)}
          />
          {PFAS_COPY.mapToggle}
        </label>
        {showPfas &&
          pfasLegend.map((r) => (
            <span className="legend__item" key={r.key}>
              <span
                className="legend__diamond"
                style={{ background: r.color }}
              />
              {r.short}
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
