'use client'
import { useEffect, useRef, useState } from 'react'
import type { Report } from '@/lib/types'
import { validPoint } from '@/lib/location'
import 'leaflet/dist/leaflet.css'
export function CaseMap({reports=[],point,onPick}: {reports?:Report[];point?:{lat:number;lng:number};onPick?:(point:{lat:number;lng:number})=>void}) {
  const node = useRef<HTMLDivElement>(null)
  const instance = useRef<any>(null)
  const layer = useRef<any>(null)
  const callback = useRef(onPick)
  callback.current = onPick
  const [ready,setReady] = useState(false)
  const [error,setError] = useState('')
  useEffect(() => {
    let cancelled = false
    let map:any
    import('leaflet').then(L => {
      if (cancelled || !node.current) return
      map = L.map(node.current).setView([9.08,8.67],6)
      instance.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:18}).addTo(map)
      layer.current = L.layerGroup().addTo(map)
      map.on('click',(e:any) => callback.current?.({lat:Number(e.latlng.lat.toFixed(2)),lng:Number(e.latlng.lng.toFixed(2))}))
      setReady(true)
      requestAnimationFrame(()=>map.invalidateSize())
    }).catch(()=>setError('Map unavailable. Enter a last-seen area manually.'))
    return () => {cancelled = true;map?.remove();instance.current=null;layer.current=null}
  },[])
  useEffect(()=>{
    if (!ready || !instance.current || !layer.current) return
    let cancelled=false
    import('leaflet').then(L=>{
      if(cancelled || !layer.current) return
      layer.current.clearLayers()
      const points: [number,number][]=[]
      const icon=L.divIcon({className:'',html:'<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:var(--primary);box-shadow:0 1px 8px #0006"></span>',iconSize:[18,18],iconAnchor:[9,9]})
      for(const report of reports){
        if(!validPoint(report.last_seen_lat,report.last_seen_lng))continue
        const p:[number,number]=[Number(report.last_seen_lat!.toFixed(2)),Number(report.last_seen_lng!.toFixed(2))]
        points.push(p)
        const content=document.createElement('div'),link=document.createElement('a')
        link.textContent=report.subject;link.href='/reports/'+encodeURIComponent(report.id);content.append(link)
        L.marker(p,{icon}).bindPopup(content).addTo(layer.current)
      }
      if(point && validPoint(point.lat,point.lng)){
        points.push([point.lat,point.lng])
        const marker=L.marker([point.lat,point.lng],{icon,draggable:!!callback.current}).addTo(layer.current)
        marker.on('dragend',()=>{const p=marker.getLatLng();callback.current?.({lat:Number(p.lat.toFixed(2)),lng:Number(p.lng.toFixed(2))})})
      }
      if(points.length)instance.current.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:13})
    })
    return()=>{cancelled=true}
  },[ready,reports,point])
  return <div><div ref={node} className="relative z-0 h-[380px] w-full rounded-lg border" aria-label={onPick?'Select an approximate last-seen location':'Map of approximate last-seen areas'} />{error&&<p role="alert">{error}</p>}<p className="mt-2 text-xs text-muted-foreground">{onPick?'Click the map or drag the pin. Keyboard users can enter coordinates below. ':''}Approximate last-seen locations only; this is not live tracking.</p></div>
}
