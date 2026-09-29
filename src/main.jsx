import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';
import { askQwen } from './qwenClient';
import { getVisualEvidence, getVisualEvidenceTarget, needsVisualEvidence } from './evidenceClient';

const SESSION_KEY = 'satquery_session';
const NS = 'satquery_v25_';
const ANALYZE_KEY = NS + 'analyze_live_v31';
const MINIMUM_VISIBLE_ANALYZE_TIME = 4300;
const KEYS = {
  workspaces: NS + 'workspaces',
  analyses: NS + 'analyses',
  chats: NS + 'chats',
  reports: NS + 'reports',
  history: NS + 'history',
};
const A = '/assets/';

const ANALYZE_EXAMPLE_HINTS = {
  change: 'bi-temporal optical',
  water: 'optical water-body interpretation',
  built: 'optical built-up-area interpretation',
  sar: 'optical + SAR cross-modal comparison'
};

const examples = [
  { id:'change', title:'What changed between these images?', meta:'Bi-temporal · Optical', images:[A+'story_before_after_up.jpg', A+'flood-card_up_clean.jpg'], labels:['Earlier','Later'], answer:'The repeat observations show a visible shift in surface cover around the river-connected areas. A production change detector would align the scenes, suppress registration noise, and return a measured change mask with the affected region.' },
  { id:'water', title:'Identify water bodies in this image.', meta:'Optical · Water', images:[A+'water-card_up_clean.jpg'], labels:['Observation'], answer:'The darker, connected features are consistent with water bodies, especially through the central and lower channels. A specialist segmentation model would refine these candidates into pixel-level boundaries and provide their area.' },
  { id:'built', title:'Detect built-up areas in this image.', meta:'Optical · Urban', images:[A+'urban-card_up_clean.jpg'], labels:['Observation'], answer:'Built-up areas are concentrated in regular, high-texture clusters connected by roads. The surrounding larger, more uniform parcels are more consistent with agricultural or open land.' },
  { id:'sar', title:'Compare optical and SAR observations.', meta:'Cross-modal · Optical + SAR', images:[A+'agriculture-card_up_clean.jpg', A+'sar-reference_up_clean.jpg'], labels:['Optical','SAR'], answer:'The optical scene provides intuitive colour and land-cover context, while SAR emphasizes structure and moisture-sensitive variation. Together they provide complementary evidence where one modality alone is ambiguous.' },
];


const reportTemplates = {
  assam: {
    sourceName:'NASA Earth Observatory — Heavy Rain in Assam, India',
    sourceUrl:'https://science.nasa.gov/earth/earth-observatory/heavy-rain-in-assam-india-43843/',
    title:'Assam Flood Impact Analysis',
    description:'Satellite-based review of flood-related surface-water change around the Brahmaputra near Guwahati using a documented NASA Earth Observatory case.',
    workspaceId:'assam-flood-analysis',
    generatedAt:'27 Sep 2026',
    hero:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/43000/43843/assam_tmo_2010118_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=3000&w=4000',fallback:A+'flood-card_up_clean.jpg'},
    inputs:[
      {src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/43000/43843/assam_tmo_2010118_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=3000&w=4000',fallback:A+'flood-card_up_clean.jpg',label:'Later observation',meta:'Terra MODIS · 28 Apr 2010'},
      {src:A+'water-card_up_clean.jpg',fallback:A+'water-card_up_clean.jpg',label:'Workspace reference',meta:'Optical context'},
      {src:A+'sar-reference_up_clean.jpg',fallback:A+'sar-reference_up_clean.jpg',label:'Workspace reference',meta:'SAR context'}
    ],
    metrics:[['2','documented observations','16 Apr → 28 Apr 2010'],['250 m','MODIS spatial detail','source resolution'],['Expanded','standing water','NASA observation'],['~150k','people displaced','contemporary reports cited by NASA']],
    summary:'NASA Earth Observatory documents Terra MODIS observations from April 16 and April 28, 2010 around Guwahati. The later false-colour image shows expanded standing water around the Brahmaputra and swollen tributaries, while the imagery uses infrared and visible bands to increase water–land contrast.',
    method:[['Source imagery','NASA Terra MODIS scenes from the documented Assam event.'],['Visual interpretation','Compare water extent, river-connected features and surrounding land between the two acquisition dates.'],['Cross-check','Use optical/SAR workspace context to distinguish water-like structure from ambiguous land cover.'],['Production step','A deployed model would register imagery and calculate a measured inundation mask before operational use.']],
    resultTitle:'Documented flood signals',
    resultText:'The later observation contains visibly more standing water around the river and swollen tributaries. This is source-supported qualitative evidence; the area figures shown in this prototype are not presented as measured outputs.',
    bars:[['Standing-water context','Expanded'],['Tributary extent','Expanded'],['River channel','Changed appearance'],['Built-up areas','Not measured']],
    table:[['Observation','16 Apr 2010','28 Apr 2010','Interpretation'],['Brahmaputra','Reference scene','Lighter / broader appearance','Possible sediment + flood change'],['Standing water','More limited','Expanded around river','Flood-related surface-water signal'],['Tributaries','Reference','Swollen','Higher water extent']],
    impact:[['Water','Standing water expanded around the river corridor.'],['Agriculture','Floodwater encroachment can affect low-lying cultivated land; exact area requires model measurement.'],['Settlements','Contemporary reports cited by NASA described major displacement during the event.']],
    conclusion:'The two-date satellite evidence supports a clear qualitative change in surface-water conditions around Guwahati during the documented April 2010 flood event.',
    recommendations:['Use co-registered multi-temporal imagery for measured flood masks.','Combine optical and SAR observations where cloud or visual ambiguity limits optical interpretation.','Keep source acquisition dates and sensor metadata attached to every model result.']
  },
  coastal: {
    sourceName:'NASA Earth Observatory — NASA Returns to the Beach: Wide Wildwood Beaches',
    sourceUrl:'https://science.nasa.gov/earth/earth-observatory/nasa-returns-to-the-beach-wide-wildwood-beaches-152998/',
    title:'Coastal Zone Change Report',
    description:'Multi-temporal shoreline review based on two Landsat observations of Wildwood, New Jersey.',
    workspaceId:'coastal-region-study',generatedAt:'26 Sep 2026',
    hero:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152998/wildwood_oli_2019201_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=949&w=1883',fallback:A+'water-card_up_clean.jpg'},
    inputs:[
      {src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152998/wildwood_tm5_1986207_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=949&w=1883',fallback:A+'water-card_up_clean.jpg',label:'Landsat 5',meta:'26 Jul 1986'},
      {src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152998/wildwood_oli_2019201_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=949&w=1883',fallback:A+'water-card_up_clean.jpg',label:'Landsat 8 OLI',meta:'20 Jul 2019'},
      {src:A+'water-card_up_clean.jpg',fallback:A+'water-card_up_clean.jpg',label:'Workspace context',meta:'Coastal scene'}
    ],
    metrics:[['33 years','time span','1986 → 2019'],['210 km','New Jersey shoreline','NASA context'],['>12M yd³','sand moved','since the 1990s'],['Landsat 5/8','sensors','USGS Landsat data']],
    summary:'NASA describes 33 years of shoreline change at the southern tip of New Jersey. The 1986 and 2019 Landsat images show changes in shoreline configuration and vegetation, while the surrounding coast is influenced by natural sediment transport and beach-management activity.',
    method:[['Temporal pair','Compare the Landsat 5 and Landsat 8 observations at the same coastal location.'],['Visual shoreline review','Inspect the position and width of beach and near-shore landforms.'],['Context','Interpret changes alongside documented longshore drift and human beach nourishment.'],['Production step','A production workflow would extract a shoreline line and quantify change by date.']],
    resultTitle:'Shoreline evidence',resultText:'The paired scenes support a long-term shoreline-change interpretation, but this prototype does not claim a new measured erosion/accretion rate.',
    bars:[['Beach width','Changed'],['Shoreline position','Changed'],['Vegetation cover','Changed'],['Cause','Mixed natural + managed']],
    table:[['Indicator','1986','2019','Interpretation'],['Shoreline','Baseline','Different position/configuration','Long-term change'],['Beach','Baseline width','Wider in documented Wildwood area','Accretion in target area'],['Vegetation','Earlier pattern','Different distribution','Land-cover change']],
    impact:[['Coastal form','The source documents long-term change in beach and shoreline configuration.'],['Sediment','Longshore drift moves sand south-southwest along the coast.'],['Management','NASA notes more than 12 million cubic yards of sand have been pumped back onto Cape beaches since the 1990s.']],
    conclusion:'The satellite pair demonstrates why multi-temporal coastal imagery is valuable for separating shoreline movement from short-term visual variation.',recommendations:['Keep acquisition date and sensor metadata with shoreline measurements.','Use consistent coastline extraction rules across dates.','Pair satellite-derived change with coastal process and management context.']
  },
  crops: {
    sourceName:'NASA Earth Observatory — Record Crops in India',
    sourceUrl:'https://science.nasa.gov/earth/earth-observatory/record-crops-in-india-19848/',
    title:'Land Cover Classification Report',
    description:'Agricultural condition review using NASA Terra MODIS observations over India in early April 2008.',
    workspaceId:'crop-monitoring',generatedAt:'24 Sep 2026',
    hero:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/19000/19848/wbengalndvia_tmo_2008081_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=4000&w=4000',fallback:A+'agriculture-card_up_clean.jpg'},
    inputs:[
      {src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/19000/19848/wbengalndvia_tmo_2008081_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=4000&w=4000',fallback:A+'agriculture-card_up_clean.jpg',label:'Vegetation condition map',meta:'Terra MODIS · 21 Mar–5 Apr 2008'},
      {src:A+'agriculture-card_up_clean.jpg',fallback:A+'agriculture-card_up_clean.jpg',label:'Workspace agricultural scene',meta:'Optical context'},
      {src:A+'modalities_up.jpg',fallback:A+'modalities_up.jpg',label:'Modality context',meta:'Multispectral workflow'}
    ],
    metrics:[['21 Mar–5 Apr','observation window','MODIS'],['2000–2007','comparison baseline','same period'],['81.5M t','rice produced','end of winter harvest'],['16.8M t','corn forecast','USDA estimate cited by NASA']],
    summary:'NASA reports that the MODIS vegetation-condition image compared March 21–April 5, 2008 observations with average conditions for the same period from 2000–2007. Green areas in West Bengal and Bihar indicated vegetation lusher than average, and NASA cites USDA production estimates in the story context.',
    method:[['Vegetation condition','Interpret the MODIS anomaly-style map against the 2000–2007 baseline.'],['Regional review','Inspect West Bengal and Bihar where stronger-than-average vegetation was highlighted.'],['Crop context','Relate mapped vegetation condition to the documented rice and corn production context.'],['Production step','A production classifier would use multispectral bands and field labels to classify crop type.']],
    resultTitle:'Agricultural evidence',resultText:'The source image shows stronger vegetation conditions across parts of West Bengal and Bihar. The production figures are source context, not model-estimated outputs of this prototype.',
    bars:[['West Bengal vegetation','Above average in highlighted areas'],['Bihar vegetation','Strong / healthy crop signal'],['Rice production','81.5M tons at winter-harvest end'],['Corn forecast','16.8M tons']],
    table:[['Measure','Value','Source context','Use in report'],['Rice production','81.5M tons','NASA citing USDA FAS','Documented context'],['Expected April rice','94M tons','NASA citing USDA FAS','Forecast context'],['Corn forecast','16.8M tons','NASA citing USDA FAS','Forecast context']],
    impact:[['Crops','Vegetation conditions were above the same-period 2000–2007 baseline in highlighted areas.'],['Water supply','NASA links strong crop conditions to favorable monsoon-related water availability.'],['Monitoring','Multispectral time series can provide repeatable crop-condition indicators.']],
    conclusion:'The report demonstrates a defensible pattern: imagery is interpreted together with acquisition dates, comparison baselines and documented agronomic context rather than with unsupported area estimates.',recommendations:['Store baseline period alongside every vegetation-condition result.','Use crop-specific labels for classification training and validation.','Separate image-derived measurements from external production statistics.']
  },
  urban: {
    sourceName:'NASA Earth Observatory — Urban Growth of New Delhi',sourceUrl:'https://science.nasa.gov/earth/earth-observatory/urban-growth-of-new-delhi-92813/',
    title:'Urban Expansion Analysis',description:'Long-term urban-growth comparison using Landsat 5 and Landsat 8 observations of Delhi.',workspaceId:'hyderabad-urban-study',generatedAt:'20 Sep 2026',
    hero:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/92000/92813/dehliurban_oli_2018156_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=3010&w=4374',fallback:A+'urban-card_up_clean.jpg'},
    inputs:[{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/92000/92813/dehliurban_tm5_1989339_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=3010&w=4374',fallback:A+'urban-card_up_clean.jpg',label:'Landsat 5',meta:'5 Dec 1989'}, {src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/92000/92813/dehliurban_oli_2018156_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=3010&w=4374',fallback:A+'urban-card_up_clean.jpg',label:'Landsat 8 OLI',meta:'5 Jun 2018'}, {src:A+'urban-card_up_clean.jpg',fallback:A+'urban-card_up_clean.jpg',label:'Workspace urban scene',meta:'Optical context'}],
    metrics:[['29 years','time span','1989 → 2018'],['Landsat 5','earlier sensor','TM'],['Landsat 8','later sensor','OLI'],['Almost doubled','Delhi geographic size','1991–2011 source context']],
    summary:'NASA describes croplands and grasslands around New Delhi being converted into streets, buildings and parking lots. The two Landsat scenes provide a long-term visual record of urban expansion in the Delhi region.',
    method:[['Temporal pair','Use the Landsat 5 and Landsat 8 scenes as the before/after reference.'],['Built-up interpretation','Compare regular high-texture urban areas with surrounding croplands and grasslands.'],['Context','Keep the distinction between geographic growth and population projections.'],['Production step','An urban change model would segment built-up surfaces and quantify expansion.']],
    resultTitle:'Built-up growth evidence',resultText:'The pair clearly illustrates long-term urban expansion around Delhi. The report treats the source narrative as evidence and avoids inventing a measured built-up area.',
    bars:[['Built-up footprint','Expanded'],['Croplands/grasslands','Converted in parts of the region'],['Urban edge','Moved outward'],['Quantified change','Model measurement required']],
    table:[['Year','Sensor','Observation','Interpretation'],['1989','Landsat 5 TM','Earlier land-cover pattern','Reference'],['2018','Landsat 8 OLI','Expanded urban structure','Change visible'],['2018 context','NASA / UN sources','Urbanisation discussion','External context']],
    impact:[['Land use','Croplands and grasslands have been converted into urban surfaces in expanding areas.'],['Infrastructure','More roads, structures and paved surfaces alter the land-cover pattern.'],['Heat context','NASA cites research on urban heat-island differences in dense built-up areas.']],
    conclusion:'Multi-date Landsat imagery provides a clear evidence base for urban-change analysis when combined with consistent classification rules and metadata.',recommendations:['Use the same built-up definition across all dates.','Add a change mask and confidence layer before reporting areas.','Keep external population or heat-island statistics separate from image-derived measurements.']
  },
  forest: {
    sourceName:'NASA Earth Observatory — Mapping Forest Loss with Landsat',sourceUrl:'https://science.nasa.gov/earth/earth-observatory/mapping-forest-loss-with-landsat-85824/',
    title:'Deforestation Monitoring Report',description:'Forest-change report based on the Landsat global forest-change mapping workflow documented by NASA Earth Observatory.',workspaceId:'forest-change-monitoring',generatedAt:'18 Sep 2026',
    hero:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/85000/85824/forestloss_gis_2013_wide_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1294&w=2000',fallback:A+'forest-card_up_clean.jpg'},
    inputs:[{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/85000/85824/forestloss_gis_2013_wide_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1294&w=2000',fallback:A+'forest-card_up_clean.jpg',label:'Forest change map',meta:'Landsat · 2000–2013'}, {src:A+'forest-card_up_clean.jpg',fallback:A+'forest-card_up_clean.jpg',label:'Workspace forest scene',meta:'Optical context'}, {src:A+'sar-reference_up_clean.jpg',fallback:A+'sar-reference_up_clean.jpg',label:'Workspace SAR context',meta:'Structural evidence'}],
    metrics:[['2000–2013','mapping window','Landsat archive'],['700k','Landsat scenes processed','cloud-filtered'],['1M CPU hours','processing effort','10,000 CPUs'],['30 m','Landsat pixel scale','source product context']],
    summary:'NASA describes a large-scale Landsat forest-change workflow that processed about 700,000 scenes, discarded cloudy pixels and tracked forest loss and regrowth signals from 2000–2013. The report focuses on the documented methodology rather than inventing a local deforestation area.',
    method:[['Archive scale','Use repeated Landsat observations to construct a sequence of clear pixels.'],['Change flagging','Identify whether each pixel is forested and when it changes state.'],['Cloud screening','Discard cloudy pixels before temporal comparison.'],['Production step','Use a localised change detector for a workspace-specific monitoring task.']],
    resultTitle:'Forest-change evidence',resultText:'The source methodology demonstrates a repeatable way to detect and date forest-cover change from a long Landsat archive.',
    bars:[['Cloud-screened archive','Applied'],['Forest state','Tracked'],['Change date','Tracked'],['Local area statistic','Requires project mask']],
    table:[['Processing stage','Documented detail','Why it matters'],['Image archive','More than 50 trillion pixels in the broader archive','Large temporal coverage'],['Scenes analysed','~700,000 Landsat scenes','Global scale'],['Compute','1 million CPU hours on 10,000 CPUs','Demonstrates processing burden'],['Output','Forest / non-forest and change timing','Supports monitoring']],
    impact:[['Forest management','Repeat imagery provides an auditable history of disturbance.'],['Biodiversity','Forest-change maps can support protected-area and habitat analysis.'],['Carbon studies','NASA notes applications including estimating emissions from deforestation.']],
    conclusion:'The report shows how an evidence-based remote-sensing pipeline can move from raw imagery to consistent change signals without relying on a single scene.',recommendations:['Retain cloud screening and acquisition metadata in the pipeline.','Use local validation points before operational alerts.','Separate global methodological context from workspace-specific measured areas.']
  }
};

function enrichReport(r){
  const key=r?.templateKey||({
    'report-assam-flood-analysis':'assam',
    'report-coastal-region-study':'coastal',
    'report-crop-monitoring':'crops',
    'report-hyderabad-urban-study':'urban',
    'report-forest-change-monitoring':'forest'
  }[r?.id]||'assam');
  const t=reportTemplates[key]||reportTemplates.assam;
  return {...t,...r,templateKey:key,images:t.inputs,hero:t.hero};
}
function buildSeedReports(){
  return ['assam','coastal','crops','urban','forest'].map((key,i)=>{
    const t=reportTemplates[key];
    return enrichReport({id:['report-assam-flood-analysis','report-coastal-region-study','report-crop-monitoring','report-hyderabad-urban-study','report-forest-change-monitoring'][i],workspaceId:t.workspaceId,templateKey:key});
  });
}
function buildSeedHistory(){
  return [
    {id:'hist-assam-flood',group:'Today',question:'What areas are likely flooded?',sub:'Flood detection using optical and SAR images',workspaceId:'assam-flood-analysis',analysisId:'seed-assam-flood-analysis-0',image:A+'flood-card_up_clean.jpg',createdAt:'27 Sep 2026, 11:24 AM'},
    {id:'hist-assam-change',group:'Today',question:'Compare pre and post flood images',sub:'Bi-temporal change analysis',workspaceId:'assam-flood-analysis',analysisId:'seed-assam-flood-analysis-1',image:A+'water-card_up_clean.jpg',createdAt:'27 Sep 2026, 10:18 AM'},
    {id:'hist-urban',group:'Today',question:'Highlight built-up areas',sub:'Object detection and segmentation',workspaceId:'hyderabad-urban-study',analysisId:'seed-hyderabad-urban-study-0',image:A+'urban-card_up_clean.jpg',createdAt:'27 Sep 2026, 09:02 AM'},
    {id:'hist-crops',group:'Yesterday',question:'Identify crop type in this region',sub:'Land cover classification',workspaceId:'crop-monitoring',analysisId:'seed-crop-monitoring-0',image:A+'agriculture-card_up_clean.jpg',createdAt:'26 Sep 2026, 05:41 PM'},
    {id:'hist-coastal',group:'Yesterday',question:'What has changed between these two dates?',sub:'Change detection',workspaceId:'coastal-region-study',analysisId:'seed-coastal-region-study-0',image:A+'water-card_up_clean.jpg',createdAt:'26 Sep 2026, 03:12 PM'},
    {id:'hist-forest',group:'Earlier this week',question:'Detect deforestation areas',sub:'Forest monitoring and change analysis',workspaceId:'forest-change-monitoring',analysisId:'seed-forest-change-monitoring-0',image:A+'forest-card_up_clean.jpg',createdAt:'24 Sep 2026, 11:06 AM'}
  ];
}

const seedWorkspaceRows = [
  ['assam-flood-analysis','Assam Flood Analysis','Assam, India','Pre- and post-flood satellite imagery using optical and SAR data.',['Flood','Assam','SAR'],'flood-card_up_clean.jpg',5,[A+'flood-card_up_clean.jpg',A+'water-card_up_clean.jpg',A+'sar-reference_up_clean.jpg']],
  ['hyderabad-urban-study','Hyderabad Urban Study','Hyderabad, India','Built-up growth and land-use patterns around the city edge.',['Urban','Hyderabad','Built-up'],'urban-card_up_clean.jpg',3,[A+'urban-card_up_clean.jpg',A+'story_before_after_up.jpg',A+'sar-reference_up_clean.jpg']],
  ['nepal-earthquake','Nepal Earthquake Assessment','Nepal','Terrain, infrastructure and change observations after a seismic event.',['Earthquake','Nepal','Change'],'story_before_after_up.jpg',4,[A+'story_before_after_up.jpg',A+'impact-mountains.png',A+'sar-reference_up_clean.jpg']],
  ['crop-monitoring','Crop Monitoring','Punjab, India','Agricultural parcel monitoring using optical and multispectral context.',['Agriculture','Crops','MSI'],'agriculture-card_up_clean.jpg',2,[A+'agriculture-card_up_clean.jpg',A+'modalities_up.jpg',A+'agriculture-card_up.jpg']],
  ['coastal-region-study','Coastal Region Study','Andaman & Nicobar, India','Coastal land cover, shoreline and water extent observations.',['Coastal','Water','Optical'],'water-card_up_clean.jpg',3,[A+'water-card_up_clean.jpg',A+'flood-card_up_clean.jpg',A+'sar-reference_up_clean.jpg']],
  ['glacier-monitoring','Glacier Monitoring','Himalaya','Glacier, snow and lake observations from repeated satellite scenes.',['Glacier','Himalaya','Change'],'forest-card_up_clean.jpg',2,[A+'forest-card_up_clean.jpg',A+'impact-mountains.png',A+'sar-reference_up_clean.jpg']],
  ['forest-change-monitoring','Forest Change Monitoring','Western Ghats, India','Forest cover, disturbance and vegetation change across repeat observations.',['Forest','Change','Vegetation'],'forest-card_up_clean.jpg',3,[A+'forest-card_up_clean.jpg',A+'story_before_after_up.jpg']],
  ['river-basin-study','River Basin Study','Brahmaputra Basin','River extent, surrounding land cover and seasonal water observations.',['Water','River','Seasonal'],'cta-river.png',2,[A+'cta-river.png',A+'water-card_up_clean.jpg']],
].map(([id,title,region,subtitle,tags,cover,count,images])=>({
  id,title,region,subtitle,tags,cover:A+cover,analysisCount:count,imageCount:images.length,
  created:'21 Sep 2026',updated:'22 Sep 2026',updatedLabel:'2 days ago',
  images:images.map((src,i)=>({id:id+'-img-'+i,title:i===2?'SAR observation':i===1?'Secondary observation':'Primary observation',src,date:i===0?'12 Sep 2026':'20 Sep 2026',modality:i===2?'SAR':'Optical'}))
}));

function answerFor(q='') {
  const x=String(q).toLowerCase();
  if(x.includes('water')||x.includes('flood')) return 'The strongest water-like pattern appears in the broad low-lying and river-connected portions of the scene. Optical context suggests expanded surface water, while SAR can help confirm inundation where colour contrast is ambiguous. A specialist segmentation or flood-detection model would refine the boundary before operational use.';
  if(x.includes('built')||x.includes('urban')) return 'Built-up areas are concentrated in regular, high-texture clusters connected by roads. The surrounding larger, more uniform parcels are more consistent with agricultural or open land. Object detection and segmentation would be used to turn this visual interpretation into a measurable mask.';
  if(x.includes('crop')||x.includes('agric')) return 'Several parcels show distinct tone and texture, suggesting differences in crop stage or vegetation condition. Multispectral observations would strengthen the interpretation by comparing spectral response across the agricultural parcels.';
  if(x.includes('sar')||x.includes('optical')) return 'Optical imagery provides land-cover and colour context, while SAR contributes structural and moisture-sensitive evidence. Comparing both gives complementary evidence, especially where cloud cover or ambiguous visual texture limits one modality.';
  if(x.includes('change')) return 'The repeat observations show visible changes in surface cover around the connected landscape features. A production change detector would align the scenes, reduce registration noise and quantify the affected area.';
  return 'The scene would be routed to the specialist evidence pipeline most appropriate for the question. This prototype response uses the visible scene context and the available imagery as the basis for the explanation.';
}

function nowLabel(){return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())}
function makeId(prefix='id'){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function safeRead(key,fallback){try{const v=localStorage.getItem(key);if(!v)return fallback;const parsed=JSON.parse(v);return parsed??fallback}catch{return fallback}}
function safeWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function fileToDataUrl(file,max=1200){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const src=String(reader.result||'');if(!src.startsWith('data:image/')) return resolve(src);const img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82))};img.onerror=()=>resolve(src);img.src=src};reader.readAsDataURL(file)})}


function analyzeSleep(ms){return new Promise(resolve=>window.setTimeout(resolve,ms))}
function analyzeFormatBytes(bytes){const n=Number(bytes)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;if(n<1024*1024*1024)return `${(n/1024/1024).toFixed(1)} MB`;return `${(n/1024/1024/1024).toFixed(2)} GB`}
function analyzeIsTiff(file){return /\.tiff?$/i.test(String(file?.name||'')) || String(file?.type||'').toLowerCase()==='image/tiff'}
function analyzeFormatName(file){
  const type=String(file?.type||'').toLowerCase();
  if(analyzeIsTiff(file)) return 'TIFF / GeoTIFF';
  if(type.includes('png')) return 'PNG';
  if(type.includes('webp')) return 'WEBP';
  if(type.includes('jpeg')||type.includes('jpg')) return 'JPEG';
  return type ? type.replace('image/','').toUpperCase() : 'Image file';
}
function analyzeHash(text){let h=2166136261;for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function analyzeIsImagePreview(src){return /^data:image\//i.test(String(src||'')) || /\.(jpe?g|png|webp)(\?|$)/i.test(String(src||''))}
function analyzeTarget(question,count,hint=''){
  const x=String(question||'').toLowerCase();
  const h=String(hint||'').toLowerCase();
  const joined=`${x} ${h}`;
  const visualEvidence=needsVisualEvidence(question);

  if((joined.includes('sar')&&joined.includes('optical')) || h.includes('cross-modal')) {
    return {
      type:'Optical–SAR Cross-Modal Analysis',
      context:'Optical + SAR · Cross-modal',
      why:'The request explicitly refers to optical and SAR observations.',
      needsEvidence:visualEvidence,
      specialist:{label:'Optical–SAR Cross-Modal Analysis Specialist',status:'not-connected',detail:'Dedicated optical–SAR specialist is not connected in the current Phase-1 frontend.'}
    };
  }
  if(joined.includes('multispectral')||joined.includes('spectral bands')||joined.includes('nir')||joined.includes('red-edge')||joined.includes('ndvi')) {
    return {
      type:'Multispectral Analysis',
      context:'Multispectral · Spectral analysis',
      why:'The question asks for spectral or multispectral interpretation.',
      needsEvidence:false,
      specialist:{label:'Multispectral Analysis Specialist',status:'not-connected',detail:'Dedicated multispectral specialist is not connected in the current Phase-1 frontend.'}
    };
  }
  if(count>1 && (joined.includes('change')||joined.includes('changed')||joined.includes('before')||joined.includes('after')||joined.includes('compare')||joined.includes('difference')||joined.includes('time period')||joined.includes('temporal')||h.includes('bi-temporal'))) {
    return {
      type:'Bi-Temporal Change Analysis',
      context:'Bi-temporal · Multi-date observations',
      why:'Multiple observations were supplied and the request asks about change or comparison across observations.',
      needsEvidence:visualEvidence,
      specialist:{label:'Bi-Temporal Change Analysis Specialist',status:'not-connected',detail:'Dedicated bi-temporal change specialist is not connected in the current Phase-1 frontend.'}
    };
  }
  if(count===1 && visualEvidence) {
    const target=getVisualEvidenceTarget(question);
    return {
      type:'Single-Image Visual Grounding',
      context:`Single observation · ${target||'Visual grounding'}`,
      why:`A single observation was supplied and the question requests a spatial target${target?` (${target})`:''}.`,
      needsEvidence:true,
      evidenceTarget:target,
      specialist:{label:'Specialist Analysis',status:'not-selected',detail:'No additional specialist selected; visual grounding is handled by the dedicated evidence branch.'}
    };
  }
  if(joined.includes('describe')||joined.includes('what do you see')||count===1) {
    return {
      type:'Single-Image Analysis',
      context:'Single observation · Visual question',
      why:'A single observation was supplied for a natural-language visual question.',
      needsEvidence:false,
      specialist:{label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required for this general visual question.'}
    };
  }
  if(joined.includes('water')||joined.includes('river')||joined.includes('lake')||joined.includes('flood')||joined.includes('inundation')) {
    return {
      type:'Water-Body Interpretation',
      context:'Optical · Water interpretation',
      why:'The question focuses on water, rivers, flooding, or inundation patterns.',
      needsEvidence:visualEvidence,
      evidenceTarget:getVisualEvidenceTarget(question),
      specialist:visualEvidence
        ? {label:'Specialist Analysis',status:'not-selected',detail:'No additional specialist selected; visual grounding is handled by the dedicated evidence branch.'}
        : {label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required unless the question requests spatial evidence.'}
    };
  }
  if(joined.includes('built-up')||joined.includes('built up')||joined.includes('urban')||joined.includes('building')||joined.includes('settlement')) {
    return {
      type:'Built-Up-Area Interpretation',
      context:'Optical · Urban interpretation',
      why:'The question focuses on built-up or urban features.',
      needsEvidence:visualEvidence,
      evidenceTarget:getVisualEvidenceTarget(question),
      specialist:visualEvidence
        ? {label:'Specialist Analysis',status:'not-selected',detail:'No additional specialist selected; visual grounding is handled by the dedicated evidence branch.'}
        : {label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required unless the question requests spatial evidence.'}
    };
  }
  if(joined.includes('crop')||joined.includes('agric')||joined.includes('vegetation')||joined.includes('forest')) {
    return {
      type:'Agricultural / Vegetation Interpretation',
      context:'Optical · Vegetation interpretation',
      why:'The question focuses on crops, vegetation, agriculture, or forest cover.',
      needsEvidence:visualEvidence,
      evidenceTarget:getVisualEvidenceTarget(question),
      specialist:visualEvidence
        ? {label:'Specialist Analysis',status:'not-selected',detail:'No additional specialist selected; visual grounding is handled by the dedicated evidence branch.'}
        : {label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required unless the question requests spatial evidence.'}
    };
  }
  if(joined.includes('sar')) {
    return {
      type:'Single-Image Analysis',
      context:'SAR observation · Structural interpretation',
      why:'The question explicitly refers to SAR imagery.',
      needsEvidence:visualEvidence,
      evidenceTarget:getVisualEvidenceTarget(question),
      specialist:visualEvidence
        ? {label:'Specialist Analysis',status:'not-selected',detail:'No additional specialist selected; visual grounding is handled by the dedicated evidence branch.'}
        : {label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required for this general SAR observation.'}
    };
  }
  return {
    type:'General Satellite Observation',
    context:`${count} observation${count===1?'':'s'} · General analysis`,
    why:'The question does not map cleanly to a more specific analysis target.',
    needsEvidence:visualEvidence,
    evidenceTarget:getVisualEvidenceTarget(question),
    specialist:visualEvidence
      ? {label:'Visual Grounding & Segmentation Specialist',status:'selected',detail:'Selected because the request asks for spatial evidence.'}
      : {label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required for this question.'}
  };
}
async function analyzeSourceToFile(source,index){
  if(source?.file instanceof File) return source.file;
  const src=String(source?.src||'');
  if(!src) throw new Error(`Observation ${index+1} has no readable source.`);
  const response=await fetch(src,{cache:'no-store'});
  if(!response.ok) throw new Error(`Could not read observation ${index+1} (${response.status}).`);
  const blob=await response.blob();
  const name=String(source?.name||`satellite-observation-${index+1}${blob.type.includes('png')?'.png':blob.type.includes('webp')?'.webp':'.jpg'}`);
  return new File([blob],name,{type:blob.type||'application/octet-stream',lastModified:Date.now()});
}
async function analyzeInspectFile(file){
  const base={name:String(file?.name||'Unnamed file'),type:String(file?.type||'Not available in uploaded file'),format:analyzeFormatName(file),sizeBytes:Number(file?.size)||0,sizeLabel:analyzeFormatBytes(file?.size),isTiff:analyzeIsTiff(file),width:null,height:null,dimensionsLabel:'Not available in uploaded file'};
  if(base.isTiff) return base;
  const type=String(file?.type||'').toLowerCase();
  if(type && !type.startsWith('image/')) return base;
  if(typeof createImageBitmap==='function'){
    try{const bmp=await createImageBitmap(file);base.width=bmp.width;base.height=bmp.height;base.dimensionsLabel=`${bmp.width} × ${bmp.height} px`;bmp.close();return base;}catch{}
  }
  try{
    const url=URL.createObjectURL(file);
    const dims=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});img.onerror=()=>reject(new Error('Could not decode image dimensions.'));img.src=url});
    URL.revokeObjectURL(url);base.width=dims.w;base.height=dims.h;base.dimensionsLabel=`${dims.w} × ${dims.h} px`;return base;
  }catch{
    return base;
  }
}
function analyzeTilePlan(meta,index,question){
  const seed=analyzeHash(`${meta.name}|${meta.sizeBytes}|${meta.width||0}x${meta.height||0}|${question}|${index}`);
  const sizes=[256,384,512];
  const tileSize=sizes[seed%sizes.length];
  if(meta.width&&meta.height){
    const cols=Math.max(1,Math.ceil(meta.width/tileSize));
    const rows=Math.max(1,Math.ceil(meta.height/tileSize));
    const previewCols=Math.min(8,Math.max(3,cols));
    const previewRows=Math.min(6,Math.max(3,rows));
    return {tileSize,cols,rows,previewCols,previewRows,estimatedWindows:null,label:`Prototype ${tileSize} × ${tileSize} window strategy`,seed};
  }
  const previewCols=4+(seed%4); const previewRows=3+((seed>>>3)%3);
  return {tileSize,cols:null,rows:null,previewCols,previewRows,estimatedWindows:null,label:`Prototype ${tileSize} × ${tileSize} window strategy`,seed};
}
function analyzeBuildProfile(prepared,question,hint=''){
  const target=analyzeTarget(question,prepared.length,hint);
  const tilePlans=prepared.map((item,i)=>analyzeTilePlan(item.meta,i,question));
  const coreg=prepared.length<2
    ? 'Not applicable for a single observation.'
    : (/co-?registered|coregistered/i.test(`${question} ${hint}`)
      ? 'User-described as co-registered; browser has not independently verified the alignment.'
      : 'Not verified in uploaded files.');
  return {
    count:prepared.length,
    context:target.context,
    targetType:target.type,
    routeWhy:target.why,
    needsEvidence:!!target.needsEvidence,
    evidenceTarget:target.evidenceTarget||null,
    specialist:target.specialist||{label:'Specialist Analysis',status:'not-selected',detail:'No dedicated specialist is required.'},
    coreg,
    sources:prepared.map((p,i)=>({index:i+1,name:p.meta.name,type:p.meta.type||'Not available in uploaded file',format:p.meta.format,sizeBytes:p.meta.sizeBytes,sizeLabel:p.meta.sizeLabel,dimensionsLabel:p.meta.dimensionsLabel,isTiff:p.meta.isTiff,width:p.meta.width,height:p.meta.height,preview:p.preview})),
    tilePlans,
    preparation: prepared.length>1
      ? (target.type==='Optical–SAR Cross-Modal Analysis'
        ? 'Preparing a cross-modal observation pair. Co-registration remains not verified.'
        : target.type==='Bi-Temporal Change Analysis'
          ? 'Preparing multiple observations for comparative questioning. Co-registration remains not verified.'
          : 'Preparing multiple observations for the conversation.')
      : 'Preparing the primary observation for the live model request.',
  };
}
function analyzeInitialStages(profile){
  const specialist=profile.specialist||{};
  return [
    {id:'input',label:'Input received',status:'pending',detail:`${profile.count} observation${profile.count===1?'':'s'} received.`},
    {id:'inspection',label:'Input inspection',status:'pending',detail:'Inspecting browser-readable file characteristics.'},
    {id:'routing',label:'Analysis routing',status:'pending',detail:`Target analysis: ${profile.targetType}`},
    {id:'observation',label:'Observation preparation',status:'pending',detail:profile.preparation},
    {id:'modelprep',label:'Model preparation',status:'pending',detail:'Preparing model-compatible observations and prototype windows.'},
    {id:'core',label:'Core Remote-Sensing VLM',status:'pending',detail:'Ready to send the primary observation to Phase-1 adapted Qwen3-VL.'},
    {id:'evidence',label:'Visual Grounding & Segmentation',status:profile.needsEvidence?'pending':'not-required',detail:profile.needsEvidence?'Waiting to start the selected visual-evidence branch.':'Not required for this query.'},
    {id:'specialist',label:'Specialist Analysis',status:specialist.status||'not-selected',detail:specialist.detail||'No dedicated specialist is selected.'},
    {id:'assembly',label:'Evidence / Result Assembly',status:'pending',detail:'Waiting for selected execution branches to settle.'},
    {id:'response',label:'Response prepared',status:'pending',detail:'Waiting for the returned result to be added to the conversation.'},
  ];
}
function analyzeStageStatusLabel(status){return status==='active'?'LIVE':status==='done'?'COMPLETE':status==='error'?'ERROR':'PENDING'}
function analyzeTileDots(plan){
  const total=plan.previewCols*plan.previewRows;
  const seed=analyzeHash(`${plan.tileSize}|${plan.previewCols}|${plan.previewRows}`);
  return Array.from({length:Math.min(48,total)},(_,i)=>((seed+i*13)%17)<8);
}

const iconPaths={
  message:<><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></>,
  folder:<><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 9h18"/></>,
  clock:<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
  file:<><path d="M6 3.5h8l4 4V20.5H6Z"/><path d="M14 3.5v4h4M9 12h6M9 15h6"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3l-.3.1a1.7 1.7 0 0 0-1.2 1.5v.2h-2.5V20a1.7 1.7 0 0 0-1.2-1.5l-.3-.1a1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 7.1 15l-.1-.3a1.7 1.7 0 0 0-1.5-1.2h-.2V11h.2A1.7 1.7 0 0 0 7 9.8l.1-.3a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3l.3-.1A1.7 1.7 0 0 0 12 4.5v-.2h2.5v.2a1.7 1.7 0 0 0 1.2 1.5l.3.1a1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.3a1.7 1.7 0 0 0 1.5 1.2h.2v2.5h-.2a1.7 1.7 0 0 0-1.5 1.2Z"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9.9 9.1a2.3 2.3 0 1 1 4.1 1.5c-.8.8-2 1.2-2 2.6M12 16.7h.01"/></>,
  logout:<><path d="M14 7V4H4v16h10v-3"/><path d="M10 12h10m-3-3 3 3-3 3"/></>,
  bell:<><path d="M18 9a6 6 0 0 0-12 0c0 6.6-2.5 7.2-2.5 8.2h13c0-1-2.5-1.6-2.5-8.2"/><path d="M10 21h4"/></>,
  chevronDown:<path d="m8 10 4 4 4-4"/>, chevronUp:<path d="m8 14 4-4 4 4"/>, chevronRight:<path d="m9 6 6 6-6 6"/>, chevronLeft:<path d="m15 6-6 6 6 6"/>,
  panel:<><rect x="3.5" y="4" width="17" height="16" rx="2.2"/><path d="M8 4v16M12 9l3 3-3 3"/></>, panelOpen:<><rect x="3.5" y="4" width="17" height="16" rx="2.2"/><path d="M8 4v16M15 9l-3 3 3 3"/></>,
  menu:<path d="M5 8h14M5 12h14M5 16h14"/>, x:<path d="m6 6 12 12M18 6 6 18"/>, plus:<path d="M12 5v14M5 12h14"/>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>, image:<><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m5.5 17 4.5-4 3 2.5 2-2 3.5 3.5"/></>,
  paperclip:<path d="m8.8 12.7 5.7-5.7a3 3 0 0 1 4.2 4.2l-7.2 7.2a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4a2.5 2.5 0 0 1 3.6 3.6l-7.4 7.4a.9.9 0 0 1-1.3-1.3l6.4-6.4"/>,
  send:<path d="m4 4 16 8-16 8 3-7 8-1-8-1-3-7Z"/>, more:<><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></>,
  download:<><path d="M12 4v10M8 10l4 4 4-4"/><path d="M5 19h14"/></>, edit:<><path d="m5 16 9.8-9.8a2.1 2.1 0 0 1 3 3L8 19H5Z"/><path d="m13.5 7.5 3 3"/></>,
  check:<path d="m5 12 4 4L19 6"/>, alert:<><path d="M12 4v9"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></>, calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>, leaf:<><path d="M19 3C10 3 5 7 5 14c0 4 3 7 7 7 7 0 9-6 7-18Z"/><path d="M5 19c3-4 6-7 11-10"/></>, home:<><path d="m3 11 9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></>, spark:<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5Z"/>,
  layers:<><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></>, monitor:<><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></>, sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>, moon:<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>, mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>, trash:<><path d="M4 7h16M10 11v6M14 11v6"/><path d="M9 7V4h6v3m3 0-1 13H7L6 7"/></>, lock:<><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  droplets:<path d="M8 4s-4 4.2-4 7a4 4 0 0 0 8 0c0-2.8-4-7-4-7ZM18 10s-2.5 2.7-2.5 4.5a2.5 2.5 0 0 0 5 0c0-1.8-2.5-4.5-2.5-4.5Z"/>,
  map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></>, user:<><circle cx="12" cy="8" r="3"/><path d="M5 20c.9-3.6 3.2-5.5 7-5.5s6.1 1.9 7 5.5"/></>, paper:<><path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4"/><path d="M9 12h6M9 15h5"/></>
};
function Icon({name,size=20,stroke=1.8}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]||iconPaths.spark}</svg>}
function Brand(){return <div className="brand-lockup"><span className="brand-grid"><i/><i/><i/><i/></span><span className="brand-wordmark"><strong>SatQuery AI</strong><small>Ask. Analyze. Understand Earth.</small></span></div>}

function initialRoute(){
  const page=document.body?.dataset?.page || '';
  const params=new URLSearchParams(window.location.search);
  if(page==='workspace') return {type:'workspace',id:params.get('id'),action:null};
  if(page==='new-analysis') return {type:'workspace',id:params.get('workspace'),action:'new-analysis'};
  if(page==='analysis') return {type:'analysis',id:params.get('workspace'),action:params.get('analysis')};
  if(page==='report') return {type:'report',id:params.get('id')};
  if(page==='new-workspace') return {type:'new-workspace'};
  if(page==='workspaces') return {type:'workspaces'};
  if(page==='history') return {type:'history'};
  if(page==='reports') return {type:'reports'};
  if(page==='settings') return {type:'settings'};
  if(page==='help') return {type:'help'};
  return {type:'analyze'};
}

function App(){
  const [route,setRoute]=useState(initialRoute);
  const [session,setSession]=useState(()=>safeRead(SESSION_KEY,{name:'Ayesha',email:'ayesha@example.com'}));
  const [collapsed,setCollapsed]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [toast,setToast]=useState('');
  const [workspaceSearch,setWorkspaceSearch]=useState('');
  const [historySearch,setHistorySearch]=useState('');
  const [historyWorkspaceFilter,setHistoryWorkspaceFilter]=useState('all');
  const [historyTimeFilter,setHistoryTimeFilter]=useState('all');
  const [reportSearch,setReportSearch]=useState('');
  const [reportWorkspaceFilter,setReportWorkspaceFilter]=useState('all');
  const [reportTimeFilter,setReportTimeFilter]=useState('all');
  const [reportMenuId,setReportMenuId]=useState(null);
  const [generateReportOpen,setGenerateReportOpen]=useState(false);
  const [workspaces,setWorkspaces]=useState(()=>{
    const saved=safeRead(KEYS.workspaces,null);
    return Array.isArray(saved)&&saved.length?saved.map(normalizeWorkspace):seedWorkspaceRows;
  });
  const [analyses,setAnalyses]=useState(()=>{
    const saved=safeRead(KEYS.analyses,null);
    return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:buildSeedAnalyses();
  });
  const [chats,setChats]=useState(()=>{
    const saved=safeRead(KEYS.chats,null);
    return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:buildSeedChats();
  });
  const [reports,setReports]=useState(()=>{const saved=safeRead(KEYS.reports,null);return Array.isArray(saved)&&saved.length?saved.map(enrichReport):buildSeedReports()});
  const [historyItems,setHistoryItems]=useState(()=>{const saved=safeRead(KEYS.history,[]);return Array.isArray(saved)&&saved.length?saved.map(x=>({...x,group:x.group||'Today',sub:x.sub||'Analysis'})):buildSeedHistory()});
  const [analyzeMessages,setAnalyzeMessages]=useState(()=>{const saved=safeRead(ANALYZE_KEY,[]);return Array.isArray(saved)?saved:[]});
  const [analyzeDraft,setAnalyzeDraft]=useState('');
  const [analyzePending,setAnalyzePending]=useState([]);
  const [analyzeAttachOpen,setAnalyzeAttachOpen]=useState(false);
  const [analyzePipeline,setAnalyzePipeline]=useState(null);
  const analyzeBusyRef=useRef(false);
  const analyzeRunTokenRef=useRef(0);
  const [workspaceChat,setWorkspaceChat]=useState({workspaceId:null,analysisId:null,messages:[],draft:'',pending:[],chooser:false});
  const [createForm,setCreateForm]=useState({name:'',description:'',region:'',tags:'',cover:A+'flood-card_up_clean.jpg',preview:'',coverName:''});
  const [workspaceTab,setWorkspaceTab]=useState('analyses');
  const [editWorkspace,setEditWorkspace]=useState(null);
  const analyzeFileRef=useRef(null);
  const workspaceFileRef=useRef(null);
  const createFileRef=useRef(null);

  useEffect(()=>{safeWrite(KEYS.workspaces,workspaces)},[workspaces]);
  useEffect(()=>{safeWrite(KEYS.analyses,analyses)},[analyses]);
  useEffect(()=>{safeWrite(KEYS.chats,chats)},[chats]);
  useEffect(()=>{safeWrite(KEYS.reports,reports)},[reports]);
  useEffect(()=>{safeWrite(KEYS.history,historyItems)},[historyItems]);
  useEffect(()=>{safeWrite(ANALYZE_KEY,analyzeMessages)},[analyzeMessages]);
  useEffect(()=>{
    if(route.type==='workspace'&&route.action==='new-analysis'&&route.id&&workspaceChat.workspaceId!==route.id){
      setWorkspaceChat({workspaceId:route.id,analysisId:null,messages:[],draft:'',pending:[],chooser:false});
      setWorkspaceTab('new');
    }
  },[route.type,route.id,route.action,workspaceChat.workspaceId]);

  const navigate=(next)=>{
    const clean=typeof next==='string'?parseTarget(next):next;
    let target='/analyze.html';
    if(clean.type==='analyze') target='/analyze.html';
    else if(clean.type==='workspaces') target='/workspaces.html';
    else if(clean.type==='new-workspace') target='/new-workspace.html';
    else if(clean.type==='workspace') target=clean.action==='new-analysis' ? `/new-analysis.html?workspace=${encodeURIComponent(clean.id||'')}` : `/workspace.html?id=${encodeURIComponent(clean.id||'')}`;
    else if(clean.type==='analysis') target=`/analysis.html?workspace=${encodeURIComponent(clean.id||'')}&analysis=${encodeURIComponent(clean.action||'')}`;
    else if(clean.type==='history') target='/history.html';
    else if(clean.type==='reports') target='/reports.html';
    else if(clean.type==='report') target=`/report.html?id=${encodeURIComponent(clean.id||'')}`;
    else if(clean.type==='settings') target='/settings.html';
    else if(clean.type==='help') target='/help.html';
    window.location.assign(target);
  };
  const notify=(message)=>{setToast(message);window.clearTimeout(window.__sqToast);window.__sqToast=window.setTimeout(()=>setToast(''),2400)};
  const addHistory=(entry)=>setHistoryItems(prev=>[{...entry,id:makeId('history'),group:'Today',sub:entry.sub||'Analysis',createdAt:nowLabel()},...prev].slice(0,100));
  const currentWorkspace=route.type==='workspace'||route.type==='analysis'?workspaces.find(w=>w.id===route.id):null;
  const workspaceChoices=useMemo(()=>workspaces.map(w=>({id:w.id,title:w.title})),[workspaces]);
  const filteredHistory=useMemo(()=>{
    const q=historySearch.trim().toLowerCase();
    return historyItems.filter(i=>{
      const hay=[i.question,i.sub,i.createdAt,i.workspaceId,workspaces.find(w=>w.id===i.workspaceId)?.title||''].join(' ').toLowerCase();
      const matchesQ=!q||hay.includes(q);
      const matchesW=historyWorkspaceFilter==='all'||i.workspaceId===historyWorkspaceFilter;
      const matchesT=historyTimeFilter==='all'||i.group===historyTimeFilter;
      return matchesQ&&matchesW&&matchesT;
    });
  },[historyItems,historySearch,historyWorkspaceFilter,historyTimeFilter,workspaces]);
  const filteredReports=useMemo(()=>{
    const q=reportSearch.trim().toLowerCase();
    return reports.filter(r=>{
      const hay=[r.title,r.description,r.sourceName,workspaces.find(w=>w.id===r.workspaceId)?.title||''].join(' ').toLowerCase();
      const matchesQ=!q||hay.includes(q);
      const matchesW=reportWorkspaceFilter==='all'||r.workspaceId===reportWorkspaceFilter;
      const matchesT=reportTimeFilter==='all'||(reportTimeFilter==='recent'&&r.generatedAt<'27 Sep 2026')||(reportTimeFilter==='latest'&&r.generatedAt==='27 Sep 2026');
      return matchesQ&&matchesW&&matchesT;
    });
  },[reports,reportSearch,reportWorkspaceFilter,reportTimeFilter,workspaces]);


  const chooseAnalyzeFiles=async(files)=>{
    const list=Array.from(files||[]).slice(0,6);
    const prepared=[];
    for(const file of list){
      try{
        const preview=await fileToDataUrl(file,1000);
        prepared.push({id:makeId('pending'),file,src:preview,name:file.name,type:file.type||'Not available in uploaded file'});
      }catch(error){
        console.error('Analyze image preparation error',error);
        notify('Could not read that image.');
      }
    }
    if(prepared.length)setAnalyzePending(prev=>[...prev,...prepared]);
    setAnalyzeAttachOpen(false);
  };

  const sendAnalyze=async(question,sources=[],hint='')=>{
    if(analyzeBusyRef.current)return;
    const q=String(question||'').trim()||(sources.length?'Analyze this satellite image.':'');
    if(!q){notify('Add a question first.');return;}

    const previousUser=[...analyzeMessages].reverse().find(m=>m.role==='user'&&Array.isArray(m.images)&&m.images.length);
    const incoming=sources.length?sources:(previousUser?.images||[]);
    if(!incoming.length){notify('Upload a satellite image first.');return;}

    analyzeBusyRef.current=true;
    const runToken=++analyzeRunTokenRef.current;
    const pipelineId=makeId('pipeline');
    const startedAt=performance.now();

    let prepared=[];
    try{
      for(let i=0;i<incoming.slice(0,6).length;i++){
        const source=incoming[i];
        const file=await analyzeSourceToFile(source,i);
        const meta=await analyzeInspectFile(file);
        const preview=String(source?.src||'') || await fileToDataUrl(file,1000);
        prepared.push({file,preview,meta});
      }
    }catch(error){
      console.error('Analyze image preparation error',error);
      analyzeBusyRef.current=false;
      if(analyzeRunTokenRef.current===runToken){
        const now=nowLabel();
        setAnalyzePipeline({id:pipelineId,running:false,expanded:false,errorType:'image',errorMessage:'Image preparation failed.',technicalError:error?.message||String(error),profile:{count:incoming.length,sources:[]},stages:[{id:'input',label:'Input received',status:'done',detail:`${incoming.length} observation${incoming.length===1?'':'s'} received.`},{id:'inspection',label:'Input inspection',status:'error',detail:error?.message||'Image preparation failed.'},{id:'routing',label:'Analysis routing',status:'pending',detail:'Waiting for readable input.'},{id:'observation',label:'Observation preparation',status:'pending',detail:'Not started.'},{id:'modelprep',label:'Model preparation',status:'pending',detail:'Not started.'},{id:'core',label:'Core Remote-Sensing VLM',status:'pending',detail:'Not started.'},{id:'evidence',label:'Visual Grounding & Segmentation',status:'not-required',detail:'Not started.'},{id:'specialist',label:'Specialist Analysis',status:'not-selected',detail:'Not started.'},{id:'assembly',label:'Evidence / Result Assembly',status:'pending',detail:'Not started.'},{id:'response',label:'Response prepared',status:'pending',detail:'Not started.'}]});
        setAnalyzeMessages(prev=>[...prev,{id:makeId('assistant-error'),role:'error',answer:'Image preparation failed. Check the selected file and try again.',technicalError:error?.message||String(error),createdAt:now}]);
      }
      return;
    }

    const profile=analyzeBuildProfile(prepared,q,hint);
    const stages=analyzeInitialStages(profile);
    const visibleSources=prepared.map((item,i)=>({
      src:String(item.preview||''),
      name:String(item.meta.name||incoming[i]?.name||`Satellite observation ${i+1}`),
      type:String(item.meta.type||''),
      format:String(item.meta.format||''),
      sizeLabel:String(item.meta.sizeLabel||''),
      dimensionsLabel:String(item.meta.dimensionsLabel||'Not available in uploaded file')
    }));
    const userMessage={id:makeId('user'),role:'user',question:q,images:visibleSources,createdAt:nowLabel(),pipelineId};
    addHistory({question:q,sub:profile.targetType,image:visibleSources[0]?.src||'',workspaceId:null,analysisId:null});
    setAnalyzeMessages(prev=>[...prev,userMessage]);
    setAnalyzeDraft('');
    setAnalyzePending([]);
    setAnalyzeAttachOpen(false);
    setAnalyzePipeline({id:pipelineId,running:true,expanded:false,profile,stages,errorType:null,errorMessage:null,technicalError:null,coreModel:{status:'pending',latency:null,error:null},visualEvidence:{status:profile.needsEvidence?'pending':'not-required',latency:null,error:null,result:null},specialistExecution:{status:profile.specialist?.status||'not-selected',label:profile.specialist?.label||'Specialist Analysis',detail:profile.specialist?.detail||''},validation:{coregistration:profile.coreg},qwenLatency:null,evidenceLatency:null,totalLatency:null,startedAt:Date.now()});

    const patchPipeline=(patch)=>{
      if(analyzeRunTokenRef.current!==runToken)return;
      setAnalyzePipeline(prev=>prev?({...prev,...(typeof patch==='function'?patch(prev):patch)}):prev);
    };
    const patchStage=(id,patch)=>{
      patchPipeline(prev=>({
        ...prev,
        stages:(prev.stages||stages).map(s=>s.id===id?{...s,...(typeof patch==='function'?patch(s):patch)}:s)
      }));
    };
    const stage=async(id,duration,detail)=>{
      patchStage(id,{status:'active',detail});
      await analyzeSleep(duration);
      if(analyzeRunTokenRef.current!==runToken)return false;
      patchStage(id,{status:'done',detail});
      return true;
    };

    try{
      if(!await stage('input',450,`${profile.count} observation${profile.count===1?'':'s'} received. Actual files retained for model submission.`))return;
      if(!await stage('inspection',640,`${profile.sources.filter(s=>!s.isTiff&&String(s.dimensionsLabel||'').includes('×')).length} browser-decodable image${profile.sources.length===1?'':'s'} inspected. TIFF / GeoTIFF metadata remains undecoded.`))return;
      if(!await stage('routing',580,`Target analysis: ${profile.targetType}. ${profile.routeWhy}`))return;
      if(!await stage('observation',760,profile.preparation + (profile.count>1?` Co-registration: ${profile.coreg}`:'')))return;
      const modelPrepDetail=`Preparing model input · checking observation bounds · preparing visual windows · assembling model-ready observation. Prototype window strategy only; no exact tile count is claimed.`;
      if(!await stage('modelprep',1450,modelPrepDetail))return;

      // Launch selected branches independently. Qwen never waits for evidence, and evidence never waits for Qwen.
      patchStage('core',{status:'active',detail:'Sending primary observation to the live Phase-1 adapted Qwen3-VL endpoint…'});
      patchStage('assembly',{status:'pending',detail:'Waiting for selected execution branches to settle.'});
      if(profile.needsEvidence){
        patchStage('evidence',{status:'active',detail:`Running Florence-2 visual grounding for “${profile.evidenceTarget||'requested target'}”…`});
      }
      patchStage('specialist',profile.specialist?.status==='not-connected'
        ? {status:'not-connected',detail:profile.specialist.detail}
        : profile.specialist?.status==='selected'
          ? {status:'not-connected',detail:profile.specialist.detail}
          : {status:'not-selected',detail:profile.specialist?.detail||'No dedicated specialist selected.'});

      const runQwen=async()=>{
        const t0=performance.now();
        try{
          const answer=await askQwen(prepared[0].file,q);
          const latency=Math.round(performance.now()-t0);
          if(analyzeRunTokenRef.current===runToken){
            patchPipeline(prev=>({...prev,coreModel:{status:'done',latency,error:null},qwenLatency:latency}));
            patchStage('core',{status:'done',detail:`Live model response received in ${latency} ms. Request scope: ${profile.count>1?'Primary observation sent.':'Uploaded observation sent.'}`});
          }
          return {ok:true,answer:String(answer),latency};
        }catch(error){
          const latency=Math.round(performance.now()-t0);
          console.error('Core Remote-Sensing VLM inference error',error);
          if(analyzeRunTokenRef.current===runToken){
            patchPipeline(prev=>({...prev,coreModel:{status:'error',latency,error:error?.message||String(error)},qwenLatency:latency,errorType:'model',errorMessage:'Core Remote-Sensing VLM inference failed.',technicalError:error?.message||String(error)}));
            patchStage('core',{status:'error',detail:'The live Phase-1 Qwen3-VL request failed.'});
          }
          return {ok:false,error:error?.message||String(error),latency};
        }
      };

      const runEvidence=async()=>{
        const t0=performance.now();
        if(!profile.needsEvidence)return {ok:true,required:false,result:null,latency:0};
        try{
          const result=await getVisualEvidence(prepared[0].file,q);
          const latency=Math.round(performance.now()-t0);
          if(analyzeRunTokenRef.current===runToken){
            if(result?.imageUrl){
              patchPipeline(prev=>({...prev,visualEvidence:{status:'done',latency,error:null,result}}));
              const regionCount=Number(result.regionCount)||0;
              patchStage('evidence',{status:'done',detail:`Florence-2 returned a visual evidence image${regionCount?` with ${regionCount} grounded region${regionCount===1?'':'s'}`:''}.`});
            }else{
              patchPipeline(prev=>({...prev,visualEvidence:{status:'error',latency,error:'Visual evidence was not returned by the evidence service.',result:null}}));
              patchStage('evidence',{status:'error',detail:'Visual evidence could not be generated.'});
            }
          }
          return result?.imageUrl?{ok:true,required:true,result,latency}:{ok:false,required:true,result:null,error:'Visual evidence was not returned by the evidence service.',latency};
        }catch(error){
          const latency=Math.round(performance.now()-t0);
          console.error('Visual Grounding & Segmentation error',error);
          if(analyzeRunTokenRef.current===runToken){
            patchPipeline(prev=>({...prev,visualEvidence:{status:'error',latency,error:error?.message||String(error),result:null}}));
            patchStage('evidence',{status:'error',detail:'Visual evidence could not be generated.'});
          }
          return {ok:false,required:true,result:null,error:error?.message||String(error),latency};
        }
      };

      const [qwenResult,evidenceResult]=await Promise.all([runQwen(),runEvidence()]);
      if(analyzeRunTokenRef.current!==runToken)return;

      const elapsed=performance.now()-startedAt;
      const remaining=Math.max(0,MINIMUM_VISIBLE_ANALYZE_TIME-elapsed);
      if(remaining>0)await analyzeSleep(remaining);
      if(analyzeRunTokenRef.current!==runToken)return;

      patchStage('assembly',{status:'active',detail:'Assembling independent model and evidence results for the conversation.'});
      await analyzeSleep(360);
      if(analyzeRunTokenRef.current!==runToken)return;
      patchStage('assembly',{status:'done',detail:'Independent branch results assembled.'});
      patchStage('response',{status:'active',detail:'Preparing the returned result for the conversation.'});
      await analyzeSleep(380);
      if(analyzeRunTokenRef.current!==runToken)return;

      const completedStages=(stages).map(s=>{
        const current=(s.id==='input')?{...s,status:'done',detail:`${profile.count} observation${profile.count===1?'':'s'} received.`}
          :(s.id==='inspection')?{...s,status:'done',detail:'Browser-readable file characteristics inspected; unavailable geospatial metadata is left as Not available.'}
          :(s.id==='routing')?{...s,status:'done',detail:`Target analysis: ${profile.targetType}. ${profile.routeWhy}`}
          :(s.id==='observation')?{...s,status:'done',detail:profile.preparation + (profile.count>1?` Co-registration: ${profile.coreg}`:'')}
          :(s.id==='modelprep')?{...s,status:'done',detail:'Prototype model-preparation sequence completed; no exact raster tile count was claimed.'}
          :(s.id==='core')?{...s,status:qwenResult.ok?'done':'error',detail:qwenResult.ok?`Live model response received in ${qwenResult.latency} ms. ${profile.count>1?'Request scope: primary observation.':'Request scope: uploaded observation.'}`:'Core Remote-Sensing VLM inference failed.'}
          :(s.id==='evidence')?(!profile.needsEvidence?{...s,status:'not-required',detail:'Not required for this query.'}:{...s,status:evidenceResult.ok?'done':'error',detail:evidenceResult.ok?'Florence-2 returned the requested visual evidence.':'Visual evidence could not be generated.'})
          :(s.id==='specialist')?{...s,status:profile.specialist?.status||'not-selected',detail:profile.specialist?.detail||'No dedicated specialist selected.'}
          :(s.id==='assembly')?{...s,status:'done',detail:'Independent branch results assembled.'}
          :{...s,status:qwenResult.ok?'done':'error',detail:qwenResult.ok?'Response prepared for the conversation.':'Response could not be prepared because the Core Remote-Sensing VLM request failed.'};
        return current;
      });

      const resultState={
        question:q,
        createdAt:userMessage.createdAt,
        completedAt:nowLabel(),
        observationCount:profile.count,
        observations:profile.sources,
        route:profile.targetType,
        routeWhy:profile.routeWhy,
        context:profile.context,
        stages:completedStages,
        coreModel:{implementation:'Phase-1 adapted Qwen3-VL',status:qwenResult.ok?'completed':'error',latency:qwenResult.latency,error:qwenResult.ok?null:qwenResult.error,requestScope:profile.count>1?'Primary observation':'Uploaded observation'},
        visualEvidence:{required:profile.needsEvidence,status:profile.needsEvidence?(evidenceResult.ok?'completed':'error'):'not-required',implementation:'Florence-2 public Gradio Space',latency:profile.needsEvidence?evidenceResult.latency:null,target:profile.evidenceTarget||null,imageUrl:evidenceResult.result?.imageUrl||null,evidenceType:evidenceResult.result?.taskLabel||'Grounded region / segmentation',regionCount:evidenceResult.result?.regionCount||0,error:evidenceResult.ok?null:evidenceResult.error||null},
        specialist:{label:profile.specialist?.label||'Specialist Analysis',status:profile.specialist?.status||'not-selected',detail:profile.specialist?.detail||''},
        validation:{coregistration:profile.coreg,metadata:'Not available in uploaded file unless explicitly decoded.'},
        limitations:[]
      };
      if(profile.count>1)resultState.limitations.push('The current Phase-1 Qwen request sends only the primary observation.');
      if(profile.sources.some(s=>s.isTiff))resultState.limitations.push('GeoTIFF geospatial metadata was not decoded in the browser.');
      if(profile.specialist?.status==='not-connected')resultState.limitations.push(`${profile.specialist.label} is not connected in the current Phase-1 prototype.`);
      if(profile.count>1&&profile.type!=='Single-Image Visual Grounding')resultState.limitations.push(`Co-registration: ${profile.coreg}`);
      if(profile.needsEvidence&&!evidenceResult.ok)resultState.limitations.push('Visual evidence could not be generated.');
      if(profile.needsEvidence && evidenceResult.ok===false)resultState.validation.visualEvidence='Not available';
      else if(profile.needsEvidence)resultState.validation.visualEvidence='Returned by Florence-2';
      else resultState.validation.visualEvidence='Not required';

      const reportReady=!!qwenResult.ok;
      if(reportReady)resultState.answer=qwenResult.answer;
      else resultState.answer='';

      const completedPipeline={
        id:pipelineId,
        running:false,
        expanded:false,
        profile,
        stages:completedStages,
        errorType:qwenResult.ok?null:'model',
        errorMessage:qwenResult.ok?null:'Core Remote-Sensing VLM inference failed.',
        technicalError:qwenResult.ok?null:qwenResult.error,
        totalLatency:Math.round(performance.now()-startedAt),
        qwenLatency:qwenResult.latency,
        evidenceLatency:profile.needsEvidence?evidenceResult.latency:null,
        coreModel:resultState.coreModel,
        visualEvidence:resultState.visualEvidence,
        specialistExecution:resultState.specialist,
        validation:resultState.validation,
        completedResult:reportReady?resultState:null
      };

      const reportData=reportReady?{
        ...resultState,
        answer:qwenResult.answer,
        printTitle: profile.targetType==='Bi-Temporal Change Analysis'?'Bi-Temporal Analysis Report':profile.targetType==='Optical–SAR Cross-Modal Analysis'?'Optical–SAR Analysis Report':'Satellite Analysis Report'
      }:null;

      setAnalyzeMessages(prev=>prev.map(m=>m.id===userMessage.id?{...m,pipeline:completedPipeline}:m).concat(reportReady
        ? {id:makeId('assistant'),role:'assistant',answer:qwenResult.answer,createdAt:nowLabel(),visualEvidence:resultState.visualEvidence,validation:resultState.validation,reportData}
        : [{id:makeId('assistant-error'),role:'error',answer:'Core Remote-Sensing VLM inference failed. Visual evidence can still be reviewed if it was returned.',technicalError:qwenResult.error,createdAt:nowLabel(),visualEvidence:resultState.visualEvidence}][0]));
      setAnalyzePipeline(null);
    }catch(error){
      console.error('Analyze pipeline error',error);
      if(analyzeRunTokenRef.current===runToken){
        setAnalyzePipeline(prev=>prev?{...prev,running:false,errorType:'pipeline',errorMessage:'Analysis encountered an error.',technicalError:error?.message||String(error),stages:(prev.stages||[]).map(s=>s.id==='assembly'||s.id==='response'?{...s,status:'error',detail:error?.message||'Result assembly failed.'}:s)}:prev);
      }
    }finally{
      if(analyzeRunTokenRef.current===runToken)analyzeBusyRef.current=false;
    }
  };

  const removeAnalyzePending=(id)=>setAnalyzePending(prev=>prev.filter(x=>x.id!==id));
  const openWorkspace=(id)=>{setWorkspaceTab('analyses');navigate({type:'workspace',id})};
  const createWorkspace=(data)=>{
    const base=(data.name||'workspace').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'workspace';
    let id=base,n=2;while(workspaces.some(w=>w.id===id))id=`${base}-${n++}`;
    const now=nowLabel();
    const imgs=data.coverPreview? [{id:makeId('img'),title:data.coverName||'Workspace cover',src:data.coverPreview,date:now,modality:'Uploaded'}]:[];
    const w=normalizeWorkspace({id,title:data.name.trim(),region:data.region.trim()||'India',subtitle:data.description.trim()||'A new SatQuery workspace.',tags:data.tags,cover:data.coverPreview||data.cover,images:imgs,imageCount:imgs.length,analysisCount:0,created:now,updated:now,updatedLabel:'just now'});
    const nextWorkspaces=[w,...workspaces];
    const nextAnalyses={...analyses,[id]:[]};
    const nextChats={...chats,[id]:{}};
    setWorkspaces(nextWorkspaces);
    setAnalyses(nextAnalyses);setChats(nextChats);
    safeWrite(KEYS.workspaces,nextWorkspaces);
    safeWrite(KEYS.analyses,nextAnalyses);
    safeWrite(KEYS.chats,nextChats);
    setCreateForm({name:'',description:'',region:'',tags:'',cover:A+'flood-card_up_clean.jpg',preview:'',coverName:''});
    notify('Workspace created');openWorkspace(id);
  };

  const updateWorkspace=(id,patch)=>setWorkspaces(prev=>prev.map(w=>w.id===id?normalizeWorkspace({...w,...patch}):w));
  const deleteWorkspace=(id)=>{if(!window.confirm('Delete this workspace?'))return;const nextWorkspaces=workspaces.filter(w=>w.id!==id);const nextAnalyses={...analyses};delete nextAnalyses[id];const nextChats={...chats};delete nextChats[id];setWorkspaces(nextWorkspaces);setAnalyses(nextAnalyses);setChats(nextChats);safeWrite(KEYS.workspaces,nextWorkspaces);safeWrite(KEYS.analyses,nextAnalyses);safeWrite(KEYS.chats,nextChats);notify('Workspace deleted');navigate({type:'workspaces'})};

  const startWorkspaceAnalysis=()=>{
    if(!currentWorkspace)return;
    setWorkspaceChat({workspaceId:currentWorkspace.id,analysisId:null,messages:[],draft:'',pending:[],chooser:false});
    navigate({type:'workspace',id:currentWorkspace.id,action:'new-analysis'});
  };
  const openAnalysis=(workspaceId,analysisId)=>{
    navigate({type:'analysis',id:workspaceId,action:analysisId});
  };
  const sendWorkspaceMessage=()=>{
    const s=workspaceChat;if(!s.workspaceId)return;
    const q=s.draft.trim()||(s.pending.length?'Analyze these images.':'');
    if(!q&&!s.pending.length){notify('Add a question or an image first.');return;}
    const now=nowLabel();
    const user={id:makeId('user'),role:'user',question:q,images:s.pending.map(p=>({src:p.src,name:p.name})),createdAt:now};
    const assistant={id:makeId('assistant'),role:'assistant',answer:answerFor(q),createdAt:now};
    const nextMessages=[...s.messages,user,assistant];
    if(s.analysisId){
      setChats(prev=>({...prev,[s.workspaceId]:{...(prev[s.workspaceId]||{}),[s.analysisId]:nextMessages}}));
      setAnalyses(prev=>({...prev,[s.workspaceId]:(prev[s.workspaceId]||[]).map(a=>a.id===s.analysisId?{...a,answer:assistant.answer}:a)}));
    } else {
      const aId=makeId('analysis');
      const w=workspaces.find(x=>x.id===s.workspaceId);
      const a={id:aId,q,sub:'Natural-language satellite analysis',date:now,image:s.pending[0]?.src||w?.cover||'',answer:assistant.answer};
      setAnalyses(prev=>({...prev,[s.workspaceId]:[a,...(prev[s.workspaceId]||[])]}));
      setChats(prev=>({...prev,[s.workspaceId]:{...(prev[s.workspaceId]||{}),[aId]:nextMessages}}));
      setWorkspaces(prev=>prev.map(x=>x.id===s.workspaceId?{...x,analysisCount:(x.analysisCount||0)+1,updated:now,updatedLabel:'just now',images:[...(x.images||[]),...s.pending.map(p=>({id:makeId('img'),title:p.name,date:now,modality:'Uploaded',src:p.src}))],imageCount:(x.imageCount||0)+s.pending.length}:x));
      addHistory({question:q,sub:a.sub,image:a.image,workspaceId:s.workspaceId,analysisId:aId});
      setWorkspaceChat({...s,analysisId:aId,messages:nextMessages,draft:'',pending:[],chooser:false});
      return;
    }
    addHistory({question:q,sub:'Follow-up analysis',image:s.messages.find(m=>m.role==='user'&&m.images?.[0])?.images?.[0]?.src||'',workspaceId:s.workspaceId,analysisId:s.analysisId});
    setWorkspaceChat({...s,messages:nextMessages,draft:'',pending:[],chooser:false});
  };
  const loadWorkspaceAnalysis=(workspaceId,analysisId)=>{
    const stored=((chats[workspaceId]||{})[analysisId]);
    const analysis=(analyses[workspaceId]||[]).find(a=>a.id===analysisId);
    return {workspaceId,analysisId,messages:Array.isArray(stored)&&stored.length?stored:(analysis?[{id:analysis.id+'-u',role:'user',question:analysis.q,images:analysis.image?[{src:analysis.image,name:'Satellite observation'}]:[],createdAt:analysis.date},{id:analysis.id+'-a',role:'assistant',answer:analysis.answer,createdAt:analysis.date}]:[]),draft:'',pending:[],chooser:false};
  };

  const resetDemoState=()=>{
    const seededWorkspaces=seedWorkspaceRows.map(normalizeWorkspace);
    const seededAnalyses=buildSeedAnalyses();
    const seededChats=buildSeedChats();
    const seededReports=buildSeedReports();
    const seededHistory=buildSeedHistory();
    setWorkspaces(seededWorkspaces);
    setAnalyses(seededAnalyses);
    setChats(seededChats);
    setReports(seededReports);
    setHistoryItems(seededHistory);
    setAnalyzeMessages([]);
    setAnalyzeDraft('');
    setAnalyzePending([]);
    setAnalyzeAttachOpen(false);
    setWorkspaceChat({workspaceId:null,analysisId:null,messages:[],draft:'',pending:[],chooser:false});
    setWorkspaceTab('analyses');
    setEditWorkspace(null);
    setWorkspaceSearch('');setHistorySearch('');setHistoryWorkspaceFilter('all');setHistoryTimeFilter('all');
    setReportSearch('');setReportWorkspaceFilter('all');setReportTimeFilter('all');setReportMenuId(null);
    safeWrite(KEYS.workspaces,seededWorkspaces);
    safeWrite(KEYS.analyses,seededAnalyses);
    safeWrite(KEYS.chats,seededChats);
    safeWrite(KEYS.reports,seededReports);
    safeWrite(KEYS.history,seededHistory);
    safeWrite(NS+'analyze_chat',[]);
    notify('Demo data reset to the default workspace set.');
  };

  const openReport=(id)=>navigate({type:'report',id});
  const deleteReport=(id)=>{const nextReports=reports.filter(r=>r.id!==id);setReports(nextReports);safeWrite(KEYS.reports,nextReports);setReportMenuId(null);notify('Report removed');};
  const generateReport=(workspaceId)=>{
    const w=workspaces.find(x=>x.id===workspaceId)||workspaces[0];
    const key={
      'assam-flood-analysis':'assam','coastal-region-study':'coastal','crop-monitoring':'crops','hyderabad-urban-study':'urban','forest-change-monitoring':'forest'
    }[w?.id]||'assam';
    const t=reportTemplates[key];
    const r=enrichReport({id:makeId('report'),workspaceId:w?.id||t.workspaceId,templateKey:key,title:w?.title?`${w.title} Report`:t.title,generatedAt:nowLabel()});
    const nextReports=[r,...reports];
    setReports(nextReports);
    safeWrite(KEYS.reports,nextReports);
    setGenerateReportOpen(false);
    openReport(r.id);
    notify('Report generated');
  };
  const downloadReport=(r)=>{
    if(route.type!=='report'||route.id!==r.id){openReport(r.id);window.setTimeout(()=>window.print(),500);return;}
    window.print();
  };

  let view=null;
  if(route.type==='analyze') view=<AnalyzePage messages={analyzeMessages} pipeline={analyzePipeline} draft={analyzeDraft} pending={analyzePending} attachOpen={analyzeAttachOpen} setDraft={setAnalyzeDraft} setAttachOpen={setAnalyzeAttachOpen} onSend={sendAnalyze} onPick={chooseAnalyzeFiles} onRemovePending={removeAnalyzePending} fileRef={analyzeFileRef} onClear={()=>{analyzeRunTokenRef.current+=1;analyzeBusyRef.current=false;setAnalyzePipeline(null);setAnalyzeMessages([]);safeWrite(ANALYZE_KEY,[]);setAnalyzePending([]);setAnalyzeDraft('');notify('Conversation cleared')}} onTogglePipeline={(runId)=>{if(analyzePipeline?.id===runId){setAnalyzePipeline(prev=>prev?{...prev,expanded:!prev.expanded}:prev);return}setAnalyzeMessages(prev=>prev.map(m=>m.pipelineId===runId&&m.pipeline?{...m,pipeline:{...m.pipeline,expanded:!m.pipeline.expanded}}:m))}}/>
  else if(route.type==='workspaces') view=<WorkspacesPage workspaces={workspaces} search={workspaceSearch} setSearch={setWorkspaceSearch} onOpen={openWorkspace} onCreate={()=>navigate({type:'new-workspace'})} onDelete={deleteWorkspace}/>;
  else if(route.type==='new-workspace') view=<NewWorkspacePage form={createForm} setForm={setCreateForm} onBack={()=>navigate({type:'workspaces'})} onCreate={createWorkspace} fileRef={createFileRef}/>;
  else if(route.type==='workspace'&&route.action==='new-analysis'){
    const state=workspaceChat.workspaceId===route.id?workspaceChat:{workspaceId:route.id,analysisId:null,messages:[],draft:'',pending:[],chooser:false};
    view=<WorkspaceAnalysisPage workspace={currentWorkspace} state={state} setState={setWorkspaceChat} onBack={()=>navigate({type:'workspace',id:route.id})} onSend={sendWorkspaceMessage} onOpenAnalysis={id=>openAnalysis(route.id,id)} onPick={async(files)=>{const imgs=[];for(const f of Array.from(files||[]).slice(0,6)){try{imgs.push({id:makeId('pending'),src:await fileToDataUrl(f),name:f.name})}catch{}}if(imgs.length)setWorkspaceChat(s=>({...s,pending:[...s.pending,...imgs]}))}} fileRef={workspaceFileRef} onTab={setWorkspaceTab} tab={workspaceTab} analyses={analyses[route.id]||[]} reports={reports.filter(r=>r.workspaceId===route.id)} onOpenReport={openReport} onDownloadReport={r=>{openReport(r.id);window.setTimeout(()=>window.print(),450)}} />;
  }
  else if(route.type==='workspace') view=<WorkspaceDetailPage workspace={currentWorkspace} tab={workspaceTab} setTab={setWorkspaceTab} analyses={analyses[route.id]||[]} reports={reports.filter(r=>r.workspaceId===route.id)} chats={chats[route.id]||{}} onBack={()=>navigate({type:'workspaces'})} onNewAnalysis={startWorkspaceAnalysis} onOpenAnalysis={id=>openAnalysis(route.id,id)} onEdit={setEditWorkspace} onDelete={()=>deleteWorkspace(route.id)} onAddImage={async(file)=>{if(!file)return;try{const src=await fileToDataUrl(file);const w=workspaces.find(x=>x.id===route.id);if(w)updateWorkspace(route.id,{images:[...(w.images||[]),{id:makeId('img'),title:file.name,date:nowLabel(),modality:'Uploaded',src}],imageCount:(w.imageCount||0)+1,updated:nowLabel(),updatedLabel:'just now'});notify('Image added')}catch{notify('Could not read that image.')}}} onOpenReport={id=>{openReport(id)}} onDownloadReport={r=>{openReport(r.id);window.setTimeout(()=>window.print(),450)}} />;
  else if(route.type==='analysis'){
    const analysis=(analyses[route.id]||[]).find(a=>a.id===route.action);
    const chatState=loadWorkspaceAnalysis(route.id,route.action);
    view=<AnalysisConversation workspace={currentWorkspace} analysis={analysis} messages={((chats[route.id]||{})[route.action]||chatState.messages)} onBack={()=>navigate({type:'workspace',id:route.id})} onSend={(q)=>{
      if(!q.trim())return;const now=nowLabel();const current=((chats[route.id]||{})[route.action]||chatState.messages);const next=[...current,{id:makeId('user'),role:'user',question:q.trim(),images:[],createdAt:now},{id:makeId('assistant'),role:'assistant',answer:answerFor(q),createdAt:now}];setChats(prev=>({...prev,[route.id]:{...(prev[route.id]||{}),[route.action]:next}}));setAnalyses(prev=>({...prev,[route.id]:(prev[route.id]||[]).map(a=>a.id===route.action?{...a,answer:answerFor(q)}:a)}));addHistory({question:q.trim(),sub:analysis?.sub||'Follow-up analysis',image:analysis?.image||'',workspaceId:route.id,analysisId:route.action});
    }} />;
  }
  else if(route.type==='history') view=<HistoryPage history={filteredHistory} allHistory={historyItems} search={historySearch} setSearch={setHistorySearch} workspaceFilter={historyWorkspaceFilter} setWorkspaceFilter={setHistoryWorkspaceFilter} timeFilter={historyTimeFilter} setTimeFilter={setHistoryTimeFilter} workspaces={workspaceChoices} onOpen={item=>item.workspaceId&&item.analysisId?openAnalysis(item.workspaceId,item.analysisId):navigate({type:'analyze'})}/>;
  else if(route.type==='reports') view=<ReportsPage reports={filteredReports} allReports={reports} search={reportSearch} setSearch={setReportSearch} workspaceFilter={reportWorkspaceFilter} setWorkspaceFilter={setReportWorkspaceFilter} timeFilter={reportTimeFilter} setTimeFilter={setReportTimeFilter} workspaces={workspaceChoices} onOpen={openReport} onDownload={downloadReport} menuId={reportMenuId} setMenuId={setReportMenuId} onDelete={deleteReport} onGenerate={()=>setGenerateReportOpen(true)}/>;
  else if(route.type==='report'){ const report=reports.find(r=>r.id===route.id); view=<ReportDetailPage report={report} workspaces={workspaces} onBack={()=>navigate({type:'reports'})} onDownload={()=>downloadReport(report)} onOpenWorkspace={id=>openWorkspace(id)}/>; }
  else if(route.type==='settings') view=<SettingsPage notify={notify} workspaces={workspaces} session={session} onProfileChange={(next)=>{const merged={...session,...next};setSession(merged);safeWrite(SESSION_KEY,merged)}} onResetDemo={()=>resetDemoState()} go={navigate}/>;
  else if(route.type==='help') view=<HelpPage notify={notify} go={navigate}/>;
  else view=<AnalyzePage messages={analyzeMessages} pipeline={analyzePipeline} draft={analyzeDraft} pending={analyzePending} attachOpen={analyzeAttachOpen} setDraft={setAnalyzeDraft} setAttachOpen={setAnalyzeAttachOpen} onSend={sendAnalyze} onPick={chooseAnalyzeFiles} onRemovePending={removeAnalyzePending} fileRef={analyzeFileRef} onClear={()=>{analyzeRunTokenRef.current+=1;analyzeBusyRef.current=false;setAnalyzePipeline(null);setAnalyzeMessages([]);setAnalyzePending([]);setAnalyzeDraft('')}} onTogglePipeline={()=>{}}/>;

  const context=route.type==='workspace'?route.action==='new-analysis'?'New analysis':currentWorkspace?.title||'Workspace':route.type==='analysis'?'Analysis':route.type==='report'?'Report':route.type==='new-workspace'?'New workspace':route.type[0]?.toUpperCase()+route.type.slice(1);
  return <div className={`app-shell ${collapsed?'sidebar-is-collapsed':''} ${mobile?'mobile-sidebar-open':''}`}>
    <Sidebar active={route.type==='workspace'||route.type==='new-workspace'?'workspaces':route.type==='report'?'reports':route.type} collapsed={collapsed} mobileOpen={mobile} session={session} onToggle={()=>setCollapsed(v=>!v)} go={navigate} onLogout={()=>setLogoutOpen(true)} profileOpen={profileOpen} setProfileOpen={setProfileOpen}/>
    {mobile&&<button className="mobile-backdrop" aria-label="Close navigation" onClick={()=>setMobile(false)}/>} 
    <div className="app-main"><Topbar context={context} mobileOpen={mobile} setMobileOpen={setMobile} notificationsOpen={notifications} setNotificationsOpen={setNotifications} profileOpen={profileOpen} setProfileOpen={setProfileOpen} go={navigate} onLogout={()=>setLogoutOpen(true)} session={session}/>
      <main className="main-content">{view}</main>
    </div>
    {toast&&<div className="toast"><Icon name="check" size={16}/>{toast}</div>}
    {generateReportOpen&&<GenerateReportModal workspaces={workspaces} onClose={()=>setGenerateReportOpen(false)} onGenerate={generateReport}/>}
    {logoutOpen&&<LogoutModal onCancel={()=>setLogoutOpen(false)} onConfirm={()=>{localStorage.removeItem(SESSION_KEY);setLogoutOpen(false);window.location.href='/'}}/>}
    {editWorkspace&&<WorkspaceEditor workspace={editWorkspace} onClose={()=>setEditWorkspace(null)} onSave={patch=>{updateWorkspace(editWorkspace.id,patch);setEditWorkspace(null);notify('Workspace updated')}}/>}
  </div>;
}

function parseTarget(s){const raw=String(s||'').replace(/^#?\/?/,'');const p=raw.split('/').filter(Boolean);if(!p.length)return {type:'analyze'};if(p[0]==='workspace')return {type:'workspace',id:p[1]||null,action:p[2]||null};if(p[0]==='analysis')return {type:'analysis',id:p[1]||null,action:p[2]||null};if(p[0]==='report')return {type:'report',id:p[1]||null,action:p[2]||null};return {type:p[0],id:p[1]||null,action:p[2]||null}}
function normalizeWorkspace(w){const x=w&&typeof w==='object'?w:{};const images=Array.isArray(x.images)?x.images.map((im,i)=>({id:String(im?.id||makeId('img')),title:String(im?.title||`Image ${i+1}`),src:String(im?.src||''),date:String(im?.date||'Recent'),modality:String(im?.modality||'Uploaded')})):[];return{...x,id:String(x.id||makeId('workspace')),title:String(x.title||'Untitled workspace'),region:String(x.region||'India'),subtitle:String(x.subtitle||'Satellite imagery and analysis.'),tags:Array.isArray(x.tags)?x.tags.map(String):[],cover:String(x.cover||A+'flood-card_up_clean.jpg'),images,imageCount:Number.isFinite(Number(x.imageCount))?Number(x.imageCount):images.length,analysisCount:Number(x.analysisCount)||0,created:String(x.created||'28 Sep 2026'),updated:String(x.updated||'just now'),updatedLabel:String(x.updatedLabel||'just now')}}
function buildSeedAnalyses(){const out={};seedWorkspaceRows.forEach(w=>{const qs=w.id==='assam-flood-analysis'?['What areas are likely flooded?','What changed between these images?','Highlight built-up areas','Compare optical and SAR images','Identify agricultural land']:w.id==='hyderabad-urban-study'?['Where are the densest built-up clusters?','How is land use changing?','Compare urban texture across the scene']:['What are the main patterns in this imagery?','What visible changes should I inspect?','What evidence supports this interpretation?'];out[w.id]=qs.map((q,i)=>({id:'seed-'+w.id+'-'+i,q,sub:i===0?'Scene interpretation':i===1?'Bi-temporal analysis':'Evidence review',date:`${18+i} Sep 2026`,image:(w.images[i%w.images.length]?.src)||w.cover,answer:answerFor(q)}));});return out}
function buildSeedChats(){const chats={};const an=buildSeedAnalyses();Object.keys(an).forEach(wid=>{chats[wid]={};an[wid].forEach((a,i)=>{const follow=i%2===0?'What evidence supports this interpretation?':'Can you explain the optical and SAR evidence separately?';chats[wid][a.id]=[{id:a.id+'-u1',role:'user',question:a.q,images:[{src:a.image,name:'Satellite observation'}],createdAt:a.date},{id:a.id+'-a1',role:'assistant',answer:a.answer,createdAt:a.date},{id:a.id+'-u2',role:'user',question:follow,images:[],createdAt:'Follow-up'},{id:a.id+'-a2',role:'assistant',answer:answerFor(follow),createdAt:'SatQuery response'}]})});return chats}

function Sidebar({active,collapsed,mobileOpen,session,onToggle,go,onLogout,profileOpen,setProfileOpen}){const items=[['analyze','Analyze','message'],['workspaces','Workspaces','folder'],['history','History','clock'],['reports','Reports','file']];const secondary=[['settings','Settings','settings'],['help','Help & Support','help']];return <aside className={`sidebar ${collapsed?'collapsed':''} ${mobileOpen?'mobile-open':''}`}><div className="sidebar-brand-row"><a className="sidebar-brand" href="/" onClick={e=>{e.preventDefault();go({type:'analyze'})}}><Brand/></a><button type="button" className="sidebar-collapse" onClick={onToggle} aria-label={collapsed?'Expand navigation':'Collapse navigation'}><Icon name={collapsed?'panelOpen':'panel'} size={19}/></button></div><nav className="sidebar-nav">{items.map(([id,label,ico])=><button type="button" key={id} className={'nav-item '+(active===id?'active':'')} onClick={()=>go({type:id})} title={collapsed?label:undefined}><Icon name={ico} size={20}/><span>{label}</span></button>)}<div className="nav-divider"/>{secondary.map(([id,label,ico])=><button type="button" key={id} className={'nav-item '+(active===id?'active':'')} onClick={()=>go({type:id})} title={collapsed?label:undefined}><Icon name={ico} size={20}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><button type="button" className={'profile-row '+(profileOpen?'open':'')} onClick={()=>setProfileOpen(v=>!v)}><span className="avatar">A</span><span className="profile-name"><strong>{session?.name||'Ayesha'}</strong><small>Account</small></span><Icon name="chevronDown" size={16}/></button>{profileOpen&&<div className="sidebar-profile-menu"><button type="button" onClick={()=>go({type:'settings'})}><Icon name="settings" size={17}/>Account settings</button><button type="button" onClick={()=>go({type:'help'})}><Icon name="help" size={17}/>Help &amp; Support</button><button type="button" onClick={onLogout} className="menu-logout"><Icon name="logout" size={17}/>Log out</button></div>}<button type="button" className="logout-row" onClick={onLogout}><Icon name="logout" size={20}/><span>Log out</span></button></div></aside>}
function Topbar({context,mobileOpen,setMobileOpen,notificationsOpen,setNotificationsOpen,profileOpen,setProfileOpen,go,onLogout,session}){return <header className="topbar"><div className="topbar-left"><button type="button" className="mobile-header-menu" onClick={()=>setMobileOpen(v=>!v)} aria-label="Navigation"><Icon name="menu" size={20}/></button><span className="topbar-context">{context}</span></div><div className="topbar-right"><div className="notification-wrap"><button type="button" className={'top-icon-button '+(notificationsOpen?'is-open':'')} onClick={()=>setNotificationsOpen(v=>!v)} aria-label="Notifications"><Icon name="bell" size={22}/><i className="notification-dot"/></button>{notificationsOpen&&<div className="notification-menu"><strong>Notifications</strong><p>You’re all caught up.</p><small>New activity will appear here.</small></div>}</div><span className="top-divider"/><div className="top-profile-wrap"><button type="button" className={'top-profile '+(profileOpen?'is-open':'')} onClick={()=>setProfileOpen(v=>!v)}><span className="avatar">A</span><span>{session?.name||'Ayesha'}</span><Icon name="chevronDown" size={15}/></button>{profileOpen&&<div className="top-profile-menu"><button type="button" onClick={()=>go({type:'settings'})}><Icon name="settings" size={17}/>Account settings</button><button type="button" onClick={()=>go({type:'help'})}><Icon name="help" size={17}/>Help &amp; Support</button><button type="button" onClick={onLogout} className="menu-logout"><Icon name="logout" size={17}/>Log out</button></div>}</div></div></header>}




/* Restored shared components that were missing in v32. */
function ChatMessage({message}){const m=message||{};if(m.role==='assistant')return <div className="message-row assistant-message"><span className="mini-avatar sat">S</span><div className="assistant-bubble"><small className="assistant-meta">SatQuery AI · {m.createdAt||'Now'}</small><p>{String(m.answer||'')}</p></div></div>;const imgs=Array.isArray(m.images)?m.images.filter(x=>x&&x.src):[];return <div className="message-row user-message"><div className="user-bubble">{imgs.length>0&&<div className={'message-image-grid '+(imgs.length>1?'pair':'')}>{imgs.map((im,i)=><div className="message-image-card" key={i}><img src={im.src} alt=""/><span>{im.name||'Satellite observation'}</span></div>)}</div>}<p>{String(m.question||'')}</p><small>{String(m.createdAt||'Now')}</small></div><span className="mini-avatar">A</span></div>}

function WorkspacesPage({workspaces,search,setSearch,onOpen,onCreate,onDelete}){const list=useMemo(()=>{const q=String(search||'').toLowerCase();return workspaces.filter(w=>(w.title+' '+w.region+' '+w.tags.join(' ')).toLowerCase().includes(q))},[workspaces,search]);return <section className="section-page workspaces-page"><div className="section-heading"><div><span className="eyebrow eyebrow-muted">YOUR PROJECTS</span><h1>Workspaces</h1><p>Organize your images, analyses and results in one place.</p></div><div className="heading-actions"><div className="search-field"><Icon name="search" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workspaces…"/></div><button type="button" className="primary-button" onClick={onCreate}><Icon name="plus" size={18}/>New workspace</button></div></div><div className="workspace-grid">{list.map(w=><WorkspaceCard key={w.id} w={w} onOpen={onOpen} onDelete={onDelete}/>)}</div>{!list.length&&<EmptyPanel icon="search" title="No workspaces found" text="Try a different title, region or tag."/>}</section>}

function WorkspaceCard({w,onOpen,onDelete}){const [menu,setMenu]=useState(false);return <article className="workspace-card-v2" onClick={()=>onOpen(w.id)}><div className="workspace-cover"><img src={w.cover} alt=""/><span className="workspace-region">{w.region}</span><button type="button" className="card-more" onClick={e=>{e.stopPropagation();setMenu(v=>!v)}}><Icon name="more" size={19}/></button>{menu&&<div className="card-menu" onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>onOpen(w.id)}>Open workspace</button><button type="button" onClick={()=>onDelete(w.id)}>Delete workspace</button></div>}</div><div className="workspace-card-main"><h3>{w.title}</h3><p>{w.subtitle}</p><div className="workspace-meta"><span>{w.analysisCount} analyses</span><span>Updated {w.updatedLabel}</span></div><button type="button" className="workspace-card-chat" onClick={e=>{e.stopPropagation();onOpen(w.id)}}><Icon name="message" size={15}/>Continue chat</button><div className="thumbnail-row">{w.images.slice(0,2).map(im=><img key={im.id} src={im.src} alt=""/>)}{w.imageCount>2&&<span>+{w.imageCount-2}</span>}</div></div></article>}

function AnalyzeMessage({message,onDownloadReport}){
  const m=message||{};
  if(m.role==='assistant') return <div className="message-row assistant-message"><span className="mini-avatar sat">S</span><div className="assistant-bubble"><small className="assistant-meta">SatQuery AI · {m.createdAt||'Now'}</small><p>{String(m.answer||'')}</p>{m.visualEvidence?.required&&<div className="analyze-evidence-result"><div className="analyze-evidence-head"><div><span className="eyebrow eyebrow-muted">VISUAL EVIDENCE</span><h4>{m.visualEvidence.status==='completed'?'Grounded visual result':'Visual evidence not available'}</h4></div><span className={`evidence-state ${m.visualEvidence.status==='completed'?'done':'error'}`}>{m.visualEvidence.status==='completed'?'COMPLETE':'UNAVAILABLE'}</span></div>{m.visualEvidence.status==='completed'&&m.visualEvidence.imageUrl?<img src={m.visualEvidence.imageUrl} alt={`Visual evidence for ${m.visualEvidence.target||'requested target'}`} className="analyze-evidence-image"/>:<p className="analyze-evidence-empty">Visual evidence could not be generated.</p>}{m.visualEvidence.status==='completed'&&<div className="analyze-evidence-meta"><span><b>Target</b>{m.visualEvidence.target||'Not specified'}</span><span><b>Evidence type</b>{m.visualEvidence.evidenceType||'Grounded region / segmentation'}</span><span><b>Source</b>Visual Grounding &amp; Segmentation Specialist</span><span><b>Implementation</b>Florence-2</span><span><b>Confidence</b>Not provided</span></div>}{m.visualEvidence.status!=='completed'&&<div className="analyze-evidence-meta"><span><b>Source</b>Florence-2 public Gradio Space</span><span><b>Status</b>Visual evidence could not be generated.</span></div>}</div>}{m.reportData&&<div className="analyze-result-actions"><span className="report-ready-label"><Icon name="check" size={14}/>Analysis report ready</span><button type="button" className="primary-button analyze-report-button" onClick={()=>onDownloadReport?.(m.reportData)}><Icon name="download" size={17}/>Download Analysis Report</button></div>}</div></div>;
  if(m.role==='error') return <div className="message-row assistant-message"><span className="mini-avatar sat error">!</span><div className="assistant-bubble assistant-error-bubble"><small className="assistant-meta">SatQuery AI · {m.createdAt||'Now'}</small><p>{String(m.answer||'Analysis could not be completed.')}</p>{m.visualEvidence?.required&&m.visualEvidence?.status==='completed'&&m.visualEvidence.imageUrl&&<div className="analyze-evidence-result"><div className="analyze-evidence-head"><div><span className="eyebrow eyebrow-muted">VISUAL EVIDENCE</span><h4>Grounded visual result</h4></div><span className="evidence-state done">COMPLETE</span></div><img src={m.visualEvidence.imageUrl} alt="Returned visual evidence" className="analyze-evidence-image"/></div>}{m.technicalError&&<details className="analysis-error-details"><summary>Technical details</summary><code>{String(m.technicalError)}</code></details>}</div></div>;
  const imgs=Array.isArray(m.images)?m.images.filter(x=>x&&x.src):[];
  return <div className="message-row user-message"><div className="user-bubble">{imgs.length>0&&<div className={'message-image-grid analyze-message-grid '+(imgs.length>1?'pair':'')}>{imgs.map((im,i)=><div className="message-image-card" key={`${m.id}-${i}`}>{analyzeIsImagePreview(im.src)?<img src={im.src} alt={im.name||'Satellite observation'}/>:<div className="message-file-card"><Icon name="file" size={18}/><span>{im.name||'Satellite file'}</span></div>}<span>{im.name||'Satellite observation'}</span></div>)}</div>}<p>{String(m.question||'')}</p><small>{String(m.createdAt||'Now')}</small></div><span className="mini-avatar">A</span></div>;
}

function PipelineSpinner(){return <span className="pipeline-spinner" aria-hidden="true"/>}
function AnalyzePipelineCard({pipeline,onToggle}){
  if(!pipeline)return null;
  const running=!!pipeline.running;
  const error=!!pipeline.errorType;
  const title=error?pipeline.errorMessage||'Analysis encountered an error':running?'Processing observation':'Analysis complete';
  const badge=error?'ERROR':running?'LIVE':'COMPLETE';
  const profile=pipeline.profile||{};
  const stages=pipeline.stages||[];
  const hasMulti=Number(profile.count)>1;
  const statusLabel=status=>status==='active'?'LIVE':status==='done'?'COMPLETE':status==='error'?'ERROR':status==='not-required'?'NOT REQUIRED':status==='not-connected'?'NOT CONNECTED':status==='not-selected'?'NOT SELECTED':'PENDING';
  return <article className={`analysis-pipeline-card ${running?'is-running':''} ${error?'has-error':''}`}>
    <div className="pipeline-head">
      <div><span className="pipeline-kicker">EXECUTION PIPELINE</span><div className="pipeline-title-row"><h3>{title}</h3><span className={`pipeline-status ${error?'error':running?'live':'complete'}`}>{error?'!':running?'●':'✓'} {badge}</span></div><p>{profile.context||'Satellite observation'}</p></div>
      <button type="button" className="pipeline-details-toggle" onClick={()=>onToggle?.(pipeline.id)} aria-expanded={!!pipeline.expanded}>{pipeline.expanded?'Hide execution details':'View execution details'} <Icon name={pipeline.expanded?'chevronUp':'chevronDown'} size={15}/></button>
    </div>
    <div className="pipeline-track-wrap"><div className="pipeline-track" role="list" aria-label="Execution stages">{stages.map((stage,index)=>{const prev=stages[index-1];const connectorDone=prev?.status==='done';return <React.Fragment key={stage.id}><div className={`pipeline-step ${stage.status}`} role="listitem"><div className="pipeline-marker">{stage.status==='active'?<PipelineSpinner/>:stage.status==='done'?<Icon name="check" size={13}/>:stage.status==='error'?<span>!</span>:stage.status==='not-required'?<span className="pipeline-muted-mark">—</span>:stage.status==='not-connected'?<span className="pipeline-muted-mark">×</span>:<span/>}</div><div className="pipeline-step-copy"><strong>{stage.label}</strong><span>{statusLabel(stage.status)}</span><small>{stage.detail}</small></div></div>{index<stages.length-1&&<div className={`pipeline-connector ${connectorDone?'done':''}`} aria-hidden="true"/>}</React.Fragment>})}</div></div>
    {running&&<div className="analysis-live-processing"><span className="mini-avatar sat">S</span><div><strong>SatQuery AI</strong><p>Analyzing the observation<span className="typing-dots"><i/> <i/> <i/></span></p></div></div>}
    {error&&pipeline.technicalError&&<details className="pipeline-error-box"><summary>Technical details</summary><code>{String(pipeline.technicalError)}</code></details>}
    {pipeline.expanded&&<div className="pipeline-details-panel">
      <section><div className="pipeline-detail-heading"><span>01</span><div><strong>INPUT</strong><small>Actual file information received from the browser.</small></div></div><div className="pipeline-source-list">{(profile.sources||[]).map((src,i)=><div className="pipeline-source-row" key={`${src.name}-${i}`}><div>{analyzeIsImagePreview(src.preview)?<img src={src.preview} alt=""/>:<span className="pipeline-file-icon"><Icon name="file" size={17}/></span>}</div><div><strong>{src.name}</strong><span>{src.format} · {src.sizeLabel}</span><small>{src.dimensionsLabel}</small></div></div>)}</div></section>
      <section><div className="pipeline-detail-heading"><span>02</span><div><strong>OBSERVATION PROFILE</strong><small>Only information actually available in the uploaded files is shown as real data.</small></div></div><div className="pipeline-fact-grid"><div><span>Image count</span><strong>{profile.count}</strong></div><div><span>Primary format</span><strong>{profile.sources?.[0]?.format||'Not available'}</strong></div><div><span>Pixel dimensions</span><strong>{profile.sources?.[0]?.dimensionsLabel||'Not available in uploaded file'}</strong></div><div><span>GeoTIFF metadata</span><strong>{profile.sources?.[0]?.isTiff?'Inspection not connected':'Not available in uploaded file'}</strong></div></div></section>
      <section><div className="pipeline-detail-heading"><span>03</span><div><strong>ROUTING</strong><small>Target inferred from image count, question and available file characteristics.</small></div></div><div className="pipeline-routing-callout"><strong>{profile.targetType}</strong><p>{profile.routeWhy}</p>{hasMulti&&<span>Co-registration: {profile.coreg}</span>}</div></section>
      <section><div className="pipeline-detail-heading"><span>04</span><div><strong>PREPARATION</strong><small>Observation preparation and validation state.</small></div></div><div className="pipeline-prep-list"><div><span className="pipeline-real-tag">REAL</span><p>Browser file inspection and preview preparation.</p></div><div><span className="pipeline-prototype-tag">PROTOTYPE PREPARATION</span><p>Normalization and geospatial preprocessing remain part of the future processing layer.</p></div><div><span className="pipeline-prototype-tag">VALIDATION</span><p>{profile.coreg}</p></div></div></section>
      <section><div className="pipeline-detail-heading"><span>05</span><div><strong>MODEL PREPARATION / TILING</strong><small>Presentation of the preparation strategy; exact raster tiling is not claimed.</small></div></div><div className="pipeline-tile-plans">{(profile.sources||[]).map((src,i)=>{const plan=profile.tilePlans?.[i];if(!plan)return null;const dots=analyzeTileDots(plan);return <div className="pipeline-tile-plan" key={`${src.name}-tiles`}><div className="pipeline-tile-head"><strong>{src.name}</strong><span>Prototype</span></div><div className="pipeline-tile-visual" style={{'--tile-cols':plan.previewCols,'--tile-rows':plan.previewRows}}>{dots.map((on,j)=><i className={on?'hot':''} key={j}/>)}</div><p>{plan.label}. Preview pattern is derived from this observation's available file characteristics; actual tile count and geospatial windowing are not available in the frontend.</p></div>})}</div><div className="pipeline-prep-substeps"><span>Preparing model input</span><span>Checking observation bounds</span><span>Preparing visual windows</span><span>Assembling model-ready observation</span></div></section>
      <section><div className="pipeline-detail-heading"><span>06–08</span><div><strong>EXECUTION BRANCHES</strong><small>Independent branch status — these operations do not wait on one another.</small></div></div><div className="pipeline-branch-grid"><div className={`pipeline-branch-card ${pipeline.coreModel?.status||'pending'}`}><div><span className="branch-marker">{pipeline.coreModel?.status==='done'?'✓':pipeline.coreModel?.status==='error'?'!':pipeline.coreModel?.status==='pending'?'•':'◌'}</span><strong>Core Remote-Sensing VLM</strong></div><p>Implementation: Phase-1 adapted Qwen3-VL</p><small>{pipeline.coreModel?.status==='done'?(pipeline.coreModel?.latency!=null?`Actual request latency: ${pipeline.coreModel.latency} ms.`:'Completed.'):(pipeline.coreModel?.status==='error'?'Core Remote-Sensing VLM inference failed.':'Live model request in progress.')}</small></div><div className={`pipeline-branch-card ${pipeline.visualEvidence?.status||'not-required'}`}><div><span className="branch-marker">{pipeline.visualEvidence?.status==='done'?'✓':pipeline.visualEvidence?.status==='error'?'!':pipeline.visualEvidence?.status==='not-required'?'—':'◌'}</span><strong>Visual Grounding &amp; Segmentation Specialist</strong></div><p>Implementation: Florence-2 public Gradio Space</p><small>{pipeline.visualEvidence?.status==='not-required'?'Not required for this query.':pipeline.visualEvidence?.status==='done'?'Visual evidence returned.':pipeline.visualEvidence?.status==='error'?'Visual evidence could not be generated.':'Live evidence request in progress.'}</small></div><div className={`pipeline-branch-card ${pipeline.specialistExecution?.status||'not-selected'}`}><div><span className="branch-marker">{pipeline.specialistExecution?.status==='not-connected'?'×':pipeline.specialistExecution?.status==='selected'?'◌':'—'}</span><strong>{pipeline.specialistExecution?.label||'Specialist Analysis'}</strong></div><p>{pipeline.specialistExecution?.status==='not-connected'?'Dedicated specialist not connected.':'No dedicated specialist selected.'}</p><small>{pipeline.specialistExecution?.detail||''}</small></div></div></section>
      <section><div className="pipeline-detail-heading"><span>09</span><div><strong>EVIDENCE / RESULT ASSEMBLY</strong><small>Independent branch results are combined without masking either branch's status.</small></div></div><div className="pipeline-result-note"><Icon name={pipeline.running?'spark':'check'} size={16}/><span>{pipeline.running?'Waiting for the selected execution branches to settle.':'Result assembly complete.'}</span></div></section>
      <p className="pipeline-footnote">Live model inference is connected to the running Phase-1 Qwen3-VL endpoint. Visual evidence uses the public Florence-2 Gradio Space when selected. Raster/geospatial preparation values shown here are prototype metadata and are not represented as measured remote-sensing processing.</p>
    </div>}
  </article>
}

function AnalyzeReportPrintView({report}){
  if(!report)return null;
  const workspaceName='Analyze workspace';
  const sections=[['summary','Executive Summary'],['input','Input Data'],['method','Methodology'],['results','Analysis Results'],['detail','Detailed Analysis'],['impact','Validation & Evidence'],['conclusion','Conclusion & Limitations']];
  const sourceImages=(report.observations||[]).filter(x=>x?.preview||x?.src);
  const routeLines=report.routeWhy?[report.route,report.routeWhy]:[report.route];
  return <section className="analyze-report-print-view report-detail-page">
    <div className="report-breadcrumb"><strong>SatQuery AI</strong><span>/</span><strong>{report.printTitle||'Satellite Analysis Report'}</strong></div>
    <div className="report-hero"><img src={sourceImages[0]?.preview||sourceImages[0]?.src||A+'flood-card_up_clean.jpg'} alt=""/><div className="report-hero-overlay"><div><span className="report-kicker">SATQUERY AI REPORT</span><h1>{report.printTitle||'Satellite Analysis Report'}</h1><p>{report.route||'Satellite analysis'} · {report.completedAt||report.createdAt}</p><div className="report-hero-meta"><span><Icon name="file" size={16}/> {report.observationCount} observation{report.observationCount===1?'':'s'}</span><span><Icon name="calendar" size={16}/> {report.completedAt||report.createdAt}</span><span>{workspaceName}</span></div></div><div className="report-hero-actions"><span className="light-button"><Icon name="download" size={17}/>Save as PDF from Print</span></div></div></div>
    <div className="report-tabbar">{sections.slice(0,6).map(([id,label])=><button type="button" key={id}>{label}</button>)}</div>
    <div className="report-body-grid"><div className="report-content">
      <section id="report-summary" className="report-section"><div className="report-section-title"><span>01</span><div><h2>Executive Summary</h2><p>Current Analyze conversation and execution context.</p></div></div><p className="lead-copy"><strong>Question:</strong> {report.question}</p><p className="body-copy"><strong>Analysis route:</strong> {routeLines.join(' — ')}.</p><div className="metric-grid"><div className="metric-card"><strong>{report.observationCount}</strong><span>Observations</span><small>Current Analyze request</small></div><div className="metric-card"><strong>{report.coreModel?.latency!=null?`${report.coreModel.latency} ms`:'Not measured'}</strong><span>Core VLM latency</span><small>Actual request latency</small></div><div className="metric-card"><strong>{report.visualEvidence?.status==='completed'?'Returned':report.visualEvidence?.required?'Unavailable':'Not required'}</strong><span>Visual evidence</span><small>Florence-2 branch</small></div><div className="metric-card"><strong>{report.route}</strong><span>Analysis route</span><small>Selected from the current query</small></div></div></section>
      <section id="report-input" className="report-section"><div className="report-section-title"><span>02</span><div><h2>Input Data</h2><p>Current uploaded observations and browser-visible file facts.</p></div></div><div className="report-input-layout"><div className="report-input-images">{(report.observations||[]).map((im,i)=><figure key={i}>{im.preview?<img src={im.preview} alt=""/>:<div className="pipeline-file-icon" style={{width:'100%',height:'150px'}}><Icon name="file" size={30}/></div>}<figcaption><strong>{im.name}</strong><span>{im.format||im.type||'File'} · {im.sizeLabel}</span><span>{im.dimensionsLabel||'Not available in uploaded file'}</span></figcaption></figure>)}</div><aside className="report-data-card"><h3>Input Details</h3><dl>{(report.observations||[]).slice(0,5).map((im,i)=><div key={i}><dt>{im.name}</dt><dd>{im.type||'Not available'} · {im.sizeLabel} · {im.dimensionsLabel||'Not available in uploaded file'}</dd></div>)}</dl><div style={{marginTop:'12px',color:'#65758a',fontSize:'12px'}}>GeoTIFF metadata: {report.observations?.some(x=>x.isTiff)?'Not decoded':'Not available in uploaded file'}</div></aside></div></section>
      <section id="report-method" className="report-section"><div className="report-section-title"><span>03</span><div><h2>Methodology</h2><p>Execution route and branch orchestration.</p></div></div><div className="method-row"><div className="method-step"><span>01</span><strong>Input inspection</strong><p>Read actual browser-visible file characteristics and image dimensions when the file decoder can provide them.</p></div><div className="method-step"><span>02</span><strong>Query routing</strong><p>{report.routeWhy}</p></div><div className="method-step"><span>03</span><strong>Independent branches</strong><p>Core Remote-Sensing VLM and visual evidence branches run independently when selected.</p></div><div className="method-step"><span>04</span><strong>Result assembly</strong><p>Branch outputs and validation state are combined without masking individual failures.</p></div></div></section>
      <section id="report-results" className="report-section"><div className="report-section-title"><span>04</span><div><h2>Analysis Results</h2><p>Execution trace for the current conversation.</p></div></div><div className="detail-analysis-card"><div className="pipeline-print-stage-list">{(report.stages||[]).map((s,i)=><div className="pipeline-print-stage" key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s.label}</strong><small>{String(s.status||'pending').toUpperCase()}</small><p>{s.detail}</p></div></div>)}</div></div></section>
      <section id="report-detail" className="report-section"><div className="report-section-title"><span>05</span><div><h2>Detailed Analysis</h2><p>Core model and execution branches.</p></div></div><div className="result-grid"><div className="result-visual"><h3>Core Remote-Sensing VLM</h3><p className="body-copy">Implementation: {report.coreModel?.implementation||'Phase-1 adapted Qwen3-VL'}</p><p className="body-copy">Status: {report.coreModel?.status||'Not available'}</p><p className="body-copy">Request scope: {report.coreModel?.requestScope||'Not available'}</p><p className="body-copy">Actual latency: {report.coreModel?.latency!=null?`${report.coreModel.latency} ms`:'Not measured'}</p></div><div className="result-table"><h3>Specialist branches</h3><table><thead><tr><th>Branch</th><th>Status</th><th>Detail</th></tr></thead><tbody><tr><td>Visual Grounding &amp; Segmentation Specialist</td><td>{report.visualEvidence?.status||'Not required'}</td><td>{report.visualEvidence?.required?'Florence-2 public Gradio Space':'Not required for this query.'}</td></tr><tr><td>{report.specialist?.label||'Specialist Analysis'}</td><td>{report.specialist?.status||'Not selected'}</td><td>{report.specialist?.detail||'No dedicated specialist selected.'}</td></tr></tbody></table></div></div></section>
      <section id="report-impact" className="report-section"><div className="report-section-title"><span>06</span><div><h2>Validation &amp; Evidence</h2><p>Only actual validation/evidence returned by the current frontend is shown.</p></div></div>{report.visualEvidence?.required&&report.visualEvidence?.imageUrl?<div className="detail-analysis-card"><img src={report.visualEvidence.imageUrl} alt="Returned visual evidence" style={{width:'100%',maxHeight:'520px',objectFit:'contain',borderRadius:'10px',display:'block'}}/><div className="detail-evidence-grid"><div><strong>Target</strong><p>{report.visualEvidence.target||'Not specified'}</p></div><div><strong>Evidence type</strong><p>{report.visualEvidence.evidenceType||'Grounded region / segmentation'}</p></div><div><strong>Evidence source</strong><p>Visual Grounding &amp; Segmentation Specialist · Florence-2</p></div><div><strong>Confidence</strong><p>Not provided</p></div></div></div>:<div className="detail-analysis-card"><p className="body-copy">{report.visualEvidence?.required?'Visual evidence could not be generated.':'Visual evidence not required for this query.'}</p></div>}<div className="report-data-card" style={{marginTop:'14px'}}><dl><div><dt>Co-registration</dt><dd>{report.validation?.coregistration||'Not verified'}</dd></div><div><dt>Metadata</dt><dd>{report.validation?.metadata||'Not available'}</dd></div><div><dt>Visual evidence</dt><dd>{report.validation?.visualEvidence||'Not available'}</dd></div></dl></div></section>
      <section id="report-conclusion" className="report-section"><div className="report-section-title"><span>07</span><div><h2>Conclusion &amp; Limitations</h2><p>Actual answer returned by the current model.</p></div></div><div className="detail-analysis-card"><p className="lead-copy">{report.answer}</p>{report.limitations?.length?<div className="recommendation-list">{report.limitations.map(x=><div key={x}><Icon name="alert" size={17}/>{x}</div>)}</div>:<p className="body-copy">No additional limitations were recorded for this analysis.</p>}</div></section>
      <section className="report-source-note"><strong>Model and evidence provenance</strong><p>Core model: Phase-1 adapted Qwen3-VL. Visual evidence, when selected: Florence-2 public Gradio Space. All image/file facts in this report come from the current Analyze conversation.</p></section>
    </div><aside className="report-outline"><h3>Report Contents</h3>{sections.map(([id,label],i)=><button type="button" key={id}><span>{String(i+1).padStart(2,'0')}</span>{label}</button>)}</aside></div>
  </section>;
}

function AnalyzePage({messages,pipeline,draft,pending,attachOpen,setDraft,setAttachOpen,onSend,onPick,onRemovePending,fileRef,onClear,onTogglePipeline}){
  const end=useRef(null);
  const [printReport,setPrintReport]=useState(null);
  useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages.length,pipeline?.id,pipeline?.expanded]);
  useEffect(()=>{
    const handler=()=>{document.body.classList.remove('analyze-printing');setPrintReport(null)};
    window.addEventListener('afterprint',handler);
    return()=>window.removeEventListener('afterprint',handler);
  },[]);
  const beginPrint=(report)=>{
    if(!report)return;
    setPrintReport(report);
    window.requestAnimationFrame(()=>{
      document.body.classList.add('analyze-printing');
      const printImages=Array.from(document.querySelectorAll('.analyze-report-print-view img'));
      const imageReady=Promise.all(printImages.map(img=>{
        if(img.complete)return Promise.resolve();
        return new Promise(resolve=>{
          const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve()};
          img.addEventListener('load',done,{once:true});
          img.addEventListener('error',done,{once:true});
        });
      }));
      const fontsReady=document.fonts?.ready||Promise.resolve();
      Promise.all([imageReady,fontsReady]).finally(()=>window.setTimeout(()=>window.print(),120));
    });
  };
  const send=()=>onSend(draft,pending);
  const hasConversation=messages.length>0;
  const hasRunning=!!pipeline?.running;
  return <section className="analyze-page">
    <div className="page-intro analyze-intro"><span className="eyebrow">ANALYZE</span><h1>Ask the Earth.<br/><em>Understand the evidence.</em></h1><p>Upload imagery and ask a question in plain language. SatQuery routes the request toward the evidence and specialist tools it needs.</p></div>
    <div className={`examples-header ${hasConversation?'examples-header-compact':''}`}><div><span className="eyebrow eyebrow-muted">{hasConversation?'TRY ANOTHER EXAMPLE':'START WITH AN EXAMPLE'}</span><h2>Real satellite questions.</h2></div><span>Click a card to send it into the chat.</span></div>
    <div className={`example-grid ${hasConversation?'example-grid-compact':''}`}>{examples.map(ex=><button type="button" key={ex.id} className="example-card" disabled={hasRunning} onClick={()=>onSend(ex.title,ex.images.map((src,i)=>({src,name:ex.labels[i]})),ANALYZE_EXAMPLE_HINTS[ex.id])}><div className="example-media">{ex.images.map((src,i)=><img src={src} key={src+i} alt="Satellite example"/>)}</div><div className="example-copy"><div className="example-title"><span className="example-icon"><Icon name={ex.id==='water'?'droplets':ex.id==='built'?'map':ex.id==='sar'?'layers':'spark'} size={17}/></span><strong>{ex.title}</strong></div><small>{ex.meta}</small></div></button>)}</div>
    {hasConversation&&<div className="active-analysis-head"><div><span className="eyebrow eyebrow-muted">ACTIVE ANALYSIS</span><h2>Your satellite conversation</h2></div><button type="button" className="subtle-button" onClick={onClear} disabled={hasRunning}><Icon name="x" size={15}/>Clear chat</button></div>}
    <div className="chat-shell"><div className="chat-messages">{!hasConversation?<div className="chat-empty"><span className="empty-mark"><Icon name="spark" size={22}/></span><h3>Ask anything about your imagery</h3><p>Upload a satellite image, choose an example, or type a question below.</p></div>:messages.map(m=><React.Fragment key={m.id}><AnalyzeMessage message={m} onDownloadReport={beginPrint}/>{m.pipeline&&<AnalyzePipelineCard pipeline={m.pipeline} onToggle={onTogglePipeline}/>}</React.Fragment>)}{pipeline&&<AnalyzePipelineCard pipeline={pipeline} onToggle={onTogglePipeline}/>}<div ref={end}/></div>
      {pending.length>0&&<div className="pending-strip">{pending.map((p,i)=><div className="pending-image" key={p.id||p.name+i}>{analyzeIsImagePreview(p.src)?<img src={p.src} alt="Selected satellite"/>:<span className="pending-file-icon"><Icon name="file" size={15}/></span>}<span>{p.name}</span><button type="button" onClick={()=>onRemovePending?.(p.id)} aria-label={`Remove ${p.name}`}>×</button></div>)}</div>}
      <div className="composer"><div className="composer-main"><button type="button" className="composer-plus" aria-label="Add imagery" disabled={hasRunning} onClick={()=>setAttachOpen(v=>!v)}><Icon name="plus" size={20}/></button><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ask a question about your imagery…" rows={1} disabled={hasRunning} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button type="button" className="composer-upload" disabled={hasRunning} onClick={()=>fileRef.current?.click()}><Icon name="image" size={17}/>Upload</button><button type="button" className="composer-send" disabled={hasRunning||(!draft.trim()&&!pending.length)} onClick={send} aria-label="Send"><Icon name="send" size={18}/></button><input ref={fileRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff" onChange={e=>{onPick(e.target.files);e.currentTarget.value=''}}/></div>{attachOpen&&<div className="composer-plus-menu"><button type="button" onClick={()=>{setAttachOpen(false);fileRef.current?.click()}}><Icon name="upload" size={17}/>Upload images</button><button type="button" disabled><Icon name="folder" size={17}/>Choose from workspace</button></div>}</div>
    </div>
    {printReport&&<AnalyzeReportPrintView report={printReport}/>} 
  </section>
}

function WorkspaceDetailPage({workspace,tab,setTab,analyses,reports,onBack,onNewAnalysis,onOpenAnalysis,onEdit,onDelete,onAddImage,onOpenReport,onDownloadReport}){const fileRef=useRef(null);if(!workspace)return <section className="section-page"><EmptyPanel title="Workspace not found" text="Return to Workspaces." buttonLabel="Back to Workspaces" onButton={onBack}/></section>;return <section className="section-page workspace-detail-page"><div className="breadcrumb"><button type="button" onClick={onBack}><Icon name="chevronLeft" size={17}/>Workspaces</button><span>/</span><strong>{workspace.title}</strong></div><div className="workspace-detail-head"><div className="detail-cover"><img src={workspace.cover} alt=""/><button type="button" onClick={onEdit}><Icon name="edit" size={17}/></button></div><div className="detail-title"><div className="detail-title-row"><div><span className="eyebrow eyebrow-muted">WORKSPACE</span><h1>{workspace.title}</h1><p>{workspace.subtitle}</p></div><div className="detail-actions"><button type="button" className="icon-action" onClick={onEdit}><Icon name="edit" size={18}/></button><button type="button" className="primary-button" onClick={onNewAnalysis}><Icon name="plus" size={18}/>New analysis</button></div></div><div className="tag-row">{workspace.tags.map(t=><span key={t}>{t}</span>)}</div><div className="detail-facts"><span><Icon name="clock" size={17}/>Created {workspace.created}</span><span><Icon name="image" size={17}/>{workspace.imageCount} images</span><span><Icon name="message" size={17}/>{workspace.analysisCount} analyses</span></div></div></div><div className="workspace-tabs">{[['analyses','Analyses'],['images','Images'],['reports','Reports']].map(([id,label])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='analyses'&&<div className="workspace-detail-layout"><div className="analysis-list-card">{analyses.map(a=><button type="button" key={a.id} className="analysis-row" onClick={()=>onOpenAnalysis(a.id)}><img src={a.image} alt=""/><span className="analysis-row-copy"><strong>{a.q}</strong><small>{a.sub}</small></span><span className="analysis-row-date">{a.date}</span><Icon name="chevronRight" size={18}/></button>)}{!analyses.length&&<EmptyPanel title="Start your first analysis" text="Upload imagery and ask a question to build this workspace." buttonLabel="New analysis" onButton={onNewAnalysis}/>}</div><aside className="workspace-side"><InfoCard title={`Workspace images (${workspace.imageCount})`} action="View all" onAction={()=>setTab('images')}>{workspace.images.length?<div className="mini-gallery">{workspace.images.slice(0,3).map(im=><div key={im.id}><img src={im.src} alt=""/><strong>{im.title}</strong><small>{im.date}</small></div>)}</div>:<div className="mini-empty">No images yet</div>}<button type="button" className="dashed-button" onClick={()=>fileRef.current?.click()}><Icon name="image" size={17}/>Upload more images</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>{onAddImage(e.target.files?.[0]);e.currentTarget.value=''}}/></InfoCard><InfoCard title="Recent report" action="View all" onAction={()=>setTab('reports')}>{reports.length?<button type="button" className="report-preview" onClick={()=>onOpenReport(reports[0].id)}><span className="row-icon"><Icon name="file" size={17}/></span><span><strong>{reports[0].title}</strong><small>Generated {reports[0].generatedAt}</small></span><Icon name="download" size={18}/></button>:<div className="mini-empty">No reports yet</div>}</InfoCard><InfoCard title="Workspace details"><dl className="details-list"><div><dt><Icon name="folder" size={17}/>Name</dt><dd>{workspace.title}</dd></div><div><dt><Icon name="paper" size={17}/>Description</dt><dd>{workspace.subtitle}</dd></div><div><dt><Icon name="layers" size={17}/>Tags</dt><dd className="tag-row">{workspace.tags.map(t=><span key={t}>{t}</span>)}</dd></div><div><dt><Icon name="clock" size={17}/>Created</dt><dd>{workspace.created}</dd></div><div><dt><Icon name="clock" size={17}/>Last activity</dt><dd>{workspace.updated}</dd></div></dl><button type="button" className="text-button danger-text" onClick={onDelete}>Delete workspace</button></InfoCard></aside></div>}{tab==='images'&&<div className="image-tab-grid">{workspace.images.map(im=><article className="image-card-large" key={im.id}><img src={im.src} alt=""/><div><strong>{im.title}</strong><span>{im.modality} · {im.date}</span></div></article>)}<button type="button" className="image-card-add" onClick={()=>fileRef.current?.click()}><Icon name="plus" size={22}/><strong>Add images</strong><span>Upload from your device</span></button><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>{onAddImage(e.target.files?.[0]);e.currentTarget.value=''}}/></div>}{tab==='reports'&&<div className="reports-grid">{reports.map(r=><article className="report-card" key={r.id}><div><span className="row-icon"><Icon name="file" size={18}/></span><div><strong>{r.title}</strong><p>{r.question}</p><small>Generated {r.generatedAt}</small></div></div><button type="button" className="icon-action" onClick={()=>onDownloadReport(r)}><Icon name="download" size={18}/></button></article>)}</div>}</section>}
function InfoCard({title,action,onAction,children}){return <div className="info-card"><div className="info-card-head"><h3>{title}</h3>{action&&<button type="button" onClick={onAction}>{action}</button>}</div>{children}</div>}

function WorkspaceAnalysisPage({workspace,state,setState,onBack,onSend,onOpenAnalysis,onPick,fileRef,onTab,tab,analyses,reports,onOpenReport,onDownloadReport}){if(!workspace)return <section className="section-page"><EmptyPanel title="Workspace not found" text="Return to Workspaces." buttonLabel="Back" onButton={onBack}/></section>;const send=()=>onSend();const chooser=state.chooser;const pick=(files)=>onPick(files);return <section className="section-page new-analysis-page"><div className="breadcrumb"><button type="button" onClick={onBack}><Icon name="chevronLeft" size={17}/>Workspaces</button><span>/</span><button type="button" onClick={onBack}>{workspace.title}</button><span>/</span><strong>New analysis</strong></div><div className="analysis-workspace-head"><div className="analysis-workspace-name"><img src={workspace.cover} alt=""/><div><span className="eyebrow eyebrow-muted">WORKSPACE</span><h1>{workspace.title}</h1><div className="tag-row">{workspace.tags.slice(0,4).map(t=><span key={t}>{t}</span>)}</div></div></div><button type="button" className="secondary-button" onClick={onBack}><Icon name="chevronLeft" size={16}/>Back to workspace</button></div><div className="workspace-tabs">{[['new','New analysis'],['images','Images'],['analyses','Analyses'],['reports','Reports']].map(([id,label])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>onTab(id)}>{label}</button>)}</div>{tab==='new'&&<div className="analysis-chat-card">{state.messages.length===0?<div className="analysis-chat-empty"><div className="image-stack"><img src={workspace.images[0]?.src||workspace.cover} alt=""/><img src={workspace.images[1]?.src||A+'sar-reference_up_clean.jpg'} alt=""/><span><Icon name="message" size={22}/></span></div><h2>Ask anything about your imagery</h2><p>Upload satellite images and ask your question in natural language.</p></div>:<div className="analysis-live-chat">{state.messages.map(m=><ChatMessage key={m.id} message={m}/>)}</div>}{state.pending.length>0&&<div className="pending-strip">{state.pending.map(p=><div className="pending-image" key={p.id}><img src={p.src} alt=""/><span>{p.name}</span><button type="button" onClick={()=>setState(s=>({...s,pending:s.pending.filter(x=>x.id!==p.id)}))}><Icon name="x" size={13}/></button></div>)}</div>}<div className="workspace-composer-zone"><div className="composer workspace-composer"><button type="button" className="composer-plus" onClick={()=>setState(s=>({...s,chooser:!s.chooser}))}><Icon name="plus" size={20}/></button>{chooser&&<div className="attach-menu"><button type="button" onClick={()=>fileRef.current?.click()}><Icon name="image" size={18}/>Upload images</button>{workspace.images.map(im=><button type="button" key={im.id} onClick={()=>setState(s=>({...s,pending:[...s.pending,{id:makeId('pending'),src:im.src,name:im.title}],chooser:false}))}><img src={im.src} alt=""/><span>{im.title}</span></button>)}</div>}<textarea value={state.draft} onChange={e=>setState(s=>({...s,draft:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask a question about your imagery…" rows="1"/><input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={e=>{pick(e.target.files);e.currentTarget.value=''}}/><button type="button" className="composer-upload" onClick={()=>fileRef.current?.click()}><Icon name="image" size={17}/>Upload</button><button type="button" className="composer-send" onClick={send}><Icon name="send" size={19}/></button></div></div></div>}{tab==='images'&&<div className="image-tab-grid">{workspace.images.map(im=><article className="image-card-large" key={im.id}><img src={im.src} alt=""/><div><strong>{im.title}</strong><span>{im.modality} · {im.date}</span></div></article>)}</div>}{tab==='analyses'&&<div className="analysis-list-card">{analyses.map(a=><button type="button" key={a.id} className="analysis-row" onClick={()=>onOpenAnalysis(a.id)}><img src={a.image} alt=""/><span className="analysis-row-copy"><strong>{a.q}</strong><small>{a.sub}</small></span><span className="analysis-row-date">{a.date}</span><Icon name="chevronRight" size={18}/></button>)}</div>}{tab==='reports'&&<div className="reports-grid">{reports.map(r=><article className="report-card" key={r.id}><strong>{r.title}</strong><button type="button" className="icon-action" onClick={()=>onDownloadReport(r)}><Icon name="download" size={18}/></button></article>)}</div>}</section>}

function AnalysisConversation({workspace,analysis,messages,onBack,onSend}){const [draft,setDraft]=useState('');const end=useRef(null);useEffect(()=>end.current?.scrollIntoView({behavior:'smooth'}),[messages.length]);if(!workspace||!analysis)return <section className="section-page"><EmptyPanel title="Analysis not found" text="Return to the workspace." buttonLabel="Back to workspace" onButton={onBack}/></section>;return <section className="section-page history-analysis-page"><div className="breadcrumb"><button type="button" onClick={onBack}><Icon name="chevronLeft" size={17}/>{workspace.title}</button><span>/</span><strong>Analysis</strong></div><div className="analysis-page-header"><span className="eyebrow eyebrow-muted">ANALYSIS</span><h1>{analysis.q}</h1><p>{analysis.sub} · {analysis.date}</p></div><div className="history-conversation-card"><div className="history-conversation-scroll">{messages.map(m=><ChatMessage key={m.id} message={m}/>)}<div ref={end}/></div><div className="composer-zone"><div className="composer"><span className="composer-icon"><Icon name="paperclip" size={19}/></span><textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend(draft);setDraft('')}}} placeholder="Continue the conversation…" rows="1"/><button type="button" className="composer-send" onClick={()=>{onSend(draft);setDraft('')}}><Icon name="send" size={19}/></button></div></div></div></section>}

function NewWorkspacePage({form,setForm,onBack,onCreate,fileRef}){const chooseFile=async(f)=>{if(!f)return;try{const preview=await fileToDataUrl(f);setForm({...form,preview,coverName:f.name,cover:preview})}catch{}};const submit=()=>{if(!form.name.trim())return;onCreate({name:form.name,description:form.description,region:form.region,tags:form.tags.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10),cover:form.cover,coverPreview:form.preview,coverName:form.coverName})};return <section className="section-page create-page"><div className="breadcrumb"><button type="button" onClick={onBack}><Icon name="chevronLeft" size={17}/>Back to Workspaces</button></div><div className="create-layout"><div className="create-main"><div className="page-intro"><span className="eyebrow eyebrow-muted">WORKSPACES</span><h1>Create New Workspace</h1><p>Organize your images, analyses and results in one place for easy access.</p></div><div className="form-card"><label>Workspace name <b>*</b><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} maxLength={50}/><small>{form.name.length}/50</small></label><label>Description <em>(optional)</em><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={200} placeholder="Briefly describe the purpose of this workspace…"/><small>{form.description.length}/200</small></label><label>Region <em>(optional)</em><input value={form.region} onChange={e=>setForm({...form,region:e.target.value})} placeholder="e.g. Assam, India"/></label><label>Cover image <em>(optional)</em><div className="cover-picker"><button type="button" className="cover-upload" onClick={()=>fileRef.current?.click()}>{form.preview?<img src={form.preview} alt="Selected cover"/>:<Icon name="image" size={25}/>}<strong>{form.preview?form.coverName:'Upload cover image'}</strong><span>JPG, PNG</span></button><div className="cover-options">{[A+'flood-card_up_clean.jpg',A+'urban-card_up_clean.jpg',A+'agriculture-card_up_clean.jpg',A+'water-card_up_clean.jpg'].map(src=><button type="button" key={src} className={form.cover===src&&!form.preview?'selected':''} onClick={()=>setForm({...form,cover:src,preview:'',coverName:''})}><img src={src} alt=""/></button>)}</div></div><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>{chooseFile(e.target.files?.[0]);e.currentTarget.value=''}}/></label><label>Add tags <em>(optional)</em><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="e.g. Flood, Assam, 2026"/><small>{form.tags?form.tags.split(',').filter(x=>x.trim()).length:0}/10</small></label><div className="form-actions"><button type="button" className="secondary-button" onClick={onBack}>Cancel</button><button type="button" className="primary-button" disabled={!form.name.trim()} onClick={submit}>Create workspace</button></div></div></div><aside className="why-card"><h2>Why create a workspace?</h2>{[['folder','Keep related work together','Store all images, analyses and results for a specific project in one place.'],['layers','Work on complex tasks','Upload multiple images and run several analyses for the same study.'],['clock','Easily revisit your work','Access past analyses, images and reports anytime.'],['file','Generate reports','Create and save reports for your project.']].map(([ico,title,text])=><div className="why-item" key={title}><span><Icon name={ico} size={24}/></span><div><strong>{title}</strong><p>{text}</p></div></div>)}<img src={A+'cta-river.png'} alt=""/></aside></div></section>}
function WorkspaceEditor({workspace,onClose,onSave}){const [name,setName]=useState(workspace.title);const [desc,setDesc]=useState(workspace.subtitle);const [region,setRegion]=useState(workspace.region);const [tags,setTags]=useState(workspace.tags.join(', '));const [cover,setCover]=useState(workspace.cover);const fileRef=useRef(null);return <div className="modal-backdrop"><div className="editor-modal"><button type="button" className="modal-close-button" onClick={onClose}><Icon name="x" size={18}/></button><span className="eyebrow eyebrow-muted">WORKSPACE</span><h2>Edit workspace</h2><label>Workspace name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Description<textarea value={desc} onChange={e=>setDesc(e.target.value)}/></label><label>Region<input value={region} onChange={e=>setRegion(e.target.value)}/></label><label>Tags<input value={tags} onChange={e=>setTags(e.target.value)}/></label><label>Cover image<button type="button" className="cover-upload edit-cover" onClick={()=>fileRef.current?.click()}><img src={cover} alt=""/><span>Change image</span></button><input ref={fileRef} hidden type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f)try{setCover(await fileToDataUrl(f))}catch{} }}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="primary-button" onClick={()=>onSave({title:name.trim()||workspace.title,subtitle:desc.trim(),region:region.trim()||'India',tags:tags.split(',').map(x=>x.trim()).filter(Boolean),cover})}>Save changes</button></div></div></div>}
function HistoryPage({history,allHistory,search,setSearch,workspaceFilter,setWorkspaceFilter,timeFilter,setTimeFilter,workspaces,onOpen}){
  const grouped=['Today','Yesterday','Earlier this week'];
  return <section className="section-page activity-page">
    <div className="section-heading history-heading"><div><h1>History</h1><p>All your past analyses across workspaces.</p></div></div>
    <div className="history-toolbar">
      <label className="search-field"><Icon name="search" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search analyses, workspaces or questions…"/></label>
      <select value={workspaceFilter} onChange={e=>setWorkspaceFilter(e.target.value)}><option value="all">All workspaces</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select>
      <select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}><option value="all">All time</option><option value="Today">Today</option><option value="Yesterday">Yesterday</option><option value="Earlier this week">Earlier this week</option></select>
    </div>
    <div className="history-groups">{grouped.map(group=>{const rows=history.filter(x=>x.group===group);if(!rows.length)return null;return <div key={group} className="history-group"><h2>{group}</h2>{rows.map(i=><button type="button" className="history-reference-row" key={i.id} onClick={()=>onOpen(i)}><img src={i.image||A+'flood-card_up_clean.jpg'} alt="" onError={e=>{e.currentTarget.src=A+'flood-card_up_clean.jpg'}}/><span className="history-row-copy"><strong>{i.question}</strong><small>{i.sub||'Satellite analysis'}</small></span><span className="workspace-chip"><Icon name="folder" size={15}/>{workspaces.find(w=>w.id===i.workspaceId)?.title||'Analyze'}</span><time>{i.createdAt}</time><span className="history-more"><Icon name="more" size={18}/></span></button>)}</div>})}</div>
    {!history.length&&<EmptyPanel icon="clock" title={allHistory.length?'No matching history':'No history yet'} text={allHistory.length?'Try a different search or filter.':'Start an analysis and your questions will appear here.'}/>} 
  </section>
}
function ReportsPage({reports,allReports,search,setSearch,workspaceFilter,setWorkspaceFilter,timeFilter,setTimeFilter,workspaces,onOpen,onDownload,menuId,setMenuId,onDelete,onGenerate}){
  return <section className="section-page reports-list-page">
    <div className="section-heading reports-heading"><div><h1>Reports</h1><p>View and manage all generated reports from your analyses.</p></div><button type="button" className="primary-button report-generate" onClick={onGenerate}><Icon name="plus" size={18}/>Generate report</button></div>
    <div className="reports-toolbar">
      <label className="search-field"><Icon name="search" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports by title, workspace or keyword…"/></label>
      <select value={workspaceFilter} onChange={e=>setWorkspaceFilter(e.target.value)}><option value="all">All workspaces</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select>
      <select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)}><option value="all">All time</option><option value="latest">Latest</option><option value="recent">Earlier reports</option></select>
    </div>
    <div className="report-list-reference">{reports.map(r=><article className="report-reference-row" key={r.id} onClick={()=>onOpen(r.id)}><img src={r.hero?.src||r.images?.[0]?.src||A+'flood-card_up_clean.jpg'} alt="" onError={e=>{e.currentTarget.src=r.hero?.fallback||r.images?.[0]?.fallback||A+'flood-card_up_clean.jpg'}}/><div className="report-row-copy"><h2>{r.title}</h2><p>{r.description}</p><div className="report-row-meta"><span className="workspace-chip"><Icon name="folder" size={15}/>{workspaces.find(w=>w.id===r.workspaceId)?.title||r.workspaceId}</span><span><Icon name="calendar" size={15}/>{r.generatedAt}</span></div></div><button type="button" className="secondary-button view-report" onClick={e=>{e.stopPropagation();onOpen(r.id)}}><Icon name="file" size={17}/>View</button><div className="report-row-menu-wrap"><button type="button" className="icon-action" aria-label="Report actions" onClick={e=>{e.stopPropagation();setMenuId(menuId===r.id?null:r.id)}}><Icon name="more" size={19}/></button>{menuId===r.id&&<div className="row-menu"><button type="button" onClick={e=>{e.stopPropagation();onOpen(r.id)}}>Open report</button><button type="button" onClick={e=>{e.stopPropagation();onDownload(r)}}>Download PDF</button><button type="button" onClick={e=>{e.stopPropagation();onDelete(r.id)}}>Remove</button></div>}</div></article>)}{!reports.length&&<EmptyPanel icon="file" title={allReports.length?'No matching reports':'No reports yet'} text={allReports.length?'Try another search or filter.':'Generate a report from an analysis to see it here.'}/>}</div>
  </section>
}
function ReportDetailPage({report,workspaces,onBack,onDownload,onOpenWorkspace}){
  const [tab,setTab]=useState('summary');
  useEffect(()=>{
    const previous=document.title;
    document.title=`${report?.title||'Report'} • SatQuery AI`;
    return ()=>{document.title=previous||'SatQuery AI'};
  },[report?.title]);
  if(!report)return <section className="section-page"><EmptyPanel icon="file" title="Report not found" text="Return to Reports to choose another report." buttonLabel="Back to Reports" onButton={onBack}/></section>;
  const sections=[['summary','Executive Summary'],['input','Input Data'],['method','Methodology'],['results','Analysis Results'],['detail','Detailed Analysis'],['impact','Impact Assessment'],['conclusion','Conclusion & Recommendations']];
  const scrollTo=id=>{setTab(id);window.setTimeout(()=>document.getElementById('report-'+id)?.scrollIntoView({behavior:'smooth',block:'start'}),20)};
  return <section className="report-detail-page">
    <div className="report-breadcrumb"><button type="button" onClick={onBack}><Icon name="chevronLeft" size={17}/>Reports</button><span>/</span><strong>{report.title}</strong></div>
    <div className="report-hero">
      <img src={report.hero?.src||A+'flood-card_up_clean.jpg'} alt="" onError={e=>{e.currentTarget.src=report.hero?.fallback||A+'flood-card_up_clean.jpg'}}/>
      <div className="report-hero-overlay"><div><span className="report-kicker">SATQUERY AI REPORT</span><h1>{report.title}</h1><p>{report.description}</p><div className="report-hero-meta"><button type="button" onClick={()=>onOpenWorkspace(report.workspaceId)}><Icon name="folder" size={16}/>Workspace</button><span>{report.workspaceId}</span><span><Icon name="calendar" size={16}/>{report.generatedAt}</span></div></div><div className="report-hero-actions"><button type="button" className="light-button" onClick={onDownload}><Icon name="download" size={17}/>Download PDF</button><button type="button" className="hero-more" onClick={()=>navigator.clipboard?.writeText(window.location.href)}><Icon name="more" size={19}/></button></div></div>
    </div>
    <div className="report-tabbar">{sections.filter(([id])=>['summary','input','method','results','detail','conclusion'].includes(id)).map(([id,label])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>scrollTo(id)}>{label}</button>)}</div>
    <div className="report-body-grid"><div className="report-content">
      <section id="report-summary" className="report-section"><div className="report-section-title"><span>01</span><div><h2>Executive Summary</h2><p>Evidence and context in one place.</p></div></div><p className="lead-copy">{report.summary}</p><div className="metric-grid">{report.metrics.map(([v,l,m])=><div className="metric-card" key={l}><strong>{v}</strong><span>{l}</span><small>{m}</small></div>)}</div></section>
      <section id="report-input" className="report-section"><div className="report-section-title"><span>02</span><div><h2>Input Data</h2><p>Source imagery used for the analysis.</p></div></div><div className="report-input-layout"><div className="report-input-images">{report.inputs.map((im,i)=><figure key={i}><img src={im.src} alt="" onError={e=>{e.currentTarget.src=im.fallback}}/><figcaption><strong>{im.label}</strong><span>{im.meta}</span></figcaption></figure>)}</div><aside className="report-data-card"><h3>Data Details</h3><dl><div><dt>Region</dt><dd>{workspaces?.find?.(w=>w.id===report.workspaceId)?.region||'Referenced study area'}</dd></div><div><dt>Source</dt><dd>NASA Earth Observatory</dd></div><div><dt>Acquisition</dt><dd>{report.generatedAt==='27 Sep 2026'?'16–28 Apr 2010':'See input metadata'}</dd></div><div><dt>Method family</dt><dd>Multi-temporal satellite analysis</dd></div></dl><a href={report.sourceUrl} target="_blank" rel="noreferrer">Open source page ↗</a></aside></div></section>
      <section id="report-method" className="report-section"><div className="report-section-title"><span>03</span><div><h2>Methodology</h2><p>How the evidence is interpreted.</p></div></div><div className="method-row">{report.method.map(([t,x],i)=><div className="method-step" key={t}><span>0{i+1}</span><strong>{t}</strong><p>{x}</p></div>)}</div></section>
      <section id="report-results" className="report-section"><div className="report-section-title"><span>04</span><div><h2>Analysis Results</h2><p>{report.resultTitle}</p></div></div><p className="body-copy">{report.resultText}</p><div className="result-grid"><div className="result-visual"><h3>Evidence summary</h3>{report.bars.map(([l,v])=><div className="bar-row" key={l}><span>{l}</span><div><i style={{width:(String(v).includes('Expanded')||String(v).includes('Changed')||String(v).includes('Applied')? '78%':'48%')}}/></div><strong>{v}</strong></div>)}</div><div className="result-table"><h3>Evidence table</h3><table><thead><tr>{report.table[0].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{report.table.slice(1).map((row,i)=><tr key={i}>{row.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div></div></section>
      <section id="report-detail" className="report-section"><div className="report-section-title"><span>05</span><div><h2>Detailed Analysis</h2><p>Interpretation with uncertainty kept explicit.</p></div></div><div className="detail-analysis-card"><p>{report.resultText}</p><div className="detail-evidence-grid">{report.impact.map(([t,x])=><div key={t}><Icon name={t==='Water'||t==='Crops'||t==='Forest management'?'leaf':t==='Settlements'||t==='Infrastructure'?'home':'layers'} size={19}/><div><strong>{t}</strong><p>{x}</p></div></div>)}</div></div></section>
      <section id="report-impact" className="report-section"><div className="report-section-title"><span>06</span><div><h2>Impact Assessment</h2><p>What the evidence implies for the study context.</p></div></div><div className="impact-grid">{report.impact.map(([t,x])=><div className="impact-card" key={t}><span><Icon name={t==='Water'||t==='Crops'||t==='Forest management'?'leaf':t==='Settlements'||t==='Infrastructure'?'home':'layers'} size={21}/></span><strong>{t}</strong><p>{x}</p></div>)}</div></section>
      <section id="report-conclusion" className="report-section"><div className="report-section-title"><span>07</span><div><h2>Conclusion &amp; Recommendations</h2><p>{report.conclusion}</p></div></div><div className="recommendation-list">{report.recommendations.map(x=><div key={x}><Icon name="check" size={17}/>{x}</div>)}</div></section>
      <section className="report-source-note"><strong>Source</strong><p>{report.sourceName}</p><a href={report.sourceUrl} target="_blank" rel="noreferrer">View the documented NASA source ↗</a></section>
    </div><aside className="report-outline"><h3>Report Contents</h3>{sections.map(([id,label],i)=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>scrollTo(id)}><span>{String(i+1).padStart(2,'0')}</span>{label}</button>)}</aside></div>
  </section>
}
function GenerateReportModal({workspaces,onClose,onGenerate}){return <div className="modal-backdrop"><div className="generate-modal"><button type="button" className="modal-close-button" onClick={onClose}><Icon name="x" size={18}/></button><span className="eyebrow eyebrow-muted">REPORTS</span><h2>Generate a report</h2><p>Select the workspace whose latest analysis context should be used for the report.</p><div className="generate-workspace-list">{workspaces.slice(0,8).map(w=><button type="button" key={w.id} onClick={()=>onGenerate(w.id)}><img src={w.cover} alt=""/><span><strong>{w.title}</strong><small>{w.subtitle}</small></span><Icon name="chevronRight" size={18}/></button>)}</div></div></div>}
function SettingsPage({notify,workspaces,session,onProfileChange,onResetDemo,go}){
  const [theme,setTheme]=useState(()=>safeRead('satquery_settings_theme','system'));
  const [notifications,setNotifications]=useState(()=>safeRead('satquery_settings_notifications',{analysis:true,report:true,workspace:true}));
  const [density,setDensity]=useState(()=>safeRead('satquery_settings_density','comfortable'));
  const [profile,setProfile]=useState(()=>safeRead('satquery_settings_profile',{name:session?.name||'Ayesha',email:session?.email||'ayesha@example.com'}));
  const [profileDraft,setProfileDraft]=useState(profile);
  const [modal,setModal]=useState(null);
  const [password,setPassword]=useState({current:'',next:'',confirm:''});
  const [imagePanelOpen,setImagePanelOpen]=useState(false);
  const uploadedImages=useMemo(()=>workspaces.flatMap(w=>(w.images||[]).map(img=>({...img,workspace:w.title}))).filter(x=>String(x.modality||'').toLowerCase()==='uploaded'),[workspaces]);

  useEffect(()=>{safeWrite('satquery_settings_theme',theme);applyTheme(theme)},[theme]);
  useEffect(()=>{safeWrite('satquery_settings_notifications',notifications)},[notifications]);
  useEffect(()=>{safeWrite('satquery_settings_density',density)},[density]);
  useEffect(()=>{safeWrite('satquery_settings_profile',profile)},[profile]);

  const openProfile=()=>{setProfileDraft(profile);setModal('profile')};
  const saveProfile=()=>{const name=profileDraft.name.trim();const email=profileDraft.email.trim();if(!name||!email){notify('Please enter both your name and email.');return;}const next={name,email};setProfile(next);onProfileChange?.(next);setModal(null);notify('Profile updated.');};
  const savePassword=()=>{if(!password.next||password.next.length<8){notify('Use a password with at least 8 characters.');return;}if(password.next!==password.confirm){notify('The new passwords do not match.');return;}setPassword({current:'',next:'',confirm:''});setModal(null);notify('Password change saved for this demo.');};
  const reset=()=>{if(window.confirm('Reset the local SatQuery demo data to its default workspaces, analyses and reports?')) onResetDemo()};
  const systemLabel=theme==='system'?'System':theme==='light'?'Light':'Dark';

  return <section className="settings-page section-page">
    <div className="section-heading settings-heading"><div><h1>Settings</h1><p>Manage your account and SatQuery preferences.</p></div></div>

    <div className="settings-stack">
      <SettingsSection title="Account" subtitle="Manage your personal information.">
        <div className="account-head">
          <div className="account-person"><span className="avatar account-avatar">{profile.name.charAt(0).toUpperCase()}</span><div><strong>{profile.name}</strong><span>{profile.email}</span></div></div>
          <button type="button" className="secondary-button small" onClick={openProfile}><Icon name="edit" size={16}/>Edit profile</button>
        </div>
        <SettingActionRow icon="user" title="Name" value={profile.name} onClick={openProfile}/>
        <SettingActionRow icon="mail" title="Email" value={profile.email} onClick={openProfile}/>
        <SettingActionRow icon="lock" title="Change password" value="Update your sign-in password" onClick={()=>setModal('password')}/>
      </SettingsSection>

      <SettingsSection title="Appearance" subtitle="Personalize your interface.">
        <div className="appearance-row"><SettingIcon icon="spark"/><div className="setting-copy"><strong>Theme</strong><span>Choose how SatQuery should look on this device.</span></div><div className="segmented-control" role="group" aria-label="Theme"><button type="button" className={theme==='system'?'active':''} onClick={()=>setTheme('system')}><Icon name="monitor" size={16}/>System</button><button type="button" className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Icon name="sun" size={16}/>Light</button><button type="button" className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Icon name="moon" size={16}/>Dark</button></div></div>
      </SettingsSection>

      <SettingsSection title="Notifications" subtitle="Choose what updates you want to receive.">
        <SettingToggleRow icon="bell" title="Analysis completed" text="Get notified when an analysis is ready." value={notifications.analysis} onChange={v=>setNotifications(n=>({...n,analysis:v}))}/>
        <SettingToggleRow icon="file" title="Report generated" text="Get notified when a report is generated." value={notifications.report} onChange={v=>setNotifications(n=>({...n,report:v}))}/>
        <SettingToggleRow icon="user" title="Workspace activity" text="Get notified about activity in your workspaces." value={notifications.workspace} onChange={v=>setNotifications(n=>({...n,workspace:v}))}/>
      </SettingsSection>

      <SettingsSection title="Data & Privacy" subtitle="Manage your data and privacy settings.">
        <SettingActionRow icon="layers" title="Uploaded imagery" value={`${uploadedImages.length} image${uploadedImages.length===1?'':'s'} available in your workspaces`} onClick={()=>setImagePanelOpen(v=>!v)} />
        {imagePanelOpen&&<div className="settings-inline-panel"><div className="inline-panel-head"><strong>Uploaded imagery</strong><span>{uploadedImages.length} total</span></div>{uploadedImages.length?<div className="settings-image-list">{uploadedImages.slice(0,8).map((img,i)=><div key={img.id||i}><img src={img.src} alt=""/><div><strong>{img.title}</strong><span>{img.workspace} · {img.modality}</span></div></div>)}</div>:<p>No uploaded imagery is currently saved.</p>}</div>}
        <button type="button" className="danger-row" onClick={reset}><span className="row-icon danger-icon"><Icon name="trash" size={18}/></span><span><strong>Reset local demo data</strong><small>Restore the default SatQuery workspace, analysis and report data on this device.</small></span><Icon name="chevronRight" size={18}/></button>
      </SettingsSection>

      <SettingsSection title="About" subtitle="Information about SatQuery AI.">
        <div className="about-brand-row"><Brand/><span className="about-version">Version <strong>1.0.0</strong></span></div>
        <div className="about-links"><button type="button" onClick={()=>notify('Terms of Service are available in the production application.')}>Terms of Service <span>↗</span></button><button type="button" onClick={()=>notify('Privacy Policy is available in the production application.')}>Privacy Policy <span>↗</span></button><button type="button" onClick={()=>window.location.hash='#/help'}>Help &amp; Support <span>↗</span></button></div>
      </SettingsSection>
    </div>

    {modal==='profile'&&<SettingsModal title="Edit profile" onClose={()=>setModal(null)}><label className="modal-field"><span>Name</span><input value={profileDraft.name} onChange={e=>setProfileDraft({...profileDraft,name:e.target.value})}/></label><label className="modal-field"><span>Email</span><input type="email" value={profileDraft.email} onChange={e=>setProfileDraft({...profileDraft,email:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(null)}>Cancel</button><button type="button" className="primary-button" onClick={saveProfile}>Save changes</button></div></SettingsModal>}
    {modal==='password'&&<SettingsModal title="Change password" onClose={()=>setModal(null)}><p className="modal-note">This demo records the interaction locally; production authentication will handle the actual credential change.</p><label className="modal-field"><span>Current password</span><input type="password" value={password.current} onChange={e=>setPassword({...password,current:e.target.value})}/></label><label className="modal-field"><span>New password</span><input type="password" value={password.next} onChange={e=>setPassword({...password,next:e.target.value})}/></label><label className="modal-field"><span>Confirm new password</span><input type="password" value={password.confirm} onChange={e=>setPassword({...password,confirm:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(null)}>Cancel</button><button type="button" className="primary-button" onClick={savePassword}>Update password</button></div></SettingsModal>}
  </section>;
}
function applyTheme(theme){
  const root=document.documentElement;
  if(theme==='system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme',theme);
}
function SettingsSection({title,subtitle,children}){return <section className="settings-section"><div className="settings-section-title"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section>}
function SettingIcon({icon}){return <span className="setting-icon-box"><Icon name={icon} size={19}/></span>}
function SettingActionRow({icon,title,value,onClick}){return <button type="button" className="setting-action-row" onClick={onClick}><SettingIcon icon={icon}/><span><strong>{title}</strong><small>{value}</small></span><Icon name="chevronRight" size={17}/></button>}
function SettingToggleRow({icon,title,text,value,onChange}){return <div className="setting-toggle-row"><SettingIcon icon={icon}/><span><strong>{title}</strong><small>{text}</small></span><Toggle value={value} onChange={onChange}/></div>}
function Toggle({value,onChange}){return <button type="button" className={'toggle '+(value?'on':'')} onClick={()=>onChange(!value)} aria-pressed={value} aria-label={value?'Disable':'Enable'}><span/></button>}
function SettingsModal({title,onClose,children}){return <div className="modal-backdrop"><div className="settings-modal"><button type="button" className="modal-close-button" onClick={onClose} aria-label="Close"><Icon name="x" size={18}/></button><span className="eyebrow eyebrow-muted">SETTINGS</span><h2>{title}</h2>{children}</div></div>}
function HelpPage({notify,go}){
  const [query,setQuery]=useState(''); const [openFaq,setOpenFaq]=useState(null); const [article,setArticle]=useState(null);
  const quick=[
    {id:'start',title:'Getting Started',text:'Learn how to upload imagery and run your first analysis.',image:A+'flood-card_up_clean.jpg',body:'Start in Analyze, attach one or more satellite images, then write a natural-language question. SatQuery keeps the imagery and question together in the conversation so you can continue with follow-ups.'},
    {id:'using',title:'Using SatQuery AI',text:'Learn how to ask questions and work with satellite imagery.',image:A+'water-card_up_clean.jpg',body:'Use plain-language questions such as identifying water bodies, detecting built-up areas, comparing time periods, or comparing optical and SAR observations. The analysis view keeps each request in the same conversation.'},
    {id:'workspace',title:'Workspaces & Reports',text:'Learn how to organize analyses and create reports.',image:A+'urban-card_up_clean.jpg',body:'Workspaces group imagery, conversations, analyses and reports. Open a workspace to continue existing analyses or start a new one; use Reports to review and export report snapshots.'},
    {id:'trouble',title:'Troubleshooting',text:'Solutions for uploads, analysis errors, and common issues.',image:A+'impact-mountains.png',body:'For image issues, use common image formats and make sure the selected file can be read by the browser. For demo-state issues, use Settings to reset the local demo data rather than manually clearing unrelated browser storage.'}
  ];
  const faqs=[['What types of satellite imagery can I upload?','The browser demo accepts common image formats. TIFF imagery can be selected for the interaction flow, while full geospatial decoding and production processing belong in the backend service.'],['How do I start an analysis?','Open Analyze, choose an example or attach imagery, type your question and press the send button. The request appears in the conversation with a response.'],['Can I analyze multiple images or compare two time periods?','Yes. The Analyze flow accepts multiple selected images, and the workspace conversation can retain those observations for follow-up questions.'],['Can SatQuery AI work with both optical and SAR imagery?','Yes. The interface is designed for optical, multispectral and SAR observations. Production model selection and cross-modal fusion will be connected to the backend later.'],['Where are my previous analyses saved?','In this frontend build, demo workspaces, analyses, conversations and reports are stored locally in the browser so the prototype can be used without a backend.'],['How do I generate a report?','Open Reports and use Generate report to select a workspace. The generated report uses the available workspace/report context and can be opened as a detailed report view.'],['What kind of outputs and visual evidence does SatQuery AI provide?','The prototype can show imagery, conversational explanations and report sections. Production outputs can add segmentation masks, detections, change maps and other model evidence.']];
  const q=query.trim().toLowerCase();
  const visibleQuick=quick.filter(x=>!q||(x.title+' '+x.text+' '+x.body).toLowerCase().includes(q));
  const visibleFaqs=faqs.filter(([a,b])=>!q||(a+' '+b).toLowerCase().includes(q));
  const contact=()=>{window.location.href='mailto:support@satquery.ai?subject=SatQuery AI support request';notify('Opening your email client.')};
  return <section className="help-page section-page">
    <div className="section-heading help-heading"><div><h1>Help &amp; Support</h1><p>Find answers, learn how SatQuery AI works, or get help with an issue.</p></div></div>
    <div className="help-search"><Icon name="search" size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for help (e.g. upload image, multi-temporal analysis, reports...)"/><span>{q?`${visibleQuick.length+visibleFaqs.length} matches`:''}</span></div>
    <div className="help-section-block"><div className="help-block-heading"><h2>Quick Help</h2><p>Learn the basics or get help with key features.</p></div><div className="quick-help-grid">{visibleQuick.map(card=><button type="button" key={card.id} className="quick-help-card" onClick={()=>setArticle(card)}><img src={card.image} alt=""/><span><strong>{card.title}</strong><small>{card.text}</small></span><Icon name="chevronRight" size={18}/></button>)}{!visibleQuick.length&&<div className="help-no-results">No quick-help articles match that search.</div>}</div></div>
    <div className="help-section-block"><div className="help-block-heading"><h2>Frequently Asked Questions</h2><p>Find answers to common questions about SatQuery AI.</p></div><div className="faq-stack help-faq-stack">{visibleFaqs.map(([qtext,answer],i)=><div className={'help-faq '+(openFaq===i?'open':'')} key={qtext}><button type="button" onClick={()=>setOpenFaq(openFaq===i?null:i)}><span>{qtext}</span><Icon name="chevronDown" size={18}/></button>{openFaq===i&&<p>{answer}</p>}</div>)}{!visibleFaqs.length&&<div className="help-no-results">No FAQs match your search.</div>}</div></div>
    <div className="support-cta"><div className="support-icon"><Icon name="mail" size={25}/></div><div><h2>Still need help?</h2><p>Can't find what you're looking for? Contact the SatQuery AI support team.</p></div><button type="button" className="primary-button" onClick={contact}>Contact Support <Icon name="send" size={17}/></button></div>
    {article&&<div className="modal-backdrop"><div className="help-article-modal"><button type="button" className="modal-close-button" onClick={()=>setArticle(null)} aria-label="Close"><Icon name="x" size={18}/></button><img src={article.image} alt=""/><span className="eyebrow eyebrow-muted">QUICK HELP</span><h2>{article.title}</h2><p>{article.body}</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setArticle(null)}>Close</button><button type="button" className="primary-button" onClick={()=>{setArticle(null);if(article.id==='start'||article.id==='using')go({type:'analyze'});else if(article.id==='workspace')go({type:'workspaces'});else go({type:'settings'});}}>Open in app</button></div></div></div>}
  </section>
}

function EmptyPanel({icon='spark',title,text,buttonLabel,onButton}){return <div className="empty-panel"><span className="empty-panel-icon"><Icon name={icon} size={22}/></span><h3>{title}</h3><p>{text}</p>{buttonLabel&&<button type="button" className="primary-button" onClick={onButton}>{buttonLabel}</button>}</div>}
function LogoutModal({onCancel,onConfirm}){return <div className="modal-backdrop"><div className="logout-modal"><button type="button" className="modal-close-button" onClick={onCancel}><Icon name="x" size={18}/></button><span className="logout-mark"><Icon name="logout" size={20}/></span><span className="eyebrow eyebrow-muted">ACCOUNT</span><h2>Sign out of SatQuery?</h2><p>Your workspace activity will remain on this device and you can sign in again from the landing page.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="button" className="logout-confirm" onClick={onConfirm}>Log out</button></div></div></div>}
function downloadReport(r){if(r)window.print()}

createRoot(document.getElementById('root')).render(<App/>);
