import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Renders the commit DAG for a repo. Expects `data` shaped like the
 * backend's GET /api/commits/:repoId/graph response:
 * { nodes: [{id, message, author, createdAt}], edges: [{from, to}], branches: [{name, headHash}] }
 *
 * Layout: commits are placed left-to-right by creation order, and merge
 * commits (2 parents) get pulled down a "lane" so the two converging lines
 * are visually distinguishable from a normal linear history.
 */
export default function CommitGraph({ data }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const { nodes, edges, branches } = data;

    const width = 900;
    const nodeSpacingX = 140;
    const laneSpacingY = 60;
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };

    // build a quick lookup + figure out how many parents each commit has,
    // to detect merge commits (2 parents) vs normal commits (1 or 0)
    const parentsOf = new Map();
    edges.forEach((e) => {
      if (!parentsOf.has(e.to)) parentsOf.set(e.to, []);
      parentsOf.get(e.to).push(e.from);
    });

    // simple lane assignment: walk nodes in order, assign lane 0 by default,
    // bump merge commits and their "losing" parent chain to lane 1 so they
    // visually separate from the main line
    let currentLane = 0;
    const laneOf = new Map();
    nodes.forEach((n) => {
      const parents = parentsOf.get(n.id) || [];
      if (parents.length === 2) {
        laneOf.set(n.id, 0); // merge commits always land back on lane 0
      } else if (!laneOf.has(n.id)) {
        laneOf.set(n.id, currentLane);
      }
    });
    nodes.forEach((n) => {
      if (!laneOf.has(n.id)) laneOf.set(n.id, 0);
    });

    const positioned = nodes.map((n, i) => ({
      ...n,
      x: margin.left + i * nodeSpacingX,
      y: margin.top + laneOf.get(n.id) * laneSpacingY,
    }));

    const posById = new Map(positioned.map((n) => [n.id, n]));
    const height = margin.top + margin.bottom + laneSpacingY * 2;
    const totalWidth = margin.left + margin.right + nodes.length * nodeSpacingX;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear on re-render
    svg.attr('viewBox', `0 0 ${totalWidth} ${height}`).attr('width', '100%').attr('height', height);

    // draw edges first so nodes render on top
    svg
      .selectAll('path.edge')
      .data(edges)
      .join('path')
      .attr('class', 'edge')
      .attr('d', (e) => {
        const from = posById.get(e.from);
        const to = posById.get(e.to);
        if (!from || !to) return '';
        // simple bezier curve between parent and child
        const midX = (from.x + to.x) / 2;
        return `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', 'var(--edge-color, #999)')
      .attr('stroke-width', 2);

    // nodes
    const nodeGroup = svg
      .selectAll('g.node')
      .data(positioned)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodeGroup
      .append('circle')
      .attr('r', 8)
      .attr('fill', (d) => ((parentsOf.get(d.id) || []).length === 2 ? '#e07b39' : '#4f8ef7'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    nodeGroup
      .append('text')
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', 'var(--text-color, #333)')
      .text((d) => d.message.length > 14 ? d.message.slice(0, 14) + '…' : d.message);

    nodeGroup
      .append('title') // native tooltip on hover
      .text((d) => `${d.message}\nby ${d.author}\n${new Date(d.createdAt).toLocaleString()}`);

    // branch labels above their head commit
    branches.forEach((b) => {
      const pos = posById.get(b.headHash);
      if (!pos) return;
      svg
        .append('text')
        .attr('x', pos.x)
        .attr('y', pos.y - 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2ecc71')
        .text(`⌥ ${b.name}`);
    });
  }, [data]);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <svg ref={svgRef} />
    </div>
  );
}