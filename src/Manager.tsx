import {SectionMenu} from './SectionMenu';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {db} from './client';
import {checked,useRead,LoadState,type Member} from './manager-common';
import {Residents} from './ManagerResidents';
import {ManagerReport} from './ManagerReport';
import {ManagerSettings} from './ManagerSettings';

type Props={rt:string;userId:string;name:string;owner:boolean};

export default function Manager(props:Props) {
  return <Workspace key={props.rt} {...props}/>;
}

function Workspace({rt,userId,name,owner}:Props) {
  const [section,setSection]=useState('Warga');
  const [revision,setRevision]=useState(0);
  const changed=()=>setRevision(value=>value+1);
  const load=useCallback(async()=>checked(await db.from('memberships')
    .select('user_id,email,role,resident_name,home_address,whatsapp').eq('rt_id',rt)) as Member[],[rt]);
  const members=useRead(load,revision,true);
  return <View style={{gap:16}}>
    <SectionMenu items={['Warga','Presensi','Pengaturan RT']} value={section} select={setSection}/>
    {section==='Presensi'?<ManagerReport rt={rt}/>:!members.data?<LoadState {...members}/>:section==='Warga'?
      <Residents rt={rt} name={name} members={members.data} revision={revision} changed={changed}/>:
      <ManagerSettings rt={rt} name={name} owner={owner && members.data.some(m=>m.user_id===userId&&m.role==='owner')}
        members={members.data} changed={changed}/>}
  </View>;
}
