import {ClipboardCheck, LogOut, Menu, Settings, Users, X} from 'lucide-react';
import {useRef, useState} from 'react';

export const managerSections = [
  {id:'warga', label:'Warga', icon:Users},
  {id:'rekap', label:'Presensi', icon:ClipboardCheck},
  {id:'pengaturan', label:'Pengaturan RT', icon:Settings},
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
    <button type="button" ref={toggle} className="manager-menu-toggle with-icon"
      aria-expanded={open} aria-controls="manager-menu" onClick={()=>setOpen(value=>!value)}>
      {open?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}
      Menu pengurus
    </button>
    <div id="manager-menu" className="manager-menu" data-open={open}>
      <nav aria-label="Menu pengurus">
        {managerSections.map(({id,label,icon:Icon})=><button key={id} type="button" className="with-icon"
          aria-current={current===id?'page':undefined} onClick={()=>{
            setOpen(false);
            onSelect(id);
          }}><Icon aria-hidden="true"/>{label}</button>)}
      </nav>
      <button className="manager-logout with-icon" type="button" onClick={onLogout}><LogOut aria-hidden="true"/>Keluar</button>
    </div>
  </aside>;
}
