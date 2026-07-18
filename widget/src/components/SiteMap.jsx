import { useEffect, useMemo, useRef, useState } from "react";
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

// Marker radii track zoom: compact at county view where 300+ dots crowd
// the Wausau core, larger at street level where readers click individual
// records. Open cases stay a step bigger throughout.
function radiusFor(key, zoom) {
  const grow = zoom >= 12 ? 2 : zoom >= 11 ? 1 : 0;
  return (key === "open" ? 7 : 5.5) + grow;
}

export default function SiteMap({
  sites,
  selected,
  onSelect,
  pfasSystems,
  showPfas,
  onTogglePfas,
  selectedPfas,
  onSelectPfas,
  county,
  countyDisplay,
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const haloRef = useRef(null);
  const pfasMarkersRef = useRef(null);
  const pfasHaloRef = useRef(null);
  const boundaryRef = useRef(null);
  const firstCountyRef = useRef(true);

  useEffect(() => {
    const map = L.map(divRef.current, {
      center: COUNTY_CENTER,
      zoom: 10,
      minZoom: 8,
      // Scroll-zoom stays off until the reader clicks in, so the widget
      // never hijacks the article scroll.
      scrollWheelZoom: false,
      attributionControl: true,
    });
    map.on("focus click", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
    // Base tiles carry no labels; place labels render in their own pane
    // ABOVE the markers, so "Wausau" stays readable over the dot field.
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);
    map.createPane("labels");
    map.getPane("labels").style.zIndex = 650;
    map.getPane("labels").style.pointerEvents = "none";
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, pane: "labels" }
    ).addTo(map);
    // County outline pane sits beneath the marker SVG (overlayPane is
    // z 400), so add-order can't put it on top. The boundary layer itself
    // is swapped by the county effect below.
    map.createPane("boundary");
    map.getPane("boundary").style.zIndex = 350;
    markersRef.current = L.layerGroup().addTo(map);
    pfasMarkersRef.current = L.layerGroup().addTo(map);
    // Rescale radii in place on zoom. Deliberately NOT a React re-render:
    // rebuilding 312 markers during a zoom can interleave with Leaflet's
    // projection updates and strand markers with stale clip bounds.
    map.on("zoomend", () => {
      const zoom = map.getZoom();
      markersRef.current?.eachLayer((m) => {
        if (m.options.statusKey) {
          m.setRadius(radiusFor(m.options.statusKey, zoom));
        }
      });
    });
    mapRef.current = map;
    // Debug handle for automated verification (harness scripts drive
    // zoom/pan through it; synthetic wheel events don't reach Leaflet).
    divRef.current._leafletMap = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap the county outline (emitted per county by build_json.py) and the
  // panning bounds whenever the county changes. On a switch — not the
  // initial load, where the sites effect owns the camera — fly to the new
  // county so the reader lands on it even before its sites arrive.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isSwitch = !firstCountyRef.current;
    firstCountyRef.current = false;
    map.setMaxBounds(null);
    if (boundaryRef.current) {
      boundaryRef.current.remove();
      boundaryRef.current = null;
    }
    const ac = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/${county}/county.geojson`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((geo) => {
        if (!geo || !mapRef.current) return;
        const boundary = L.geoJSON(geo, {
          pane: "boundary",
          interactive: false,
          style: { color: "#66756f", weight: 1.5, dashArray: "5 4", fill: false },
        }).addTo(mapRef.current);
        boundaryRef.current = boundary;
        if (isSwitch) {
          mapRef.current.fitBounds(boundary.getBounds().pad(0.05));
        }
        // Keep panning in the county's neighborhood.
        mapRef.current.setMaxBounds(boundary.getBounds().pad(0.5));
      })
      .catch(() => {}); // the outline is orientation, not data — omit on failure
    return () => ac.abort();
  }, [county]);

  // Map-only visibility per status; the table and filters are unaffected.
  const [shownStatuses, setShownStatuses] = useState({
    open: true,
    closed: true,
    offsite: true,
  });
  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();

    // Rarer layers render last so they sit on top where markers crowd
    // (see STATUS_DRAW_ORDER). Decorate with the status key once per
    // site, then sort by rank.
    const ordered = sites
      .map((site) => [statusOf(site).key, site])
      .sort(([a], [b]) => STATUS_DRAW_ORDER[a] - STATUS_DRAW_ORDER[b]);

    for (const [key, site] of ordered) {
      if (site.lat == null || site.lon == null) continue;
      if (!shownStatuses[key]) continue;
      // White stroke separates overlapping same-color dots far better
      // than a dark one on the light basemap. statusKey is read back by
      // the zoomend handler above to rescale radii in place.
      const marker = L.circleMarker([site.lat, site.lon], {
        radius: radiusFor(key, map.getZoom()),
        color: "#ffffff",
        weight: 1.5,
        fillColor: STATUS_COLORS[key],
        fillOpacity: 0.9,
        statusKey: key,
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

  }, [sites, onSelect, shownStatuses]);

  // Camera follows the filtered site list only — toggling a status layer
  // on the legend must not move the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sites.length) return;
    const bounds = L.latLngBounds(
      sites.filter((site) => site.lat != null).map((site) => [site.lat, site.lon])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 14 });
    }
  }, [sites]);

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
            ? PFAS_COPY.mapAriaWithPfas(countyDisplay)
            : `Map of contamination sites with continuing obligations in ${countyDisplay}`
        }
      />
      <div className="mapcard__legend">
        {LEGEND.map(([key, label]) => (
          <label className="legend__toggle" key={key}>
            <input
              type="checkbox"
              checked={shownStatuses[key]}
              onChange={(e) =>
                setShownStatuses((s) => ({ ...s, [key]: e.target.checked }))
              }
            />
            <span
              className="legend__dot"
              style={{ background: STATUS_COLORS[key] }}
            />
            {label}
          </label>
        ))}
        <label className="legend__toggle legend__toggle--sep">
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
