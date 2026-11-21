import {useRef, useState} from 'react';

export const managerSections = [
  {id:'jadwal', label:'Jadwal ronda'},
  {id:'warga', label:'Warga & undangan'},
  {id:'pos', label:'Lokasi pos'},
  {id:'rekap', label:'Rekap presensi'},
  {id:'presensi', label:'Presensi saya'},
  {id:'pengaturan', label:'Pengaturan RT'},
] as const;

export type ManagerSection = (typeof managerSections)[number]['id'];

export function ManagerNavigation({current,onSelect,onLogout}:{
  current:ManagerSection;
  onSelect:(id:ManagerSection)=>void;
  onLogout:()=>void;
}) {
  const [open,setOpen]=useState(false);
  const toggle=useRef<HTMLButtonElement>(null);
  return <aside className="manager-sidebar" onKeyDown={event=>{
    if(event.key==='Escape' && open){
      setOpen(false);
      toggle.current?.focus();
    }
  }}>
    <button type="button" ref={toggle} className="manager-menu-toggle"
      aria-expanded={open} aria-controls="manager-menu" onClick={()=>setOpen(value=>!value)}>
      <span className="manager-menu-icon" aria-hidden="true"/>
      Menu pengurus
    </button>
    <div id="manager-menu" className="manager-menu" data-open={open}>
      <nav aria-label="Menu pengurus">
        {managerSections.map(({id,label})=><button key={id} type="button"
          aria-current={current===id?'page':undefined} onClick={()=>{
            setOpen(false);
            onSelect(id);
          }}>{label}</button>)}
      </nav>
      <button className="manager-logout" type="button" onClick={onLogout}>Keluar</button>
    </div>
  </aside>;
}
