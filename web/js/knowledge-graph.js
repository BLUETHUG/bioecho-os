// BioEcho Universal Knowledge Graph
class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyOut = new Map();
    this.adjacencyIn = new Map();
  }

  addNode(type, id, data) {
    const node = {
      id,
      type,
      data: data || {},
      createdAt: new Date().toISOString(),
    };
    this.nodes.set(id, node);
    if (!this.adjacencyOut.has(id)) this.adjacencyOut.set(id, []);
    if (!this.adjacencyIn.has(id)) this.adjacencyIn.set(id, []);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getNodesByType(type) {
    const result = [];
    for (const node of this.nodes.values()) {
      if (node.type === type) result.push(node);
    }
    return result;
  }

  addEdge(fromId, toId, type, properties) {
    const edgeId = `edge_${fromId}_${toId}_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const edge = {
      id: edgeId,
      from: fromId,
      to: toId,
      type,
      properties: properties || {},
      weight: properties?.weight || 1.0,
      createdAt: new Date().toISOString(),
    };
    this.edges.set(edgeId, edge);
    if (!this.adjacencyOut.has(fromId)) this.adjacencyOut.set(fromId, []);
    if (!this.adjacencyIn.has(toId)) this.adjacencyIn.set(toId, []);
    this.adjacencyOut.get(fromId).push(edgeId);
    this.adjacencyIn.get(toId).push(edgeId);
    return edge;
  }

  getEdgesFrom(nodeId, edgeType) {
    const edgeIds = this.adjacencyOut.get(nodeId) || [];
    const result = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) result.push(edge);
    }
    return result;
  }

  getEdgesTo(nodeId, edgeType) {
    const edgeIds = this.adjacencyIn.get(nodeId) || [];
    const result = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) result.push(edge);
    }
    return result;
  }

  traverse(startId, edgeType, direction, depth) {
    if (depth === undefined) depth = Infinity;
    const visited = new Set();
    const result = [];
    const queue = [{ id: startId, dist: 0 }];
    visited.add(startId);
    while (queue.length > 0) {
      const { id, dist } = queue.shift();
      if (dist > 0) result.push({ node: this.nodes.get(id), distance: dist });
      if (dist >= depth) continue;
      let edgeIds;
      if (direction === 'out' || direction === undefined) {
        edgeIds = this.adjacencyOut.get(id) || [];
      } else {
        edgeIds = this.adjacencyIn.get(id) || [];
      }
      for (const eid of edgeIds) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        if (edgeType && edge.type !== edgeType) continue;
        const nextId = direction === 'in' ? edge.from : edge.to;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({ id: nextId, dist: dist + 1 });
        }
      }
    }
    return result;
  }

  findPath(fromId, toId, maxDepth) {
    if (maxDepth === undefined) maxDepth = 10;
    const visited = new Map();
    const queue = [fromId];
    visited.set(fromId, null);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === toId) {
        const path = [];
        let cur = toId;
        while (cur !== null) {
          path.unshift(cur);
          cur = visited.get(cur);
        }
        return path;
      }
      const outEdges = this.adjacencyOut.get(current) || [];
      const inEdges = this.adjacencyIn.get(current) || [];
      const allEdges = [...outEdges, ...inEdges];
      for (const eid of allEdges) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        const nextId = edge.from === current ? edge.to : edge.from;
        if (!visited.has(nextId)) {
          visited.set(nextId, current);
          if (visited.size > maxDepth) return null;
          queue.push(nextId);
        }
      }
    }
    return null;
  }

  findNodes(type, criteria) {
    const result = [];
    for (const node of this.nodes.values()) {
      if (node.type !== type) continue;
      let match = true;
      for (const [key, value] of Object.entries(criteria)) {
        const val = node.data[key];
        if (typeof value === 'function') {
          if (!value(val)) { match = false; break; }
        } else if (val !== value) {
          match = false;
          break;
        }
      }
      if (match) result.push(node);
    }
    return result;
  }

  getNeighbors(nodeId, edgeType) {
    const neighbors = [];
    const outEdges = this.getEdgesFrom(nodeId, edgeType);
    const inEdges = this.getEdgesTo(nodeId, edgeType);
    for (const edge of outEdges) {
      const node = this.nodes.get(edge.to);
      if (node) neighbors.push({ node, edge, direction: 'out' });
    }
    for (const edge of inEdges) {
      const node = this.nodes.get(edge.from);
      if (node) neighbors.push({ node, edge, direction: 'in' });
    }
    return neighbors;
  }

  aggregate(nodeType, edgeType, aggregation) {
    const nodes = this.getNodesByType(nodeType);
    if (aggregation === 'count') return nodes.length;
    if (aggregation === 'countEdges') {
      let total = 0;
      for (const node of nodes) {
        total += this.getEdgesFrom(node.id, edgeType).length;
        total += this.getEdgesTo(node.id, edgeType).length;
      }
      return total;
    }
    if (aggregation === 'sum') {
      return (field) => nodes.reduce((s, n) => s + (n.data[field] || 0), 0);
    }
    if (aggregation === 'avg') {
      return (field) => {
        const vals = nodes.map(n => n.data[field]).filter(v => v !== undefined);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
    }
    if (aggregation === 'min') {
      return (field) => {
        const vals = nodes.map(n => n.data[field]).filter(v => v !== undefined);
        return vals.length ? Math.min(...vals) : undefined;
      };
    }
    if (aggregation === 'max') {
      return (field) => {
        const vals = nodes.map(n => n.data[field]).filter(v => v !== undefined);
        return vals.length ? Math.max(...vals) : undefined;
      };
    }
    return nodes;
  }

  getSubgraph(nodeId, depth) {
    if (depth === undefined) depth = 2;
    const subNodes = new Map();
    const subEdges = new Map();
    const visited = new Set();
    const queue = [{ id: nodeId, dist: 0 }];
    visited.add(nodeId);
    while (queue.length > 0) {
      const { id, dist } = queue.shift();
      const node = this.nodes.get(id);
      if (node) subNodes.set(id, node);
      if (dist >= depth) continue;
      for (const eid of (this.adjacencyOut.get(id) || [])) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        subEdges.set(eid, edge);
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({ id: edge.to, dist: dist + 1 });
        }
      }
      for (const eid of (this.adjacencyIn.get(id) || [])) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        subEdges.set(eid, edge);
        if (!visited.has(edge.from)) {
          visited.add(edge.from);
          queue.push({ id: edge.from, dist: dist + 1 });
        }
      }
    }
    return { nodes: subNodes, edges: subEdges };
  }

  getStats() {
    const nodeCounts = {};
    const edgeCounts = {};
    for (const node of this.nodes.values()) {
      nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
    }
    for (const edge of this.edges.values()) {
      edgeCounts[edge.type] = (edgeCounts[edge.type] || 0) + 1;
    }
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodeCounts,
      edgeCounts,
    };
  }

  queryTemporal(nodeId, timeRange, edgeType) {
    const { start, end } = timeRange;
    const result = [];
    const edgeIds = [
      ...(this.adjacencyOut.get(nodeId) || []),
      ...(this.adjacencyIn.get(nodeId) || []),
    ];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (!edge) continue;
      if (edgeType && edge.type !== edgeType) continue;
      const createdAt = new Date(edge.createdAt).getTime();
      const tStart = start ? new Date(start).getTime() : -Infinity;
      const tEnd = end ? new Date(end).getTime() : Infinity;
      if (createdAt >= tStart && createdAt <= tEnd) {
        const otherId = edge.from === nodeId ? edge.to : edge.from;
        const otherNode = this.nodes.get(otherId);
        result.push({ edge, otherNode });
      }
    }
    return result;
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  static fromJSON(data) {
    const kg = new KnowledgeGraph();
    if (data.nodes) {
      for (const n of data.nodes) {
        kg.nodes.set(n.id, n);
        if (!kg.adjacencyOut.has(n.id)) kg.adjacencyOut.set(n.id, []);
        if (!kg.adjacencyIn.has(n.id)) kg.adjacencyIn.set(n.id, []);
      }
    }
    if (data.edges) {
      for (const e of data.edges) {
        kg.edges.set(e.id, e);
        if (!kg.adjacencyOut.has(e.from)) kg.adjacencyOut.set(e.from, []);
        if (!kg.adjacencyIn.has(e.to)) kg.adjacencyIn.set(e.to, []);
        kg.adjacencyOut.get(e.from).push(e.id);
        kg.adjacencyIn.get(e.to).push(e.id);
      }
    }
    return kg;
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyOut.clear();
    this.adjacencyIn.clear();
  }

  removeNode(id) {
    const outEdges = this.adjacencyOut.get(id) || [];
    const inEdges = this.adjacencyIn.get(id) || [];
    for (const eid of [...outEdges, ...inEdges]) {
      const edge = this.edges.get(eid);
      if (edge) {
        const outList = this.adjacencyOut.get(edge.from);
        if (outList) {
          const idx = outList.indexOf(eid);
          if (idx !== -1) outList.splice(idx, 1);
        }
        const inList = this.adjacencyIn.get(edge.to);
        if (inList) {
          const idx = inList.indexOf(eid);
          if (idx !== -1) inList.splice(idx, 1);
        }
        this.edges.delete(eid);
      }
    }
    this.nodes.delete(id);
    this.adjacencyOut.delete(id);
    this.adjacencyIn.delete(id);
  }

  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    const outList = this.adjacencyOut.get(edge.from);
    if (outList) {
      const idx = outList.indexOf(edgeId);
      if (idx !== -1) outList.splice(idx, 1);
    }
    const inList = this.adjacencyIn.get(edge.to);
    if (inList) {
      const idx = inList.indexOf(edgeId);
      if (idx !== -1) inList.splice(idx, 1);
    }
    this.edges.delete(edgeId);
    return true;
  }

  populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB) {
    this.clear();
    const organismNodes = new Map();
    const speciesNodes = new Map();
    const userNodes = new Map();
    const eventNodes = new Map();

    // Add default user
    const userNode = this.addNode('User', 'user-default', { name: 'Default User' });
    userNodes.set('user-default', userNode);

    // Add organisms from twinEngine (twins is a Map)
    if (twinEngine && twinEngine.twins) {
      twinEngine.twins.forEach((org, id) => {
        const node = this.addNode('Organism', id, {
          name: org.name || id,
          species: org.species,
          type: org.type,
          lifecycleStage: org.lifecycle?.lifecycleStage || 'mature',
          healthScore: org.state?.healthScore,
          stressIndex: org.state?.stressIndex,
          createdAt: org.createdAt,
        });
        organismNodes.set(id, node);

        // Link to species
        if (org.species && speciesDB && speciesDB.profiles) {
          const sp = speciesDB.profiles.get(org.species);
          if (sp) {
            if (!speciesNodes.has(org.species)) {
              const spNode = this.addNode('Species', org.species, {
                scientificName: sp.scientificName,
                commonName: sp.commonName,
                family: sp.family,
                type: sp.type,
                voltageRange: sp.voltageRange,
              });
              speciesNodes.set(org.species, spNode);
            }
            this.addEdge(id, org.species, 'BELONGS_TO', { confidence: 1.0 });
          }
        }

        // Link to user
        this.addEdge(id, 'user-default', 'OBSERVED_BY', { role: 'owner' });

        // Add recent events
        if (org.events) {
          const recentEvents = org.events.slice(-100);
          for (let i = 0; i < recentEvents.length; i++) {
            const evt = recentEvents[i];
            const evtId = `${id}-evt-${evt.time}`;
            const evtNode = this.addNode('Event', evtId, {
              organismId: id,
              time: evt.time,
              classification: evt.classification,
              confidence: evt.confidence,
              amplitude: evt.amplitude,
            });
            eventNodes.set(evtId, evtNode);
            this.addEdge(id, evtId, 'CAPTURED_BY', { index: i });
          }
        }
      });
    }

    // Add species from speciesDB (profiles is a Map)
    if (speciesDB && speciesDB.profiles) {
      speciesDB.profiles.forEach((sp, id) => {
        if (!speciesNodes.has(id)) {
          const node = this.addNode('Species', id, {
            scientificName: sp.scientificName,
            commonName: sp.commonName,
            family: sp.family,
            type: sp.type,
            voltageRange: sp.voltageRange,
            rhythm: sp.rhythm,
          });
          speciesNodes.set(id, node);
        }
      });
    }

    // Add experiments
    if (experimentLog && experimentLog.sessions) {
      for (const session of experimentLog.sessions.slice(-50)) {
        const expId = session.id;
        this.addNode('Experiment', expId, {
          organismId: session.organismId,
          startTime: session.startTime,
          endTime: session.endTime,
        });
        if (session.organismId && organismNodes.has(session.organismId)) {
          this.addEdge(session.organismId, expId, 'VALIDATED_BY', {});
        }
      }
    }

    // Add relationships
    if (relationshipEngine && relationshipEngine.relationships) {
      relationshipEngine.relationships.forEach((rel, id) => {
        // Add relationship as observation
        const obsId = `obs-${id}`;
        this.addNode('Observation', obsId, {
          userId: rel.userId,
          organismId: rel.organismId,
          type: rel.type,
          timestamp: rel.createdAt,
        });
        if (userNodes.has(rel.userId)) {
          this.addEdge(obsId, rel.userId, 'OBSERVED_BY', { role: rel.type });
        }
      });
    }

    return this.getStats();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KnowledgeGraph;
}
