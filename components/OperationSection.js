import React from 'react'; import {Text,StyleSheet} from 'react-native';
import Accordion from './Accordion'; import StatusBadge from './StatusBadge'; import ToolCard from './ToolCard';
export default function OperationSection({operation,masterData,ownedToolIds,showOnlyOwned}){
 const entries=Object.entries(operation.tools||{}).filter(([id])=>!showOnlyOwned||ownedToolIds.includes(id));
 return <Accordion title={operation.display_name} right={<StatusBadge status={operation.overall_status}/>}>
  {operation.summary?<Text style={styles.summary}>{operation.summary}</Text>:null}
  {entries.length?entries.map(([id,method])=><ToolCard key={id} toolId={id} method={method} masterData={masterData}/>):<Text style={styles.empty}>No selected tools are listed for this operation.</Text>}
 </Accordion>
}
const styles=StyleSheet.create({summary:{color:'#CBD5E1',lineHeight:21,marginBottom:12},empty:{color:'#94A3B8',fontStyle:'italic'}});
