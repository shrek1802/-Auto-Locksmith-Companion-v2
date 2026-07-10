import React from 'react';
import {Text,View,StyleSheet} from 'react-native';
import Accordion from './Accordion'; import StatusBadge from './StatusBadge'; import InfoRow from './InfoRow';
const yesNo=v=>v===true?'Required':v===false?'Not required':'Unknown';
const listText=(ids,map)=>!ids?.length?'Not needed':ids.map(id=>map[id]?.name||id).join(', ');
export default function ToolCard({toolId,method,masterData}){
 const tool=masterData.tools[toolId]||{name:toolId};
 return <Accordion level={1} title={tool.name} right={<StatusBadge status={method.status}/>}>
  {method.status==='not_supported'||method.status==='unknown'||method.status==='untested' ? <Text style={styles.reason}>{method.reason||'No verified information is available.'}</Text> : <>
   <InfoRow label="Method" value={(method.method||'unknown').toUpperCase()}/>
   <InfoRow label="Internet" value={yesNo(method.internet_required)}/>
   <InfoRow label="Working key" value={yesNo(method.working_key_required)}/>
   <InfoRow label="Vehicle connection" value={listText(method.vehicle_connection_ids,masterData.connections)}/>
   <InfoRow label="Tool accessories" value={listText(method.tool_accessory_ids,masterData.accessories)}/>
   <InfoRow label="Online access" value={listText(method.online_requirement_ids,masterData.online)}/>
   {method.estimated_minutes?<InfoRow label="Estimated time" value={`${method.estimated_minutes.minimum ?? '?'}–${method.estimated_minutes.maximum ?? '?'} minutes`}/>:null}
   {method.notes?<Text style={styles.notes}>{method.notes}</Text>:null}
   {method.warnings?.map((w,i)=><View key={i} style={styles.warning}><Text style={styles.warningText}>⚠ {w}</Text></View>)}
  </>}
 </Accordion>
}
const styles=StyleSheet.create({reason:{color:'#CBD5E1',lineHeight:21},notes:{color:'#CBD5E1',marginTop:12,lineHeight:21},warning:{backgroundColor:'#3F2F0B',padding:10,borderRadius:10,marginTop:10},warningText:{color:'#FDE68A',fontWeight:'700'}});
