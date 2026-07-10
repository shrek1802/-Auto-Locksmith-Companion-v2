import tools from './master/tools.json';
import connections from './master/vehicle-connections.json';
import accessories from './master/tool-accessories.json';
import online from './master/online-requirements.json';

export const masterData = {
  tools: Object.fromEntries(tools.tools.map(item => [item.id, item])),
  connections: Object.fromEntries(connections.connections.map(item => [item.id, item])),
  accessories: Object.fromEntries(accessories.accessories.map(item => [item.id, item])),
  online: Object.fromEntries(online.requirements.map(item => [item.id, item])),
};
