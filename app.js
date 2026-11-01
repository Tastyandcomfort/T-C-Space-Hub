/* T&C Space Hub — browser-only public-data dashboard.
   CelesTrak data is cached for 2 hours as requested by its usage guidance.
   NASA DEMO_KEY is used by default; add your own key in CONFIG for higher limits. */
(() => {
  "use strict";
  const CONFIG = {
    NASA_API_KEY: "DEMO_KEY",
    CATALOG_CACHE_MS: 2 * 60 * 60 * 1000,
    REFRESH_MS: 5 * 60 * 1000,
    DONKI_DAYS: 7,
    NEO_DAYS: 7
  };
  const $ = (id) => document.getElementById(id);
  const state = { map:null, tileLayer:null, marker:null, track:null, globe:null, currentSat:null, tle:null, starlink:[], cache:{}, lastUpdated:null, theme:"system", searchTimer:null, searchToken:0 };
  const fmt = (n,d=2) => Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "—";
  const dateISO = (d=new Date()) => d.toISOString().slice(0,10);
  const esc = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const toast = (msg) => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),3000); };
  const setText = (id,txt) => { if($(id)) $(id).textContent=txt; };
  const cachedFetch = async (url, key=url, ttl=60000) => {
    const old=state.cache[key];
    if(old && Date.now()-old.time<ttl) return old.data;
    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error(`Request failed (${r.status})`);
    const data=await r.json();
    state.cache[key]={time:Date.now(),data};
    return data;
  };
  async function getCelestrak(cat) {
    const key=`celestrak-${cat}`, old=state.cache[key];
    if(old && Date.now()-old.time<CONFIG.CATALOG_CACHE_MS) return old.data;
    const url=`https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(cat)}&FORMAT=JSON`;
    const r=await fetch(url);
    if(!r.ok) throw new Error(`CelesTrak returned ${r.status}`);
    const data=await r.json();
    if(!Array.isArray(data)||!data.length) throw new Error("No orbital element returned for this satellite.");
    state.cache[key]={time:Date.now(),data};
    return data[0];
  }
  function parseSatrec(omm) {
    // satellite.js accepts OMM records through json2satrec.
    if(typeof satellite.json2satrec==="function") return satellite.json2satrec(omm);
    throw new Error("The loaded satellite.js build does not support OMM JSON.");
  }
  function propagate(omm) {
    const satrec=parseSatrec(omm), now=new Date();
    const pv=satellite.propagate(satrec,now);
    if(!pv.position || typeof pv.position==="boolean") throw new Error("Could not propagate orbital elements.");
    const gmst=satellite.gstime(now), geo=satellite.eciToGeodetic(pv.position,gmst);
    const lat=satellite.degreesLat(geo.latitude), lon=satellite.degreesLong(geo.longitude);
    const alt=geo.height;
    const vel=pv.velocity ? Math.sqrt(pv.velocity.x**2+pv.velocity.y**2+pv.velocity.z**2) : NaN;
    return {lat,lon,alt,vel, satrec, name:omm.OBJECT_NAME||"Selected satellite"};
  }
  function isDarkTheme() {
    return state.theme === "dark" || (state.theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function applyMapTheme() {
    if(!state.map || !window.L) return;
    // Key-free OpenStreetMap standard tiles: no MapTiler/Mapbox/CARTO API token.
    // Dark appearance is applied with a CSS filter to the same OSM layer.
    const url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    if(state.tileLayer) state.map.removeLayer(state.tileLayer);
    state.tileLayer=L.tileLayer(url,{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',maxZoom:19,subdomains:"abc"}).addTo(state.map);
  }
  function applyTheme(theme, persist=true) {
    state.theme=theme;
    const dark=isDarkTheme();
    document.documentElement.dataset.theme=dark?"dark":"light";
    document.documentElement.dataset.appearance=theme;
    document.documentElement.style.colorScheme=dark?"dark":"light";
    const meta=document.getElementById("theme-color-meta");
    if(meta) meta.setAttribute("content",dark?"#09090b":"#f5f5f7");
    if($("theme-select")) $("theme-select").value=theme;
    if(persist) { try { localStorage.setItem("tc-space-theme",theme); } catch(_) {} }
    applyMapTheme();
    if(state.globe) state.globe.globeImageUrl(dark?"https://unpkg.com/three-globe/example/img/earth-night.jpg":"https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg");
  }
  function initTheme() {
    let saved="system";
    try { saved=localStorage.getItem("tc-space-theme")||"system"; } catch(_) {}
    applyTheme(["system","light","dark"].includes(saved)?saved:"system",false);
    if(window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if(state.theme==="system") applyTheme("system",false);});
    $("theme-select")?.addEventListener("change",e=>applyTheme(e.target.value));
  }
  function initMap() {
    if(!window.L) { $("sat-map").textContent="Map library unavailable. Check your connection."; return; }
    state.map=L.map("sat-map",{worldCopyJump:true}).setView([18,0],2);
    applyMapTheme();
    state.marker=L.circleMarker([0,0],{radius:8,color:"#9ef6d1",weight:2,fillColor:"#42dca8",fillOpacity:.9}).addTo(state.map);
    state.track=L.polyline([],{color:"#5ca8ff",weight:2,dashArray:"5 7",opacity:.8}).addTo(state.map);
  }
  function updateGlobe(lat,lon,name) {
    if(!state.globe) return;
    state.globe.pointsData([{lat,lng:lon,altitude:.012,radius:.42,color:"#ff453a",name}]);
    state.globe.pointOfView({lat,lng:lon,altitude:1.8},1200);
  }
  function initGlobe() {
    const el=$("globe-view");
    if(!el) return;
    const build=()=>{
      if(state.globe || !el.isConnected) return;
      if(typeof window.Globe!=="function") { el.innerHTML='<div class="globe-loading">3D globe library did not load. Check your internet connection and reload.</div>'; return; }
      const w=Math.max(280,el.clientWidth), h=Math.max(270,el.clientHeight);
      try {
        el.innerHTML="";
        state.globe=window.Globe()(el)
          .width(w).height(h)
          .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
          .backgroundColor("rgba(0,0,0,0)")
          .showAtmosphere(true).atmosphereColor("#4a9ce8").atmosphereAltitude(.2)
          .pointsData([]).pointLat("lat").pointLng("lng").pointAltitude("altitude")
          .pointRadius("radius").pointColor("color").pointLabel("name")
          .arcsData([]).arcStartLat("startLat").arcStartLng("startLng").arcEndLat("endLat").arcEndLng("endLng")
          .arcColor(()=>["rgba(66,153,225,.0)","rgba(66,153,225,.9)"]).arcDashLength(.45).arcDashGap(.25).arcDashAnimateTime(2200);
        state.globe.controls().autoRotate=true;
        state.globe.controls().autoRotateSpeed=.28;
        state.globe.pointOfView({lat:18,lng:0,altitude:2.3},0);
        if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(state.globe)state.globe.width(Math.max(280,el.clientWidth)).height(Math.max(270,el.clientHeight));});ro.observe(el);}
      } catch(err) { state.globe=null; el.innerHTML=`<div class="globe-loading">3D Earth could not start: ${esc(err.message)}</div>`; }
    };
    requestAnimationFrame(()=>requestAnimationFrame(build));
  }
  async function selectSatellite(cat) {
    try {
      setText("map-stamp","Fetching current orbital elements…");
      const omm=await getCelestrak(cat), p=propagate(omm);
      state.currentSat={cat,omm,p};
      if(!Array.from($("sat-select").options).some(o=>o.value===String(cat))){const opt=document.createElement("option");opt.value=String(cat);opt.textContent=omm.OBJECT_NAME||`NORAD ${cat}`;$("sat-select").appendChild(opt);}
      $("sat-select").value=String(cat);
      state.marker.setLatLng([p.lat,p.lon]).bindPopup(`<b>${esc(p.name)}</b><br>Lat ${fmt(p.lat,3)}° · Lon ${fmt(p.lon,3)}°<br>Altitude ${fmt(p.alt,1)} km`).openPopup();
      state.map.setView([p.lat,p.lon],3);
      // Draw a simple near-future ground track from 5-minute increments.
      const satrec=p.satrec, points=[];
      for(let i=0;i<=24;i++){
        const d=new Date(Date.now()+i*5*60000), pv=satellite.propagate(satrec,d);
        if(!pv.position||typeof pv.position==="boolean") continue;
        const gmst=satellite.gstime(d), g=satellite.eciToGeodetic(pv.position,gmst);
        points.push([satellite.degreesLat(g.latitude),satellite.degreesLong(g.longitude)]);
      }
      state.track.setLatLngs(points);
      updateGlobe(p.lat,p.lon,p.name);
      const selectedName=omm.OBJECT_NAME||p.name;
      setText("iss-alt",`${fmt(p.alt,1)} km`); setText("iss-velocity",`${fmt(p.vel,3)} km/s`);
      setText("iss-lat",`${fmt(p.lat,3)}°`); setText("hero-iss-alt",`${fmt(p.alt,0)} km`);
      const panel=$("selected-satellite-panel");
      if(panel) panel.innerHTML=`<div class="selected-head"><div><span class="eyebrow">LIVE OBJECT PROFILE</span><h3>${esc(selectedName)}</h3><small>NORAD Catalog ID ${esc(cat)} · Position calculated from latest published orbital elements</small></div><span class="live-tag"><i></i> TRACKING</span></div><div class="selected-data-grid"><div><small>ALTITUDE</small><b>${fmt(p.alt,1)} km</b></div><div><small>VELOCITY</small><b>${fmt(p.vel,3)} km/s</b></div><div><small>LATITUDE</small><b>${fmt(p.lat,4)}°</b></div><div><small>LONGITUDE</small><b>${fmt(p.lon,4)}°</b></div></div><div class="selected-foot">Orbital epoch: ${esc(omm.EPOCH||"Not provided")} · Last calculated: ${new Date().toLocaleTimeString()}</div>`;
      setText("map-stamp",`${selectedName} · calculated ${new Date().toLocaleTimeString()}`);
      setText("orbital-age","Cached ≤ 2h");
    } catch(e) {
      setText("map-stamp",e.message);
      toast(`Satellite data: ${e.message}`);
    }
  }
  async function loadStarlink() {
    const box=$("sat-search-results");
    box.innerHTML='<p class="muted">Loading a small Starlink sample…</p>';
    try {
      const url="https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=JSON";
      const data=await cachedFetch(url,"starlink-sample",CONFIG.CATALOG_CACHE_MS);
      state.starlink=data.slice(0,120);
      setText("hero-object-count",data.length.toLocaleString());
      box.innerHTML=`<p class="muted">Loaded ${data.length.toLocaleString()} Starlink orbital records. Select one below to plot it on the map.</p>`+
        state.starlink.slice(0,30).map(x=>`<div class="result-row"><div><b>${esc(x.OBJECT_NAME||"Starlink")}</b><small>NORAD catalogue ID: ${esc(x.NORAD_CAT_ID)}</small></div><button data-cat="${esc(x.NORAD_CAT_ID)}">Track</button></div>`).join("");
      box.querySelectorAll("button[data-cat]").forEach(b=>b.addEventListener("click",()=>selectSatellite(b.dataset.cat)));
      toast("Starlink sample loaded.");
    } catch(e){box.innerHTML=`<p class="muted">Could not load Starlink data: ${esc(e.message)}</p>`;}
  }
  async function fetchNameMatches(term) {
    const normalized=term.trim();
    const url=`https://celestrak.org/NORAD/elements/gp.php?NAME=${encodeURIComponent(normalized)}&FORMAT=JSON`;
    let data=await cachedFetch(url,`name-suggest-${normalized.toLowerCase()}`,15*60*1000);
    if(!Array.isArray(data)) data=[];
    // The dedicated stations group catches Tiangong even if a NAME query is incomplete.
    if(/tian|station|css|tiangong/i.test(normalized)) {
      try { const stations=await cachedFetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON","celestrak-stations",CONFIG.CATALOG_CACHE_MS);
        data=[...data,...stations.filter(x=>String(x.OBJECT_NAME||"").toLowerCase().includes("tian")||String(x.OBJECT_NAME||"").toLowerCase().includes("css"))];
      } catch(_) {}
    }
    const seen=new Set(); return data.filter(x=>{const id=String(x.NORAD_CAT_ID||"");if(!id||seen.has(id))return false;seen.add(id);return true;}).slice(0,15);
  }
  function showSuggestions(data, message="") {
    const box=$("sat-suggestions"); if(!box)return;
    if(!data.length){box.hidden=true;box.innerHTML="";return;}
    box.hidden=false;
    box.innerHTML=(message?`<div class="suggestion-note">${esc(message)}</div>`:"")+data.map(x=>`<button type="button" class="suggestion-item" role="option" data-cat="${esc(x.NORAD_CAT_ID)}"><span><b>${esc(x.OBJECT_NAME||"Unknown object")}</b><small>NORAD ID ${esc(x.NORAD_CAT_ID)} · ${esc(x.EPOCH||"Orbital data available")}</small></span><span>Track ↗</span></button>`).join("");
    box.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{const name=b.querySelector("b")?.textContent||"";$("sat-search").value=name;box.hidden=true;selectSatellite(b.dataset.cat);}));
  }
  async function suggestSatellites(q) {
    const term=String(q||"").trim(), token=++state.searchToken;
    if(term.length<2){showSuggestions([]);return;}
    showSuggestions([],"Searching public satellite catalogue…");
    try { const data=await fetchNameMatches(term); if(token!==state.searchToken)return; showSuggestions(data,data.length?"Choose a matching satellite":"No matching satellites found. Try another name or NORAD ID."); }
    catch(e){if(token===state.searchToken)showSuggestions([],`Catalogue unavailable: ${e.message}`);}
  }
  async function searchSatellites(q) {
    const term=String(q||"").trim(); if(!term)return;
    const box=$("sat-search-results"); box.innerHTML='<p class="muted">Finding the best catalogue match…</p>';
    try {
      let data=[];
      if(/^\d+$/.test(term)){const item=await getCelestrak(term);data=[item];}
      else data=await fetchNameMatches(term);
      if(!data.length){box.innerHTML='<p class="muted">No matching satellite found. Try a more complete name, for example TIANGONG, NOAA 20, GPS or STARLINK.</p>';return;}
      showSuggestions(data,`${data.length} matching object${data.length===1?"":"s"} — select one to track`);
      box.innerHTML=`<p class="muted">${data.length} matching catalogue record${data.length===1?"":"s"}. Select the exact satellite above to load its current orbital estimate.</p>`;
      if(data.length===1){$("sat-search").value=data[0].OBJECT_NAME||term;showSuggestions([]);selectSatellite(data[0].NORAD_CAT_ID);}
    } catch(e){box.innerHTML=`<p class="muted">Satellite catalogue temporarily unavailable (${esc(e.message)}). Your search is valid; try again shortly.</p>`;}
  }
  async function loadAPOD() {
    try {
      // Current NASA APOD WordPress endpoint; legacy api.nasa.gov APOD is being retired.
      const url=`https://science.nasa.gov/wp-json/wp/v2/apod-basic?date=${dateISO()}`;
      const raw=await cachedFetch(url,"apod-today",6*60*60*1000);
      const item=Array.isArray(raw)?raw[0]:raw;
      if(!item) throw new Error("No APOD item returned.");
      const title=item.title?.rendered||item.title||"Astronomy Picture of the Day";
      const content=item.content?.rendered||item.explanation||item.description||"NASA's daily astronomy feature.";
      const img=item.featured_image||item.image||item.url||item.guid?.rendered;
      setText("apod-title",title.replace(/<[^>]*>/g,""));
      setText("apod-date",item.date||item.date_gmt||dateISO());
      $("apod-explanation").textContent=content.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,1200);
      if(img && typeof img==="string" && /\.(mp4|webm)(\?|$)/i.test(img)) $("apod-media").innerHTML=`<video src="${esc(img)}" controls playsinline></video>`;
      else if(img && typeof img==="string") $("apod-media").innerHTML=`<img src="${esc(img)}" alt="NASA astronomy picture" loading="lazy">`;
      else $("apod-media").innerHTML='<div class="media-placeholder">✧</div>';
      $("apod-link").href="https://science.nasa.gov/solar-system/";
    } catch(e) {
      setText("apod-title","NASA Astronomy Picture of the Day");
      setText("apod-explanation",`The APOD feed could not be loaded right now (${e.message}). Open NASA's official APOD page to view today's feature.`);
      $("apod-media").innerHTML='<div class="media-placeholder">✧</div>';
      $("apod-link").href="https://apod.nasa.gov/apod/astropix.html";
    }
  }
  async function loadDONKI() {
    const start=new Date(Date.now()-CONFIG.DONKI_DAYS*86400000).toISOString().slice(0,10), end=dateISO();
    const key=CONFIG.NASA_API_KEY;
    try {
      const [cmes,storms,flares]=await Promise.all([
        cachedFetch(`https://api.nasa.gov/DONKI/CME?startDate=${start}&endDate=${end}&api_key=${key}`,"donki-cme",20*60*1000),
        cachedFetch(`https://api.nasa.gov/DONKI/GST?startDate=${start}&endDate=${end}&api_key=${key}`,"donki-gst",20*60*1000),
        cachedFetch(`https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${key}`,"donki-flr",20*60*1000)
      ]);
      setText("solar-count",String((Array.isArray(cmes)?cmes.length:0)+(Array.isArray(flares)?flares.length:0)));
      setText("storm-count",String(Array.isArray(storms)?storms.length:0));
      const events=[
        ...(Array.isArray(flares)?flares.map(x=>({type:"SOLAR FLARE",date:x.beginTime,title:`Solar flare · ${x.classType||"Class not listed"}`,desc:x.sourceLocation||"Solar event reported by NASA DONKI."})):[]),
        ...(Array.isArray(cmes)?cmes.map(x=>({type:"CORONAL MASS EJECTION",date:x.startTime,title:"Coronal mass ejection",desc:x.note||x.sourceLocation||"Solar plasma eruption reported by NASA DONKI."})):[]),
        ...(Array.isArray(storms)?storms.map(x=>({type:"GEOMAGNETIC STORM",date:x.startTime,title:"Geomagnetic storm",desc:x.allKpIndex?.[0]?.kpIndex?`Reported Kp index: ${x.allKpIndex[0].kpIndex}`:"Geomagnetic event reported by NASA DONKI."})):[])
      ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
      $("weather-events").innerHTML=events.length?events.map(e=>`<article class="event-card"><small>${esc(e.type)} · ${esc(e.date||"Date unavailable")}</small><b>${esc(e.title)}</b><p>${esc(e.desc)}</p></article>`).join(""):'<p class="muted">No records returned for this date window.</p>';
    } catch(e) {
      setText("solar-count","—");setText("storm-count","—");
      $("weather-events").innerHTML=`<p class="muted">NASA DONKI could not be reached: ${esc(e.message)}. Check the NASA API key or retry later.</p>`;
    }
  }
  async function loadNEO() {
    const start=dateISO(), end=dateISO(new Date(Date.now()+CONFIG.NEO_DAYS*86400000));
    try {
      const data=await cachedFetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${CONFIG.NASA_API_KEY}`,"neo-week",30*60*1000);
      const objects=Object.values(data.near_earth_objects||{}).flat().sort((a,b)=>Number(a.close_approach_data?.[0]?.miss_distance?.kilometers||Infinity)-Number(b.close_approach_data?.[0]?.miss_distance?.kilometers||Infinity)).slice(0,10);
      $("neo-list").innerHTML=objects.length?objects.map(n=>{
        const approach=n.close_approach_data?.[0]||{}, km=Number(approach.miss_distance?.kilometers);
        const date=approach.close_approach_date||"Date unavailable";
        return `<div class="neo-row"><div><b>${esc(n.name)}</b><small>${esc(date)} · Estimated diameter ${fmt(n.estimated_diameter?.meters?.estimated_diameter_min,0)}–${fmt(n.estimated_diameter?.meters?.estimated_diameter_max,0)} m</small></div><div class="neo-distance">${Number.isFinite(km)?(km/1e6).toFixed(2)+"m km":"—"}<small>miss distance</small></div></div>`;
      }).join(""):'<p class="muted">No close-approach records returned.</p>';
    } catch(e){$("neo-list").innerHTML=`<p class="muted">NASA asteroid feed unavailable: ${esc(e.message)}.</p>`;}
  }
  function clock() {
    const now=new Date();
    setText("utc-clock",now.toISOString().slice(11,19)+" UTC");
  }
  function updateTicker() {
    const items=["ISS orbital elements update from CelesTrak","Voyager spacecraft continue their interstellar journeys","NASA DONKI space-weather reports are refreshed periodically","NASA's Near-Earth Object feed tracks upcoming close approaches"];
    setText("ticker",items[new Date().getUTCHours()%items.length]);
  }
  async function refreshAll() {
    clock();updateTicker();
    await Promise.allSettled([selectSatellite($("sat-select").value||"25544"),loadAPOD(),loadDONKI(),loadNEO()]);
    state.lastUpdated=new Date();
    setText("last-updated","UPDATED "+state.lastUpdated.toLocaleTimeString());
  }
  function bind() {
    $("sat-select").addEventListener("change",e=>selectSatellite(e.target.value));
    $("load-starlink").addEventListener("click",loadStarlink);
    $("sat-search-form").addEventListener("submit",e=>{e.preventDefault();const q=$("sat-search").value.trim();if(q)searchSatellites(q);});
    $("sat-search").addEventListener("input",e=>{clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>suggestSatellites(e.target.value),350);});
    $("sat-search").addEventListener("keydown",e=>{if(e.key==="Escape")showSuggestions([]);});
    document.addEventListener("click",e=>{if(!e.target.closest(".search-card"))showSuggestions([]);});
    $("refresh-all").addEventListener("click",()=>{toast("Refreshing available data…");refreshAll();});
    $("refresh-weather").addEventListener("click",()=>{toast("Refreshing space-weather feed…");loadDONKI();});
  }
  function boot() {
    initTheme();initMap();initGlobe();bind();refreshAll();
    setInterval(clock,1000);
    setInterval(()=>selectSatellite($("sat-select").value||"25544"),CONFIG.REFRESH_MS);
    setInterval(()=>{loadDONKI();loadNEO();},30*60*1000);
    setInterval(loadAPOD,6*60*60*1000);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();