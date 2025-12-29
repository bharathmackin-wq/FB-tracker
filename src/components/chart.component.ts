import { Component, ElementRef, viewChild, effect, input } from '@angular/core';
import * as d3 from 'd3';
import { ComputedMetric } from '../services/state.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div class="w-full h-full flex flex-col">
      <h3 class="text-lg font-semibold text-slate-800 mb-4 px-2">Price vs. Profit Analysis</h3>
      <div #chartContainer class="flex-grow w-full min-h-[300px] relative"></div>
      <div class="flex justify-center gap-6 mt-2 text-sm text-slate-600">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-indigo-500 rounded-sm"></div> Product Price
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-emerald-500 rounded-sm"></div> Net Profit (Total)
        </div>
         <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-rose-500 rounded-sm"></div> Net Loss
        </div>
      </div>
    </div>
  `
})
export class ChartComponent {
  data = input.required<ComputedMetric[]>();
  chartContainer = viewChild<ElementRef>('chartContainer');

  constructor() {
    effect(() => {
      const container = this.chartContainer()?.nativeElement;
      const dataset = this.data();
      
      if (container && dataset.length > 0) {
        this.drawChart(container, dataset);
      }
    });
  }

  private drawChart(container: HTMLElement, data: ComputedMetric[]) {
    d3.select(container).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.name))
      .rangeRound([0, width])
      .paddingInner(0.1);

    const x1 = d3.scaleBand()
      .domain(['Price', 'Profit'])
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    const yMax = d3.max(data, d => Math.max(d.price, Math.abs(d.profit))) || 100;
    const yMin = d3.min(data, d => Math.min(0, d.profit)) || 0; // Handle negative profit

    const y = d3.scaleLinear()
      .domain([yMin * 1.1, yMax * 1.1]) // Add some headroom
      .rangeRound([height, 0]);

    // X Axis
    svg.append('g')
      .attr('transform', `translate(0,${y(0)})`) // Draw at y=0 line
      .call(d3.axisBottom(x0).tickSize(0))
      .selectAll('text')
      .attr('transform', `translate(0, ${height - y(0) + 15})`) // Push labels to bottom
      .style('text-anchor', 'middle')
      .text((d: any) => d.length > 15 ? d.substring(0, 15) + '...' : d);

    // Y Axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(null, 's'));

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .attr('stroke-opacity', 0.1);

    // Bars
    const productGroups = svg.selectAll('.product-group')
      .data(data)
      .enter().append('g')
      .attr('class', 'product-group')
      .attr('transform', d => `translate(${x0(d.name)},0)`);

    // Price Bar
    productGroups.append('rect')
      .attr('x', x1('Price')!)
      .attr('y', d => y(d.price))
      .attr('width', x1.bandwidth())
      .attr('height', d => y(0) - y(d.price))
      .attr('fill', '#6366f1') // Indigo-500
      .attr('rx', 4);

    // Profit Bar
    productGroups.append('rect')
      .attr('x', x1('Profit')!)
      .attr('y', d => d.profit >= 0 ? y(d.profit) : y(0))
      .attr('width', x1.bandwidth())
      .attr('height', d => Math.abs(y(d.profit) - y(0)))
      .attr('fill', d => d.profit >= 0 ? '#10b981' : '#f43f5e') // Emerald-500 or Rose-500
      .attr('rx', 4);

    // Tooltips or Labels (Simple Text on bars for clarity)
    // Price Label
    productGroups.append('text')
      .text(d => `₹${Math.round(d.price)}`)
      .attr('x', x1('Price')! + x1.bandwidth() / 2)
      .attr('y', d => y(d.price) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#475569');

    // Profit Label
    productGroups.append('text')
      .text(d => `₹${Math.round(d.profit)}`)
      .attr('x', x1('Profit')! + x1.bandwidth() / 2)
      .attr('y', d => d.profit >= 0 ? y(d.profit) - 5 : y(d.profit) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', d => d.profit >= 0 ? '#059669' : '#e11d48');
  }
}