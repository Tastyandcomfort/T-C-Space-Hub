/* T&C Space Hub starter — public data endpoints only.
   NASA DEMO_KEY is used by default for DONKI. Replace it with your own free key for regular use. */
const NASA_KEY = "DEMO_KEY";
const REFRESH_MS = 5 * 60 * 1000;
const $ = (id) => document.getElementById(id);
let map, quakeLayer, eventLayer, globe, globePoints = [];
let currentQuakes = [], currentEvents = [];

function utcNow(){ return new Date().toISOString().replace("T"," ").slice(0,19)+" UTC"; }
function localNow(){ return new Date().toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"}); }
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function getJSON(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
function initMap(){
  map=L.map("mapView",{worldCopyJump:true}).setView([18,12],2);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:'© OpenStreetMap © CARTO',maxZoom:18}).addTo(map);
  quakeLayer=L.layerGroup().addTo(map); eventLayer=L.layerGroup().addTo(map);
}
function renderQuakes(data){
  currentQuakes=data.features||[];
  $("quakeCount").textContent=currentQuakes.length.toLocaleString();
  $("quakeStatus").textContent="Past 24 hours · USGS GeoJSON";
  $("quakeList").innerHTML=currentQuakes.slice(0,7).map(f=>{
    const p=f.properties||{}, mag=Number(p.mag||0);
    return `<div class="list-row"><div><strong>${escapeHtml(p.place||"Unknown location")}</strong><small>${new Date(p.time).toLocaleString()}</small></div><span class="list-value">M ${mag.toFixed(1)}</span></div>`;
  }).join("")||'<div class="empty-state">No events returned in this feed.</div>';
  quakeLayer.clearLayers();
  currentQuakes.forEach(f=>{
    const [lon,lat,depth]=f.geometry.coordinates, p=f.properties||{};
    const radius=Math.max(4,Math.min(13,(Number(p.mag)||1)*2));
    L.circleMarker([lat,lon],{radius,color:"#ffb56c",weight:1,fillColor:"#ff9b4a",fillOpacity:.72})
      .bindPopup(`<b>M ${Number(p.mag||0).toFixed(1)}</b><br>${escapeHtml(p.place)}<br>Depth: ${Number(depth).toFixed(1)} km<br><a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">USGS event details</a>`).addTo(quakeLayer);
  });
}
function renderEvents(data){
  currentEvents=data.events||[];
  $("eventCount").textContent=currentEvents.length.toLocaleString();
  $("eventStatus").textContent="Open events · NASA EONET";
  $("eventList").innerHTML=currentEvents.slice(0,7).map(e=>{
    const cat=(e.categories||[]).map(c=>c.title).join(", ")||"Natural event";
    const g=(e.geometry||[]).slice(-1)[0];
    return `<div class="list-row"><div><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(cat)} · ${g?new Date(g.date).toLocaleDateString():"Date unavailable"}</small></div><span class="list-value">EVENT</span></div>`;
  }).join("")||'<div class="empty-state">No open events returned.</div>';
  eventLayer.clearLayers();
  currentEvents.forEach(e=>{
    const g=(e.geometry||[]).slice(-1)[0]; if(!g||!g.coordinates)return;
    let lat,lon;
    if(g.type==="Point"){[lon,lat]=g.coordinates;}
    else if(g.type==="Polygon"){const c=g.coordinates?.[0]?.[0];if(!c)return;[lon,lat]=c;}
    else return;
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    L.circleMarker([lat,lon],{radius:6,color:"#8cbcff",weight:1,fillColor:"#5b9df0",fillOpacity:.8})
      .bindPopup(`<b>${escapeHtml(e.title)}</b><br>${escapeHtml((e.categories||[]).map(c=>c.title).join(", "))}<br><a href="${escapeHtml(e.sources?.[0]?.url||e.link||"https://eonet.gsfc.nasa.gov/")}" target="_blank" rel="noopener">Source details</a>`).addTo(eventLayer);
  });
}
async function loadNOAA(){
  try{
    const data=await getJSON("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json");
    const latest=data[data.length-1]||{};
    const kp=Number(latest.kp_index);
    if(Number.isFinite(kp)){
      $("kpValue").textContent=kp.toFixed(1);$("kpLarge").textContent=kp.toFixed(1);
      $("kpStatus").textContent=kp>=5?"Geomagnetic storm threshold reached":kp>=4?"Unsettled conditions":"Generally quiet conditions";
      $("kpExplanation").textContent=kp>=5?"Kp is at or above 5; this indicates geomagnetic storm conditions.": "Latest one-minute planetary Kp estimate from NOAA SWPC.";
      $("kpBar").style.width=Math.min(100,kp/9*100)+"%";
      $("kpTime").textContent="Source timestamp: "+(latest.time_tag||"not supplied")+" · NOAA SWPC";
    }
  }catch(e){$("kpStatus").textContent="NOAA feed unavailable · "+e.message;$("kpExplanation").textContent="Could not retrieve the latest NOAA Kp data. Try again later.";}
}
async function loadSolar(){
  try{
    const data=await getJSON("https://services.swpc.noaa.gov/json/solar_regions.json");
    $("solarList").innerHTML=(data||[]).slice(0,6).map(x=>{
      const name=x.region||x.region_number||"Solar region";
      const cls=x.mag_class||x.mcintosh||"Classification pending";
      const area=x.area?`Area ${x.area}`:"";
      return `<div class="list-row"><div><strong>Region ${escapeHtml(name)}</strong><small>${escapeHtml(cls)} ${escapeHtml(area)}</small></div><span class="list-value">SUN</span></div>`;
    }).join("")||'<div class="empty-state">No numbered solar regions in latest report.</div>';
  }catch(e){$("solarList").innerHTML='<div class="empty-state">NOAA solar-region feed unavailable.</div>';}
}
async function loadAll(){
  $("lastRefresh").textContent="Updating…";
  const tasks=await Promise.allSettled([
    getJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"),
    getJSON("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100"),
    loadNOAA(),loadSolar()
  ]);
  if(tasks[0].status==="fulfilled")renderQuakes(tasks[0].value);
  else {$("quakeCount").textContent="—";$("quakeStatus").textContent="USGS unavailable";$("quakeList").innerHTML='<div class="empty-state">Could not load USGS feed.</div>';}
  if(tasks[1].status==="fulfilled")renderEvents(tasks[1].value);
  else {$("eventCount").textContent="—";$("eventStatus").textContent="NASA EONET unavailable";$("eventList").innerHTML='<div class="empty-state">Could not load NASA EONET feed.</div>';}
  $("lastRefresh").textContent=new Date().toLocaleTimeString();
  $("mapUpdated").textContent="Updated "+new Date().toLocaleTimeString();
  updateGlobe();
}
function updateGlobe(){
  const points=[];
  currentQuakes.forEach(f=>{const [lon,lat]=f.geometry.coordinates;points.push({lat,lng:lon,size:.25,color:"#ffad65",label:`Earthquake · M ${f.properties.mag} · ${f.properties.place}`});});
  currentEvents.forEach(e=>{const g=(e.geometry||[]).slice(-1)[0];if(!g||!g.coordinates)return;let lat,lon;if(g.type==="Point")[lon,lat]=g.coordinates;else if(g.type==="Polygon"){const c=g.coordinates?.[0]?.[0];if(!c)return;[lon,lat]=c;}else return;if(Number.isFinite(lat)&&Number.isFinite(lon))points.push({lat,lng:lon,size:.3,color:"#8cbcff",label:`NASA event · ${e.title}`});});
  globePoints=points;
  if(globe){globe.pointsData(points).pointLat("lat").pointLng("lng").pointAltitude("size").pointColor("color").pointRadius(.24).pointLabel("label");}
}
function initGlobe(){
  if(globe)return;
  const el=document.getElementById("globeViz");
  globe=Globe()(el).backgroundColor("#07101d").globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg").bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png").showAtmosphere(true).atmosphereColor("#6ca9ff").atmosphereAltitude(.18).pointOfView({lat:18,lng:20,altitude:2.1});
  updateGlobe();
}
function setView(view){
  document.querySelectorAll(".switch-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("mapView").classList.toggle("hidden",view!=="map");$("globeView").classList.toggle("hidden",view!=="globe");
  $("mapTitle").textContent=view==="map"?"Global events map":"Interactive 3D Earth";
  if(view==="globe"){initGlobe();setTimeout(()=>globe.width(document.getElementById("globeViz").clientWidth).height(document.getElementById("globeViz").clientHeight),100);}
  else setTimeout(()=>map.invalidateSize(),100);
}
function tick(){const d=new Date();$("utcClock").textContent=d.toISOString().slice(11,19)+" UTC";$("localClock").textContent=d.toLocaleString();}
function initTheme(){
  const saved=localStorage.getItem("tc-space-theme");if(saved==="light")document.documentElement.classList.add("light");
  $("themeBtn").addEventListener("click",()=>{document.documentElement.classList.toggle("light");localStorage.setItem("tc-space-theme",document.documentElement.classList.contains("light")?"light":"dark");});
}
document.querySelectorAll(".switch-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
initTheme();initMap();tick();setInterval(tick,1000);loadAll();setInterval(loadAll,REFRESH_MS);
